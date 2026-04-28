import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import UTC, datetime, time

import anyio
from asgi_correlation_id import CorrelationIdMiddleware
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.models import *  # noqa: F403

from .config import LOCAL_TZ, EnvironmentOption, settings
from .db import async_engine as engine
from .db import local_session

logger = logging.getLogger(__name__)

AUTO_SYNC_INTERVAL = 15 * 60  # 15 minutes
AUTO_SYNC_INITIAL_DELAY = 60  # 1 minute after startup

AUTO_END_INTERVAL = 60  # check every 1 minute
AUTO_END_GRACE_MINUTES = 5  # end session 5 min after scheduled end_time

# Leader election via Postgres session-level advisory lock. Only one worker
# (across the whole gunicorn fleet) acquires this lock and runs background
# loops. Others skip the loops. Lock auto-releases when the connection drops.
_LEADER_LOCK_ID = 0xA51C100C70000
_leader_conn: AsyncConnection | None = None


async def _acquire_leadership() -> bool:
    """Try to become the background-task leader. Holds a dedicated DB conn on success."""
    global _leader_conn
    conn = await engine.connect()
    try:
        result = await conn.execute(
            text("SELECT pg_try_advisory_lock(:id)"), {"id": _LEADER_LOCK_ID}
        )
        if result.scalar() is True:
            _leader_conn = conn
            return True
    except Exception:
        await conn.close()
        raise
    await conn.close()
    return False


async def _release_leadership() -> None:
    global _leader_conn
    if _leader_conn is None:
        return
    try:
        await _leader_conn.execute(
            text("SELECT pg_advisory_unlock(:id)"), {"id": _LEADER_LOCK_ID}
        )
    except Exception:
        logger.exception("Failed to release leader advisory lock")
    finally:
        try:
            await _leader_conn.close()
        finally:
            _leader_conn = None


async def check_database_connection() -> None:
    max_retries = 5
    base_delay = 1.0
    max_delay = 30.0
    for attempt in range(1, max_retries + 1):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            logging.info(
                "Database connection successful to %s:%s/%s",
                settings.POSTGRES_SERVER, settings.POSTGRES_PORT, settings.POSTGRES_DB,
            )
            return
        except (asyncio.CancelledError, KeyboardInterrupt):
            raise
        except Exception as e:
            if attempt == max_retries:
                logging.error("Database connection failed after %s attempts: %s", max_retries, type(e).__name__)
                raise
            delay = min(base_delay * 2 ** (attempt - 1), max_delay)
            logging.warning("DB connection attempt %s failed. Retrying in %.1fs...", attempt, delay)
            await anyio.sleep(delay)


async def _auto_sync_loop() -> None:
    """Background loop that syncs from Payment every AUTO_SYNC_INTERVAL seconds."""
    from app.api.routes.sync import _save_sync_log, run_sync

    await asyncio.sleep(AUTO_SYNC_INITIAL_DELAY)
    logger.info("Auto-sync started (interval=%ds)", AUTO_SYNC_INTERVAL)

    while True:
        try:
            async with local_session() as db:
                await run_sync(db, triggered_by="auto")
        except asyncio.CancelledError:
            logger.info("Auto-sync stopped")
            return
        except Exception as e:
            logger.exception("Auto-sync failed")
            try:
                async with local_session() as db:
                    await _save_sync_log(db, status="failed", error_message=str(e)[:500], triggered_by="auto")
            except Exception:
                logger.exception("Failed to save sync error log")

        await asyncio.sleep(AUTO_SYNC_INTERVAL)


async def _auto_end_sessions_loop() -> None:
    """Auto-end in_progress sessions that ran past their scheduled end_time + grace period."""
    from app.core.enums import SessionStatus
    from app.models.lesson_session import LessonSession
    from app.models.schedule_entry import ScheduleEntry
    from app.models.time_slot import TimeSlot

    logger.info("Auto-end sessions loop started (grace=%dm)", AUTO_END_GRACE_MINUTES)

    while True:
        await asyncio.sleep(AUTO_END_INTERVAL)
        try:
            async with local_session() as db:
                now_utc = datetime.now(UTC)
                now_local = now_utc.astimezone(LOCAL_TZ)
                today = now_local.date()

                result = await db.execute(
                    select(LessonSession)
                    .join(ScheduleEntry, LessonSession.schedule_entry_id == ScheduleEntry.id)
                    .join(TimeSlot, ScheduleEntry.time_slot_id == TimeSlot.id)
                    .where(
                        LessonSession.status == SessionStatus.IN_PROGRESS,
                        LessonSession.is_deleted == False,  # noqa: E712
                        LessonSession.session_date == today,
                    )
                    .with_for_update(skip_locked=True)
                )
                sessions = result.scalars().all()

                ended = 0
                for session in sessions:
                    entry = await db.get(ScheduleEntry, session.schedule_entry_id)
                    if not entry:
                        continue
                    slot = await db.get(TimeSlot, entry.time_slot_id)
                    if not slot:
                        continue

                    # slot.end_time is a time object (TIME column)
                    end_t = slot.end_time if isinstance(slot.end_time, time) else time.fromisoformat(str(slot.end_time))
                    deadline_dt = datetime.combine(today, end_t, tzinfo=LOCAL_TZ)
                    grace_seconds = AUTO_END_GRACE_MINUTES * 60

                    if (now_local - deadline_dt).total_seconds() >= grace_seconds:
                        session.status = SessionStatus.COMPLETED
                        session.ended_at = now_utc
                        ended += 1

                if ended:
                    await db.commit()
                    logger.info("Auto-ended %d session(s)", ended)

        except asyncio.CancelledError:
            logger.info("Auto-end sessions loop stopped")
            return
        except Exception:
            logger.exception("Auto-end sessions loop error")


REFRESH_PURGE_INTERVAL = 6 * 60 * 60  # every 6h


async def _refresh_token_purge_loop() -> None:
    """Drop expired refresh-token rows so the table doesn't grow forever."""
    from app.crud import refresh_tokens

    while True:
        await asyncio.sleep(REFRESH_PURGE_INTERVAL)
        try:
            async with local_session() as db:
                purged = await refresh_tokens.purge_expired(db)
                if purged:
                    logger.info("Purged %d expired refresh tokens", purged)
        except asyncio.CancelledError:
            logger.info("Refresh-token purge loop stopped")
            return
        except Exception:
            logger.exception("Refresh-token purge loop error")


async def _cancel(task: asyncio.Task | None) -> None:
    if task is None:
        return
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    await check_database_connection()

    sync_task = None
    auto_end_task = None
    purge_task = None

    is_leader = await _acquire_leadership()
    if is_leader:
        logger.info("Background-task leader acquired; starting loops.")
        if settings.PAYMENT_SYNC_API_KEY:
            sync_task = asyncio.create_task(_auto_sync_loop())
        auto_end_task = asyncio.create_task(_auto_end_sessions_loop())
        purge_task = asyncio.create_task(_refresh_token_purge_loop())
    else:
        logger.info("Another worker holds the background-task leader lock; loops skipped.")

    yield

    await _cancel(auto_end_task)
    await _cancel(purge_task)
    await _cancel(sync_task)
    await _release_leadership()


def create_application(router: APIRouter) -> FastAPI:
    kwargs = {
        "title": settings.APP_NAME,
        "description": settings.APP_DESCRIPTION,
        "version": settings.APP_VERSION,
        "contact": {"name": settings.CONTACT_NAME, "email": settings.CONTACT_EMAIL},
    }

    if settings.ENVIRONMENT == EnvironmentOption.PRODUCTION:
        kwargs.update({"docs_url": None, "redoc_url": None, "openapi_url": None})

    application = FastAPI(lifespan=lifespan, **kwargs)
    application.include_router(router)

    # CorrelationIdMiddleware first so the X-Request-ID is bound before CORS
    # logs (and any later middleware) emit anything.
    application.add_middleware(CorrelationIdMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=settings.CORS_METHODS,
        allow_headers=settings.CORS_HEADERS,
    )

    return application

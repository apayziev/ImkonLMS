import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import anyio
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.models import *  # noqa: F403

from .config import EnvironmentOption, settings
from .db import async_engine as engine, local_session

logger = logging.getLogger(__name__)

AUTO_SYNC_INTERVAL = 15 * 60  # 15 minutes
AUTO_SYNC_INITIAL_DELAY = 60  # 1 minute after startup


async def check_database_connection() -> None:
    max_retries = 5
    retry_delay = 2
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
            logging.warning("DB connection attempt %s failed. Retrying in %ss...", attempt, retry_delay)
            await anyio.sleep(retry_delay)


async def _auto_sync_loop() -> None:
    """Background loop that syncs from Payment every AUTO_SYNC_INTERVAL seconds."""
    from app.api.routes.sync import run_sync, _save_sync_log

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
            logger.error("Auto-sync failed: %s", e)
            try:
                async with local_session() as db:
                    await _save_sync_log(db, status="failed", error_message=str(e)[:500], triggered_by="auto")
            except Exception:
                logger.error("Failed to save sync error log", exc_info=True)

        await asyncio.sleep(AUTO_SYNC_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    await check_database_connection()

    sync_task = None
    if settings.PAYMENT_SYNC_API_KEY:
        sync_task = asyncio.create_task(_auto_sync_loop())

    yield

    if sync_task:
        sync_task.cancel()
        try:
            await sync_task
        except asyncio.CancelledError:
            pass


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

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=settings.CORS_METHODS,
        allow_headers=settings.CORS_HEADERS,
    )

    return application

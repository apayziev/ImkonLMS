"""Teacher statistics for monitoring — aggregated from sessions + schedule."""

from datetime import date, datetime, time

from fastapi import APIRouter
from pydantic import BaseModel as PydanticBase
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep
from app.core.enums import SessionStatus
from app.core.exceptions import ForbiddenException
from app.models.lesson_session import LessonSession
from app.models.schedule_entry import ScheduleEntry
from app.models.time_slot import TimeSlot
from app.models.user import User, UserRole

router = APIRouter()

# ─── Schemas ────────────────────────────────────────────────────────────────

class TeacherStatRead(PydanticBase):
    teacher_id: int
    teacher_name: str
    photo_url: str | None
    total_expected: int
    total_conducted: int
    total_completed: int
    total_planned: int       # topic filled
    on_time_starts: int
    avg_duration_minutes: float | None


class TeacherStatsResponse(PydanticBase):
    teachers: list[TeacherStatRead]


# ─── Helpers ────────────────────────────────────────────────────────────────

def _count_expected_lessons(
    schedule_entries: list[ScheduleEntry],
    start_date: date,
    end_date: date,
    holidays: list | None,
) -> int:
    """Count how many lessons teacher should have had in date range."""
    holiday_set: set[date] = set()
    for h in (holidays or []):
        if isinstance(h, date):
            holiday_set.add(h)
        elif isinstance(h, str) and h:
            try:
                holiday_set.add(date.fromisoformat(h))
            except ValueError:
                pass
    total = 0
    for entry in schedule_entries:
        js_dow = entry.day_of_week
        # Convert ISO dow (1=Mon) to Python weekday (0=Mon)
        py_dow = js_dow - 1 if js_dow < 7 else 6
        cur = start_date
        while cur <= end_date:
            if cur.weekday() == py_dow and cur not in holiday_set:
                total += 1
            cur = cur.replace(day=cur.day) if False else _next_day(cur)
    return total


def _next_day(d: date) -> date:
    return date.fromordinal(d.toordinal() + 1)


ON_TIME_TOLERANCE_MINUTES = 5  # ±5 daqiqa


# ─── Endpoint ───────────────────────────────────────────────────────────────

@router.get("/teacher-stats", response_model=TeacherStatsResponse)
async def get_teacher_stats(
    db: SessionDep,
    current_user: CurrentUser,
    start_date: str,
    end_date: str,
) -> TeacherStatsResponse:
    """O'qituvchilar monitoring statistikasi."""
    if current_user.role != UserRole.ADMIN.value and not current_user.is_superuser:
        raise ForbiddenException("Faqat admin uchun")

    sd = date.fromisoformat(start_date)
    ed = date.fromisoformat(end_date)

    # Get all teachers who have schedule entries
    entries_q = await db.execute(
        select(ScheduleEntry)
        .options(selectinload(ScheduleEntry.teacher), selectinload(ScheduleEntry.time_slot))
        .where(ScheduleEntry.is_deleted == False)  # noqa: E712
    )
    all_entries = entries_q.scalars().all()

    # Group entries by teacher
    teacher_entries: dict[int, list[ScheduleEntry]] = {}
    teacher_info: dict[int, User] = {}
    for entry in all_entries:
        tid = entry.teacher_id
        if tid not in teacher_entries:
            teacher_entries[tid] = []
            teacher_info[tid] = entry.teacher
        teacher_entries[tid].append(entry)

    if not teacher_entries:
        return TeacherStatsResponse(teachers=[])

    # Get all sessions in date range
    sessions_q = await db.execute(
        select(LessonSession)
        .options(selectinload(LessonSession.schedule_entry).selectinload(ScheduleEntry.time_slot))
        .where(
            LessonSession.session_date >= sd,
            LessonSession.session_date <= ed,
            LessonSession.is_deleted == False,  # noqa: E712
        )
    )
    all_sessions = sessions_q.scalars().all()

    # Group sessions by teacher (via schedule_entry)
    teacher_sessions: dict[int, list[LessonSession]] = {tid: [] for tid in teacher_entries}
    for session in all_sessions:
        if session.schedule_entry_id:
            for tid, entries in teacher_entries.items():
                if any(e.id == session.schedule_entry_id for e in entries):
                    teacher_sessions[tid].append(session)
                    break

    # Build stats
    # Get holidays from current quarter (if any)
    from app.models.quarter import Quarter
    quarter_q = await db.execute(
        select(Quarter).where(
            Quarter.start_date <= ed,
            Quarter.end_date >= sd,
            Quarter.is_deleted == False,  # noqa: E712
        )
    )
    quarter = quarter_q.scalar_one_or_none()
    holidays = quarter.holidays if quarter else []

    result: list[TeacherStatRead] = []
    for tid in sorted(teacher_entries.keys()):
        teacher = teacher_info[tid]
        entries = teacher_entries[tid]
        sessions = teacher_sessions.get(tid, [])

        total_expected = _count_expected_lessons(entries, sd, ed, holidays)

        conducted = [s for s in sessions if s.status in (SessionStatus.IN_PROGRESS, SessionStatus.COMPLETED)]
        completed = [s for s in sessions if s.status == SessionStatus.COMPLETED]
        planned = [s for s in sessions if s.topic and s.topic.strip()]

        # On-time analysis
        on_time = 0
        durations: list[float] = []
        for s in conducted:
            if s.started_at and s.schedule_entry and s.schedule_entry.time_slot:
                slot_start = s.schedule_entry.time_slot.start_time
                if isinstance(slot_start, str):
                    h, m = slot_start.split(":")[:2]
                    slot_start = time(int(h), int(m))
                session_start_time = s.started_at.time()
                # Convert to minutes for comparison
                slot_minutes = slot_start.hour * 60 + slot_start.minute
                session_minutes = session_start_time.hour * 60 + session_start_time.minute
                diff = abs(session_minutes - slot_minutes)
                if diff <= ON_TIME_TOLERANCE_MINUTES:
                    on_time += 1

            if s.started_at and s.ended_at:
                dur = (s.ended_at - s.started_at).total_seconds() / 60
                if dur > 0:
                    durations.append(dur)

        avg_dur = round(sum(durations) / len(durations), 1) if durations else None

        result.append(TeacherStatRead(
            teacher_id=tid,
            teacher_name=teacher.full_name or f"{teacher.last_name} {teacher.first_name}",
            photo_url=teacher.photo_url,
            total_expected=total_expected,
            total_conducted=len(conducted),
            total_completed=len(completed),
            total_planned=len(planned),
            on_time_starts=on_time,
            avg_duration_minutes=avg_dur,
        ))

    # Sort by name
    result.sort(key=lambda t: t.teacher_name)

    return TeacherStatsResponse(teachers=result)

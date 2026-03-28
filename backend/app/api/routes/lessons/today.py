"""Today's lessons endpoint."""

from datetime import date

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import today_local
from app.core.utils import format_time
from app.crud.lessons import crud_lesson_sessions
from app.models.lesson_session import LessonSession
from app.models.schedule_entry import ScheduleEntry
from app.schemas.lessons import TodayLessonRead, TodayLessonsResponse

from ._helpers import ENTRY_LOAD, _require_teacher

router = APIRouter()


@router.get("/today", response_model=TodayLessonsResponse)
async def get_today_lessons(
    db: SessionDep,
    current_user: CurrentUser,
    target_date: date | None = Query(None, alias="date"),
) -> TodayLessonsResponse:
    """Get current teacher's lessons for a given date (defaults to today)."""
    _require_teacher(current_user)

    today = target_date or today_local()
    # Python: Monday=0 … Sunday=6. DB: Monday=1 … Sunday=7
    day_of_week = today.weekday() + 1

    # Fetch today's schedule entries for this teacher
    query = (
        select(ScheduleEntry)
        .options(*ENTRY_LOAD)
        .where(
            ScheduleEntry.teacher_id == current_user.id,
            ScheduleEntry.day_of_week == day_of_week,
            ScheduleEntry.is_deleted == False,  # noqa: E712
        )
    )
    result = await db.execute(query)
    entries = result.scalars().all()

    # Fetch today's sessions for this teacher's entries
    entry_ids = [e.id for e in entries]
    sessions_map: dict[int, LessonSession] = {}
    if entry_ids:
        sess_query = select(LessonSession).where(
            LessonSession.schedule_entry_id.in_(entry_ids),
            LessonSession.session_date == today,
            LessonSession.is_deleted == False,  # noqa: E712
        )
        sess_result = await db.execute(sess_query)
        for s in sess_result.scalars().all():
            sessions_map[s.schedule_entry_id] = s

    # Build response sorted by period_number
    lessons = []
    for entry in sorted(entries, key=lambda e: e.time_slot.period_number if e.time_slot else 0):
        session = sessions_map.get(entry.id)
        lessons.append(
            TodayLessonRead(
                schedule_entry_id=entry.id,
                grade_id=entry.grade_id,
                grade_display=entry.grade.display_name if entry.grade else "",
                subject_id=entry.subject_id,
                subject_name=entry.subject.name if entry.subject else "",
                period_number=entry.time_slot.period_number if entry.time_slot else 0,
                start_time=format_time(entry.time_slot.start_time) if entry.time_slot else "",
                end_time=format_time(entry.time_slot.end_time) if entry.time_slot else "",
                session_id=session.id if session else None,
                session_status=session.status if session else None,
                has_plan_content=bool(
                    session and (
                        session.topic or session.lesson_type
                        or session.objectives or session.keywords
                    )
                ),
            )
        )

    return TodayLessonsResponse(data=lessons, date=today.isoformat())

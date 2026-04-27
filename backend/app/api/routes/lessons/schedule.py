"""Today's lessons endpoint."""

from datetime import date

from fastapi import APIRouter, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep
from app.core.config import today_local
from app.core.formatting import format_time
from app.models.lesson_plan import LessonPlan
from app.models.lesson_session import LessonSession
from app.models.quarter import Quarter
from app.models.schedule_entry import ScheduleEntry
from app.schemas.lessons import SessionStatusesResponse, SessionStatusItem, TodayLessonRead, TodayLessonsResponse

from ._helpers import ENTRY_LOAD, _calc_lesson_numbers, _plan_filled_count, _require_teacher

router = APIRouter()


@router.get("/sessions/statuses", response_model=SessionStatusesResponse)
async def get_session_statuses(
    db: SessionDep,
    current_user: CurrentUser,
    entry_ids: list[int] = Query(..., alias="entry_id"),
    start_date: date = Query(...),
    end_date: date = Query(...),
) -> SessionStatusesResponse:
    """Get session statuses for given schedule entries within a date range."""
    _require_teacher(current_user)

    result = await db.execute(
        select(LessonSession).where(
            LessonSession.schedule_entry_id.in_(entry_ids),
            LessonSession.session_date >= start_date,
            LessonSession.session_date <= end_date,
            LessonSession.is_deleted == False,  # noqa: E712
        )
    )
    sessions = result.scalars().all()
    return SessionStatusesResponse(
        data=[
            SessionStatusItem(
                schedule_entry_id=s.schedule_entry_id,
                session_date=s.session_date.isoformat(),
                status=s.status,
            )
            for s in sessions
        ]
    )


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
    plans_map: dict[int, LessonPlan] = {}
    if entry_ids:
        sess_query = select(LessonSession).where(
            LessonSession.schedule_entry_id.in_(entry_ids),
            LessonSession.session_date == today,
            LessonSession.is_deleted == False,  # noqa: E712
        )
        sess_result = await db.execute(sess_query)
        for s in sess_result.scalars().all():
            sessions_map[s.schedule_entry_id] = s

        plan_query = select(LessonPlan).options(
            selectinload(LessonPlan.materials),
        ).where(
            LessonPlan.schedule_entry_id.in_(entry_ids),
            LessonPlan.plan_date == today,
            LessonPlan.is_deleted == False,  # noqa: E712
        )
        plan_result = await db.execute(plan_query)
        for p in plan_result.scalars().all():
            plans_map[p.schedule_entry_id] = p

    # Build response sorted by period_number
    lessons = []
    for entry in sorted(entries, key=lambda e: e.time_slot.period_number if e.time_slot else 0):
        session = sessions_map.get(entry.id)
        plan = plans_map.get(entry.id)
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
                room=entry.room,
                session_id=session.id if session else None,
                session_status=session.status if session else None,
                plan_id=plan.id if plan else None,
                plan_filled_count=_plan_filled_count(plan) if plan else 0,
            )
        )

    # Calculate lesson numbers within the current quarter
    if entries:
        quarter_result = await db.execute(
            select(Quarter).where(
                Quarter.start_date <= today,
                Quarter.end_date >= today,
                Quarter.is_deleted == False,  # noqa: E712
            )
        )
        quarter = quarter_result.scalar_one_or_none()
        if quarter:
            # Get ALL schedule entries for this teacher in current academic year
            all_entries_result = await db.execute(
                select(ScheduleEntry)
                .options(*ENTRY_LOAD)
                .where(
                    ScheduleEntry.teacher_id == current_user.id,
                    ScheduleEntry.academic_year_id == quarter.academic_year_id,
                    ScheduleEntry.is_deleted == False,  # noqa: E712
                )
            )
            all_entries = all_entries_result.scalars().all()
            holidays_set = set(quarter.holidays or [])
            ln_map = _calc_lesson_numbers(
                entries, all_entries, today, quarter.start_date, quarter.end_date, holidays_set,
            )
            for lesson in lessons:
                nums = ln_map.get(lesson.schedule_entry_id)
                if nums:
                    lesson.lesson_number, lesson.total_lessons = nums

    return TodayLessonsResponse(data=lessons, date=today.isoformat())

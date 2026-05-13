"""Teacher statistics for monitoring — aggregated from sessions + schedule."""

from datetime import date, time

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, SessionDep
from app.core.enums import SessionStatus
from app.core.exceptions import NotFoundException
from app.models.lesson_plan import LessonPlan
from app.models.lesson_session import LessonSession
from app.models.quarter import Quarter
from app.models.schedule_entry import ScheduleEntry
from app.models.user import User
from app.schemas.monitoring import (
    TeacherDetailResponse,
    TeacherSessionDetail,
    TeacherStatRead,
    TeacherStatsResponse,
)

from ._helpers import PLAN_TOTAL_FIELDS, _plan_filled_count, count_weekday_between

router = APIRouter()


# ─── Helpers ────────────────────────────────────────────────────────────────

def _count_expected_lessons(
    schedule_entries: list[ScheduleEntry],
    start_date: date,
    end_date: date,
    holidays: list | None,
) -> int:
    """Count how many lessons teacher should have had in date range."""
    holiday_set = _parse_holidays(holidays)
    return sum(
        count_weekday_between(start_date, end_date, e.day_of_week, holiday_set)
        for e in schedule_entries
    )


def _next_day(d: date) -> date:
    return date.fromordinal(d.toordinal() + 1)


ON_TIME_TOLERANCE_MINUTES = 5  # ±5 daqiqa


# ─── Endpoint ───────────────────────────────────────────────────────────────

@router.get("/teacher-stats", response_model=TeacherStatsResponse)
async def get_teacher_stats(
    db: SessionDep,
    _: AdminUser,
    start_date: str,
    end_date: str,
) -> TeacherStatsResponse:
    """O'qituvchilar monitoring statistikasi."""
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
        .options(
            selectinload(LessonSession.schedule_entry).selectinload(ScheduleEntry.time_slot),
        )
        .where(
            LessonSession.session_date >= sd,
            LessonSession.session_date <= ed,
            LessonSession.is_deleted == False,  # noqa: E712
        )
    )
    all_sessions = sessions_q.scalars().all()

    # Get all plans in date range
    all_entry_ids = {e.id for entries in teacher_entries.values() for e in entries}
    plans_q = await db.execute(
        select(LessonPlan)
        .options(selectinload(LessonPlan.materials))
        .where(
            LessonPlan.schedule_entry_id.in_(all_entry_ids) if all_entry_ids else LessonPlan.id < 0,
            LessonPlan.plan_date >= sd,
            LessonPlan.plan_date <= ed,
            LessonPlan.is_deleted == False,  # noqa: E712
        )
    )
    all_plans = plans_q.scalars().all()

    # Group sessions/plans by teacher via a flat entry_id -> teacher_id map
    # (O(E + S + P) instead of O(T * E * (S + P))).
    entry_to_teacher: dict[int, int] = {e.id: e.teacher_id for e in all_entries}

    teacher_sessions: dict[int, list[LessonSession]] = {tid: [] for tid in teacher_entries}
    for session in all_sessions:
        tid = entry_to_teacher.get(session.schedule_entry_id) if session.schedule_entry_id else None
        if tid is not None and tid in teacher_sessions:
            teacher_sessions[tid].append(session)

    teacher_plans: dict[int, list[LessonPlan]] = {tid: [] for tid in teacher_entries}
    for plan in all_plans:
        tid = entry_to_teacher.get(plan.schedule_entry_id) if plan.schedule_entry_id else None
        if tid is not None and tid in teacher_plans:
            teacher_plans[tid].append(plan)

    # Build stats
    # Get holidays from current quarter (if any)
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

        # Plans: count from LessonPlan table, score = filled/total %
        plans = teacher_plans.get(tid, [])
        filled_scores = [
            round(_plan_filled_count(p) / PLAN_TOTAL_FIELDS * 100)
            for p in plans if p.topic and p.topic.strip()
        ]
        avg_plan = round(sum(filled_scores) / len(filled_scores), 1) if filled_scores else None

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
            total_planned=len([p for p in plans if p.topic and p.topic.strip()]),
            on_time_starts=on_time,
            avg_duration_minutes=avg_dur,
            avg_plan_score=avg_plan,
        ))

    # Sort by name
    result.sort(key=lambda t: t.teacher_name)

    return TeacherStatsResponse(teachers=result)


# ─── Detail endpoint ────────────────────────────────────────────────────────

def _parse_holidays(holidays: list | None) -> set[date]:
    """Parse holiday list into a set of dates."""
    result: set[date] = set()
    for h in (holidays or []):
        if isinstance(h, date):
            result.add(h)
        elif isinstance(h, str) and h:
            try:
                result.add(date.fromisoformat(h))
            except ValueError:
                pass
    return result


@router.get("/teacher-stats/{teacher_id}", response_model=TeacherDetailResponse)
async def get_teacher_detail(
    teacher_id: int,
    db: SessionDep,
    _: AdminUser,
    start_date: str,
    end_date: str,
) -> TeacherDetailResponse:
    """O'qituvchining tanlangan davrdagi barcha darslari batafsil."""
    sd = date.fromisoformat(start_date)
    ed = date.fromisoformat(end_date)

    # Get teacher
    teacher = await db.get(User, teacher_id)
    if not teacher:
        raise NotFoundException("O'qituvchi topilmadi")

    # Get schedule entries for this teacher
    entries_q = await db.execute(
        select(ScheduleEntry)
        .options(
            selectinload(ScheduleEntry.time_slot),
            selectinload(ScheduleEntry.subject),
            selectinload(ScheduleEntry.grade),
        )
        .where(
            ScheduleEntry.teacher_id == teacher_id,
            ScheduleEntry.is_deleted == False,  # noqa: E712
        )
    )
    entries = entries_q.scalars().all()
    entry_ids = {e.id for e in entries}

    # Get holidays
    quarter_q = await db.execute(
        select(Quarter).where(
            Quarter.start_date <= ed,
            Quarter.end_date >= sd,
            Quarter.is_deleted == False,  # noqa: E712
        )
    )
    quarter = quarter_q.scalar_one_or_none()
    holiday_set = _parse_holidays(quarter.holidays if quarter else [])

    # Get existing sessions
    sessions_q = await db.execute(
        select(LessonSession)
        .where(
            LessonSession.session_date >= sd,
            LessonSession.session_date <= ed,
            LessonSession.schedule_entry_id.in_(entry_ids) if entry_ids else LessonSession.id < 0,
            LessonSession.is_deleted == False,  # noqa: E712
        )
    )
    sessions = sessions_q.scalars().all()

    # Get existing plans
    plans_q = await db.execute(
        select(LessonPlan)
        .options(selectinload(LessonPlan.materials))
        .where(
            LessonPlan.schedule_entry_id.in_(entry_ids) if entry_ids else LessonPlan.id < 0,
            LessonPlan.plan_date >= sd,
            LessonPlan.plan_date <= ed,
            LessonPlan.is_deleted == False,  # noqa: E712
        )
    )
    plans = plans_q.scalars().all()

    # Index sessions by (entry_id, date)
    session_map: dict[tuple[int, date], LessonSession] = {}
    for s in sessions:
        if s.schedule_entry_id:
            session_map[(s.schedule_entry_id, s.session_date)] = s

    # Index plans by (entry_id, date)
    plan_map: dict[tuple[int, date], LessonPlan] = {}
    for p in plans:
        if p.schedule_entry_id:
            plan_map[(p.schedule_entry_id, p.plan_date)] = p

    # Generate ALL expected lessons from schedule
    result_sessions: list[TeacherSessionDetail] = []
    for entry in entries:
        ts = entry.time_slot
        js_dow = entry.day_of_week
        py_dow = (js_dow - 1) % 7
        cur = sd
        while cur <= ed:
            if cur.weekday() == py_dow and cur not in holiday_set:
                s = session_map.get((entry.id, cur))
                p = plan_map.get((entry.id, cur))

                status = s.status if s else ("planned" if p else "not_created")
                result_sessions.append(TeacherSessionDetail(
                    session_id=s.id if s else 0,
                    session_date=cur,
                    status=status,
                    subject_name=entry.subject.name if entry.subject else "—",
                    grade_display=f"{entry.grade.level}{entry.grade.section}" if entry.grade else "—",
                    period_number=ts.period_number if ts else 0,
                    start_time=str(ts.start_time)[:5] if ts else "",
                    end_time=str(ts.end_time)[:5] if ts else "",
                    started_at=s.started_at if s else None,
                    ended_at=s.ended_at if s else None,
                    plan_id=p.id if p else None,
                    topic=p.topic if p else None,
                    lesson_type=p.lesson_type if p else None,
                    objectives=p.objectives if p else None,
                    keywords=p.keywords if p else None,
                    homework=p.homework if p else None,
                    resources=p.resources if p else None,
                    assessment_methods=p.assessment_methods if p else None,
                    plan_filled_count=_plan_filled_count(p) if p else 0,
                ))
            cur = _next_day(cur)

    # Sort by date asc, then period
    result_sessions.sort(key=lambda r: (r.session_date.toordinal(), r.period_number))

    # Number lessons per (grade, subject) so a teacher's stats match what's
    # shown elsewhere (e.g. /lessons page uses _calc_lesson_numbers grouped
    # by grade+subject too).
    gs_counters: dict[tuple[str, str], int] = {}
    for s in result_sessions:
        key = (s.grade_display, s.subject_name)
        gs_counters[key] = gs_counters.get(key, 0) + 1
        s.lesson_number = gs_counters[key]

    return TeacherDetailResponse(
        teacher_id=teacher_id,
        teacher_name=teacher.full_name or f"{teacher.last_name} {teacher.first_name}",
        photo_url=teacher.photo_url,
        sessions=result_sessions,
    )

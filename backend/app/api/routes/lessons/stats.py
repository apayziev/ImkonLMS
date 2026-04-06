"""Teacher statistics for monitoring — aggregated from sessions + schedule."""

from datetime import date, datetime, time

from fastapi import APIRouter
from pydantic import BaseModel as PydanticBase
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep
from app.core.enums import SessionStatus
from app.core.exceptions import ForbiddenException, NotFoundException
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
    avg_plan_score: float | None  # 0-100 weighted


class TeacherStatsResponse(PydanticBase):
    teachers: list[TeacherStatRead]


class TeacherSessionMaterial(PydanticBase):
    id: int
    file_url: str
    original_name: str


class TeacherSessionDetail(PydanticBase):
    session_id: int
    session_date: date
    status: str
    subject_name: str
    grade_display: str
    period_number: int
    start_time: str
    end_time: str
    started_at: datetime | None
    ended_at: datetime | None
    topic: str | None
    lesson_type: str | None
    objectives: list | None
    keywords: list | None
    homework: str | None
    materials: list[TeacherSessionMaterial]
    plan_filled_count: int  # 0-6
    lesson_number: int = 0  # chorakdagi dars raqami


class TeacherDetailResponse(PydanticBase):
    teacher_id: int
    teacher_name: str
    photo_url: str | None
    sessions: list[TeacherSessionDetail]


# ─── Helpers ────────────────────────────────────────────────────────────────

def _count_expected_lessons(
    schedule_entries: list[ScheduleEntry],
    start_date: date,
    end_date: date,
    holidays: list | None,
) -> int:
    """Count how many lessons teacher should have had in date range."""
    holiday_set = _parse_holidays(holidays)
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
        .options(
            selectinload(LessonSession.schedule_entry).selectinload(ScheduleEntry.time_slot),
            selectinload(LessonSession.materials),
        )
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

        # Plan quality
        plan_scores = [_plan_score(s) for s in sessions if s.topic and s.topic.strip()]
        avg_plan = round(sum(plan_scores) / len(plan_scores), 1) if plan_scores else None

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
            avg_plan_score=avg_plan,
        ))

    # Sort by name
    result.sort(key=lambda t: t.teacher_name)

    return TeacherStatsResponse(teachers=result)


# ─── Detail endpoint ────────────────────────────────────────────────────────

# Weighted plan scoring (industry best practice)
_PLAN_WEIGHTS = {
    "topic": 30,       # eng asosiy — nimani o'rganyapti
    "objectives": 25,  # dars sifatini belgilaydi
    "homework": 15,    # mustahkamlash uchun zarur
    "materials": 15,   # vizual/resurs tayyorlagan
    "lesson_type": 10, # kategoriya — tanlash oson
    "keywords": 5,     # yordamchi
}  # jami = 100


def _plan_score(session: LessonSession) -> int:
    """Weighted plan quality score 0-100."""
    score = 0
    if session.topic and session.topic.strip():
        score += _PLAN_WEIGHTS["topic"]
    if session.objectives:
        score += _PLAN_WEIGHTS["objectives"]
    if session.homework and session.homework.strip():
        score += _PLAN_WEIGHTS["homework"]
    if session.materials:
        score += _PLAN_WEIGHTS["materials"]
    if session.lesson_type:
        score += _PLAN_WEIGHTS["lesson_type"]
    if session.keywords:
        score += _PLAN_WEIGHTS["keywords"]
    return score


def _plan_filled_count(session: LessonSession) -> int:
    count = 0
    if session.topic and session.topic.strip():
        count += 1
    if session.lesson_type:
        count += 1
    if session.objectives:
        count += 1
    if session.keywords:
        count += 1
    if session.homework and session.homework.strip():
        count += 1
    if session.materials:
        count += 1
    return count


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
    current_user: CurrentUser,
    start_date: str,
    end_date: str,
) -> TeacherDetailResponse:
    """O'qituvchining tanlangan davrdagi barcha darslari batafsil."""
    if current_user.role != UserRole.ADMIN.value and not current_user.is_superuser:
        raise ForbiddenException("Faqat admin uchun")

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
    from app.models.quarter import Quarter
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
        .options(selectinload(LessonSession.materials))
        .where(
            LessonSession.session_date >= sd,
            LessonSession.session_date <= ed,
            LessonSession.schedule_entry_id.in_(entry_ids) if entry_ids else LessonSession.id < 0,
            LessonSession.is_deleted == False,  # noqa: E712
        )
    )
    sessions = sessions_q.scalars().all()

    # Index sessions by (entry_id, date)
    session_map: dict[tuple[int, date], LessonSession] = {}
    for s in sessions:
        if s.schedule_entry_id:
            session_map[(s.schedule_entry_id, s.session_date)] = s

    # Generate ALL expected lessons from schedule
    result_sessions: list[TeacherSessionDetail] = []
    for entry in entries:
        ts = entry.time_slot
        js_dow = entry.day_of_week
        py_dow = js_dow - 1 if js_dow < 7 else 6
        cur = sd
        while cur <= ed:
            if cur.weekday() == py_dow and cur not in holiday_set:
                s = session_map.get((entry.id, cur))
                if s:
                    result_sessions.append(TeacherSessionDetail(
                        session_id=s.id,
                        session_date=cur,
                        status=s.status,
                        subject_name=entry.subject.name if entry.subject else "—",
                        grade_display=f"{entry.grade.level}{entry.grade.section}" if entry.grade else "—",
                        period_number=ts.period_number if ts else 0,
                        start_time=str(ts.start_time)[:5] if ts else "",
                        end_time=str(ts.end_time)[:5] if ts else "",
                        started_at=s.started_at,
                        ended_at=s.ended_at,
                        topic=s.topic,
                        lesson_type=s.lesson_type,
                        objectives=s.objectives,
                        keywords=s.keywords,
                        homework=s.homework,
                        materials=[
                            TeacherSessionMaterial(id=m.id, file_url=m.file_url, original_name=m.original_name)
                            for m in s.materials
                        ],
                        plan_filled_count=_plan_filled_count(s),
                    ))
                else:
                    # No session — expected but not created
                    result_sessions.append(TeacherSessionDetail(
                        session_id=0,
                        session_date=cur,
                        status="not_created",
                        subject_name=entry.subject.name if entry.subject else "—",
                        grade_display=f"{entry.grade.level}{entry.grade.section}" if entry.grade else "—",
                        period_number=ts.period_number if ts else 0,
                        start_time=str(ts.start_time)[:5] if ts else "",
                        end_time=str(ts.end_time)[:5] if ts else "",
                        started_at=None,
                        ended_at=None,
                        topic=None,
                        lesson_type=None,
                        objectives=None,
                        keywords=None,
                        homework=None,
                        materials=[],
                        plan_filled_count=0,
                    ))
            cur = _next_day(cur)

    # Sort by date asc, then period
    result_sessions.sort(key=lambda r: (r.session_date.toordinal(), r.period_number))

    # Number lessons sequentially within the quarter
    for i, s in enumerate(result_sessions, 1):
        s.lesson_number = i

    return TeacherDetailResponse(
        teacher_id=teacher_id,
        teacher_name=teacher.full_name or f"{teacher.last_name} {teacher.first_name}",
        photo_url=teacher.photo_url,
        sessions=result_sessions,
    )

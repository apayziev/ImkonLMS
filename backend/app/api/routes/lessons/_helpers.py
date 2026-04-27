"""Shared helpers for lesson routes."""

from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep
from app.core.enums import SessionStatus
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.core.formatting import format_time
from app.core.uploads import MATERIALS_UPLOAD_DIR  # noqa: F401  (re-exported for routes)
from app.models.lesson_plan import LessonPlan
from app.models.lesson_session import LessonSession
from app.models.schedule_entry import ScheduleEntry
from app.models.session_attendance import SessionAttendance
from app.models.user import User, UserRole
from app.schemas.lessons import (
    LessonMaterialRead,
    LessonPlanRead,
    SessionDetailRead,
    SessionStudentRead,
)

ENTRY_LOAD = [
    selectinload(ScheduleEntry.subject),
    selectinload(ScheduleEntry.teacher),
    selectinload(ScheduleEntry.grade),
    selectinload(ScheduleEntry.time_slot),
]


def _require_teacher(user: User) -> None:
    if user.role != UserRole.TEACHER.value:
        raise ForbiddenException("Faqat o'qituvchilar uchun")


async def _get_teacher_session(db: SessionDep, session_id: int, teacher_id: int) -> LessonSession:
    """Load a session and verify the teacher owns it."""
    query = (
        select(LessonSession)
        .join(ScheduleEntry, LessonSession.schedule_entry_id == ScheduleEntry.id)
        .where(
            LessonSession.id == session_id,
            LessonSession.is_deleted == False,  # noqa: E712
            ScheduleEntry.teacher_id == teacher_id,
        )
    )
    session = (await db.execute(query)).scalar_one_or_none()
    if not session:
        raise NotFoundException("Sessiya topilmadi")
    return session


async def _get_teacher_plan(db: SessionDep, plan_id: int, teacher_id: int) -> LessonPlan:
    """Load a plan and verify the teacher owns it."""
    query = (
        select(LessonPlan)
        .join(ScheduleEntry, LessonPlan.schedule_entry_id == ScheduleEntry.id)
        .options(selectinload(LessonPlan.materials))
        .where(
            LessonPlan.id == plan_id,
            LessonPlan.is_deleted == False,  # noqa: E712
            ScheduleEntry.teacher_id == teacher_id,
        )
    )
    plan = (await db.execute(query)).scalar_one_or_none()
    if not plan:
        raise NotFoundException("Dars rejasi topilmadi")
    return plan


def _require_not_completed(session: LessonSession) -> None:
    """Completed sessions are immutable."""
    if session.status == SessionStatus.COMPLETED:
        raise BadRequestException("Tugallangan sessiyani o'zgartirish mumkin emas")


async def _load_session_with_relations(db: SessionDep, session_id: int) -> LessonSession | None:
    query = (
        select(LessonSession)
        .options(
            selectinload(LessonSession.schedule_entry).selectinload(ScheduleEntry.subject),
            selectinload(LessonSession.schedule_entry).selectinload(ScheduleEntry.teacher),
            selectinload(LessonSession.schedule_entry).selectinload(ScheduleEntry.grade),
            selectinload(LessonSession.schedule_entry).selectinload(ScheduleEntry.time_slot),
            selectinload(LessonSession.attendances),
            selectinload(LessonSession.lesson_plan).selectinload(LessonPlan.materials),
        )
        .where(LessonSession.id == session_id, LessonSession.is_deleted == False)  # noqa: E712
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def _load_attendances_with_students(
    db: SessionDep, session: LessonSession,
) -> list[tuple[SessionAttendance, User | None]]:
    """Load student data for session attendances."""
    student_ids = [a.student_id for a in session.attendances]
    students_map: dict[int, User] = {}
    if student_ids:
        result = await db.execute(select(User).where(User.id.in_(student_ids)))
        students_map = {s.id: s for s in result.scalars().all()}
    return [
        (att, students_map.get(att.student_id))
        for att in session.attendances
    ]


def _plan_filled_count(plan: LessonPlan) -> int:
    """Count how many plan fields are filled (0-8)."""
    count = 0
    if plan.topic and plan.topic.strip():
        count += 1
    if plan.lesson_type:
        count += 1
    if plan.objectives:
        count += 1
    if plan.keywords:
        count += 1
    if plan.homework and plan.homework.strip():
        count += 1
    if plan.materials:
        count += 1
    if plan.resources:
        count += 1
    if plan.assessment_methods:
        count += 1
    return count


PLAN_TOTAL_FIELDS = 8


def _count_weekday_between(start: date, end: date, day_of_week: int, holidays: set[date]) -> int:
    """Count occurrences of day_of_week (1=Mon..7=Sun) between start and end inclusive, excluding holidays."""
    if start > end:
        return 0
    py_weekday = day_of_week - 1  # Convert to Python weekday (0=Mon..6=Sun)
    days_ahead = (py_weekday - start.weekday()) % 7
    first = start + timedelta(days=days_ahead)
    if first > end:
        return 0
    total = (end - first).days // 7 + 1
    # Subtract holidays that fall on this weekday
    for h in holidays:
        if first <= h <= end and h.weekday() == py_weekday:
            total -= 1
    return total


def _calc_lesson_numbers(
    entries: list[ScheduleEntry],
    all_teacher_entries: list[ScheduleEntry],
    target_date: date,
    quarter_start: date,
    quarter_end: date,
    holidays: set[date],
) -> dict[int, tuple[int, int]]:
    """Calculate (lesson_number, total_lessons) per schedule_entry_id for the target_date.

    Groups entries by (grade_id, subject_id) so that multiple weekly slots
    of the same subject are numbered sequentially.
    """
    gs_entries: dict[tuple[int, int], list[ScheduleEntry]] = defaultdict(list)
    for e in all_teacher_entries:
        gs_entries[(e.grade_id, e.subject_id)].append(e)

    result: dict[int, tuple[int, int]] = {}
    today_dow = target_date.weekday() + 1  # 1=Mon..7=Sun

    for entry in entries:
        key = (entry.grade_id, entry.subject_id)
        group = gs_entries.get(key, [])

        # Sort group by (day_of_week, period_number) for consistent ordering
        group_sorted = sorted(group, key=lambda e: (e.day_of_week, e.time_slot.period_number if e.time_slot else 0))

        # Count lessons from quarter_start to day before target_date
        yesterday = target_date - timedelta(days=1)
        count = 0
        for e in group_sorted:
            count += _count_weekday_between(quarter_start, yesterday, e.day_of_week, holidays)

        # On target_date, count entries with period <= this entry's period (same day_of_week only)
        if target_date not in holidays:
            entry_period = entry.time_slot.period_number if entry.time_slot else 0
            for e in group_sorted:
                if e.day_of_week == today_dow:
                    ep = e.time_slot.period_number if e.time_slot else 0
                    if ep <= entry_period:
                        count += 1

        # Total lessons in the whole quarter
        total = 0
        for e in group_sorted:
            total += _count_weekday_between(quarter_start, quarter_end, e.day_of_week, holidays)

        result[entry.id] = (count, total)

    return result


def _build_plan_read(plan: LessonPlan) -> LessonPlanRead:
    """Build a LessonPlanRead from a LessonPlan model."""
    return LessonPlanRead(
        id=plan.id,
        schedule_entry_id=plan.schedule_entry_id,
        plan_date=plan.plan_date.isoformat(),
        topic=plan.topic,
        lesson_type=plan.lesson_type,
        objectives=plan.objectives,
        keywords=plan.keywords,
        homework=plan.homework,
        homework_deadline=plan.homework_deadline.isoformat() if plan.homework_deadline else None,
        stages=plan.stages,
        resources=plan.resources,
        assessment_methods=plan.assessment_methods,
        homework_test_id=plan.homework_test_id,
        homework_test_title=plan.homework_test_title,
        materials=[
            LessonMaterialRead(
                id=m.id, file_url=m.file_url, original_name=m.original_name, file_size=m.file_size,
            )
            for m in (plan.materials or [])
            if not m.is_deleted
        ],
        plan_filled_count=_plan_filled_count(plan),
    )


def _build_session_detail(
    session: LessonSession,
    entry: ScheduleEntry,
    attendances: list[tuple[SessionAttendance, User | None]],
) -> SessionDetailRead:
    students = []
    for att, student in sorted(attendances, key=lambda x: (x[1].last_name if x[1] else "", x[1].first_name if x[1] else "")):
        students.append(
            SessionStudentRead(
                attendance_id=att.id,
                student_id=att.student_id,
                first_name=student.first_name if student else "",
                last_name=student.last_name if student else "",
                full_name=student.full_name if student else "",
                photo_url=student.photo_url if student else None,
                status=att.status,
                marked_at=att.marked_at.isoformat() if att.marked_at else None,
            )
        )

    plan_read = None
    if session.lesson_plan_id and session.lesson_plan:
        plan_read = _build_plan_read(session.lesson_plan)

    return SessionDetailRead(
        id=session.id,
        schedule_entry_id=session.schedule_entry_id,
        session_date=session.session_date.isoformat(),
        started_at=session.started_at.isoformat() if session.started_at else None,
        ended_at=session.ended_at.isoformat() if session.ended_at else None,
        status=session.status,
        grade_display=entry.grade.display_name if entry.grade else "",
        subject_name=entry.subject.name if entry.subject else "",
        period_number=entry.time_slot.period_number if entry.time_slot else 0,
        start_time=format_time(entry.time_slot.start_time) if entry.time_slot else "",
        end_time=format_time(entry.time_slot.end_time) if entry.time_slot else "",
        teacher_name=entry.teacher.full_name if entry.teacher else "",
        plan=plan_read,
        students=students,
    )

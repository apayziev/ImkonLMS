"""Shared helpers for lesson routes."""

from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep
from app.core.enums import SessionStatus
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.core.formatting import format_time
from app.models.lesson_material import LessonMaterial
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

MATERIALS_UPLOAD_DIR = Path("uploads/materials")

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
    if plan.resources and plan.resources.strip():
        count += 1
    if plan.assessment_methods:
        count += 1
    return count


PLAN_TOTAL_FIELDS = 8


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

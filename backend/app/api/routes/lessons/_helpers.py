"""Shared helpers for lesson routes."""

from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep
from app.core.enums import SessionStatus
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.core.formatting import format_time
from app.models.lesson_material import LessonMaterial
from app.models.lesson_session import LessonSession
from app.models.schedule_entry import ScheduleEntry
from app.models.session_attendance import SessionAttendance
from app.models.user import User, UserRole
from app.schemas.lessons import (
    LessonMaterialRead,
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
            selectinload(LessonSession.materials),
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
        for att in sorted(session.attendances, key=lambda a: a.student_id)
    ]


def _get_loaded_materials(session: LessonSession) -> list:
    """Safely get materials if relationship is already loaded (avoids MissingGreenlet)."""
    from sqlalchemy import inspect as sa_inspect
    state = sa_inspect(session)
    if "materials" in state.dict:
        return session.materials or []
    return []


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
        topic=session.topic,
        homework=session.homework,
        homework_deadline=session.homework_deadline.isoformat() if session.homework_deadline else None,
        lesson_type=session.lesson_type,
        objectives=session.objectives,
        keywords=session.keywords,
        students=students,
        materials=[
            LessonMaterialRead(
                id=m.id,
                file_url=m.file_url,
                original_name=m.original_name,
                file_size=m.file_size,
            )
            for m in _get_loaded_materials(session)
            if not m.is_deleted
        ],
    )

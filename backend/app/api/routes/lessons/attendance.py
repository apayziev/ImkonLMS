"""Attendance endpoints: update, mark-all, unmark-all, admin view."""

from datetime import UTC, date, datetime

from fastapi import APIRouter, Query
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep, SuperUser
from app.core.config import today_local
from app.core.enums import AttendanceStatus
from app.core.exceptions import NotFoundException
from app.core.formatting import format_time
from app.models.grade import Grade
from app.models.lesson_session import LessonSession
from app.models.schedule_entry import ScheduleEntry
from app.models.session_attendance import SessionAttendance
from app.models.user import User
from app.schemas.lessons import (
    AttendanceDayResponse,
    AttendanceSessionRead,
    AttendanceStudentRead,
    AttendanceUpdateRequest,
    SessionStudentRead,
)

from ._helpers import _get_teacher_session, _require_not_completed, _require_teacher

router = APIRouter()


@router.patch("/sessions/{session_id}/attendance", response_model=SessionStudentRead)
async def update_attendance(
    session_id: int,
    body: AttendanceUpdateRequest,
    db: SessionDep,
    current_user: CurrentUser,
) -> SessionStudentRead:
    """Update a single student's attendance status and/or grade. Real-time save."""
    _require_teacher(current_user)

    session = await _get_teacher_session(db, session_id, current_user.id)
    _require_not_completed(session)

    # Query 2: attendance + student in one JOIN
    att_query = (
        select(SessionAttendance, User)
        .join(User, SessionAttendance.student_id == User.id)
        .where(
            SessionAttendance.lesson_session_id == session_id,
            SessionAttendance.student_id == body.student_id,
            SessionAttendance.is_deleted == False,  # noqa: E712
        )
    )
    row = (await db.execute(att_query)).one_or_none()
    if not row:
        raise NotFoundException("O'quvchi davomat yozuvi topilmadi")

    attendance, student = row

    # If unmarked or absent, clear grade
    grade = body.grade if body.status == AttendanceStatus.PRESENT else None

    attendance.status = body.status
    attendance.grade = grade
    attendance.marked_at = None if body.status == AttendanceStatus.UNMARKED else datetime.now(UTC)

    await db.commit()
    await db.refresh(attendance)

    return SessionStudentRead(
        attendance_id=attendance.id,
        student_id=attendance.student_id,
        first_name=student.first_name,
        last_name=student.last_name,
        full_name=student.full_name,
        photo_url=student.photo_url,
        status=attendance.status,
        marked_at=attendance.marked_at.isoformat() if attendance.marked_at else None,
        grade=attendance.grade,
    )


@router.post("/sessions/{session_id}/attendance/mark-all-present")
async def mark_all_present(
    session_id: int, db: SessionDep, current_user: CurrentUser,
) -> dict:
    """Mark all unmarked students as present in one batch."""
    _require_teacher(current_user)

    session = await _get_teacher_session(db, session_id, current_user.id)
    _require_not_completed(session)

    now = datetime.now(UTC)
    stmt = (
        update(SessionAttendance)
        .where(
            SessionAttendance.lesson_session_id == session_id,
            SessionAttendance.status == AttendanceStatus.UNMARKED,
            SessionAttendance.is_deleted == False,  # noqa: E712
        )
        .values(status=AttendanceStatus.PRESENT, marked_at=now)
    )
    result = await db.execute(stmt)
    await db.commit()

    return {"updated": result.rowcount}


@router.post("/sessions/{session_id}/attendance/unmark-all")
async def unmark_all(
    session_id: int, db: SessionDep, current_user: CurrentUser,
) -> dict:
    """Reset all students back to unmarked in one batch."""
    _require_teacher(current_user)

    session = await _get_teacher_session(db, session_id, current_user.id)
    _require_not_completed(session)

    stmt = (
        update(SessionAttendance)
        .where(
            SessionAttendance.lesson_session_id == session_id,
            SessionAttendance.status != AttendanceStatus.UNMARKED,
            SessionAttendance.is_deleted == False,  # noqa: E712
        )
        .values(status=AttendanceStatus.UNMARKED, marked_at=None, grade=None)
    )
    result = await db.execute(stmt)
    await db.commit()

    return {"updated": result.rowcount}


@router.get("/attendance", response_model=AttendanceDayResponse)
async def get_attendance(
    db: SessionDep,
    current_user: SuperUser,
    grade_id: int = Query(...),
    target_date: date | None = Query(None, alias="date"),
) -> AttendanceDayResponse:
    """Admin: view all sessions and attendance for a grade on a date."""
    day = target_date or today_local()

    # Get grade display name
    grade = (await db.execute(
        select(Grade).where(Grade.id == grade_id, Grade.is_deleted == False)  # noqa: E712
    )).scalar_one_or_none()
    if not grade:
        raise NotFoundException("Sinf topilmadi")

    # Find all sessions for this grade on this date
    query = (
        select(LessonSession)
        .join(ScheduleEntry, LessonSession.schedule_entry_id == ScheduleEntry.id)
        .options(
            selectinload(LessonSession.schedule_entry).selectinload(ScheduleEntry.subject),
            selectinload(LessonSession.schedule_entry).selectinload(ScheduleEntry.teacher),
            selectinload(LessonSession.schedule_entry).selectinload(ScheduleEntry.time_slot),
            selectinload(LessonSession.attendances).selectinload(SessionAttendance.student),
        )
        .where(
            ScheduleEntry.grade_id == grade_id,
            LessonSession.session_date == day,
            LessonSession.is_deleted == False,  # noqa: E712
            ScheduleEntry.is_deleted == False,  # noqa: E712
        )
    )
    sessions = (await db.execute(query)).scalars().all()

    result_sessions = []
    for session in sorted(sessions, key=lambda s: s.schedule_entry.time_slot.period_number if s.schedule_entry and s.schedule_entry.time_slot else 0):
        entry = session.schedule_entry
        students = []
        for att in sorted(session.attendances, key=lambda a: (a.student.last_name if a.student else "", a.student.first_name if a.student else "")):
            if att.is_deleted:
                continue
            students.append(AttendanceStudentRead(
                student_id=att.student_id,
                full_name=att.student.full_name if att.student else "",
                photo_url=att.student.photo_url if att.student else None,
                status=att.status,
                marked_at=att.marked_at.isoformat() if att.marked_at else None,
                grade=att.grade,
            ))

        result_sessions.append(AttendanceSessionRead(
            session_id=session.id,
            subject_name=entry.subject.name if entry.subject else "",
            period_number=entry.time_slot.period_number if entry.time_slot else 0,
            start_time=format_time(entry.time_slot.start_time) if entry.time_slot else "",
            end_time=format_time(entry.time_slot.end_time) if entry.time_slot else "",
            started_at=session.started_at.isoformat() if session.started_at else None,
            ended_at=session.ended_at.isoformat() if session.ended_at else None,
            teacher_name=entry.teacher.full_name if entry.teacher else "",
            status=session.status,
            students=students,
        ))

    return AttendanceDayResponse(
        date=day.isoformat(),
        grade_display=grade.display_name,
        sessions=result_sessions,
    )

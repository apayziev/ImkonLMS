"""Attendance endpoints: update single, admin view."""

from datetime import UTC, date, datetime

from fastapi import APIRouter, Query
from sqlalchemy import select
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
    AttendanceHistoryResponse,
    AttendanceHistoryStudent,
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

    attendance.status = body.status
    attendance.grade = None
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
    )


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

    def _period_sort_key(s: LessonSession) -> int:
        entry = s.schedule_entry
        return entry.time_slot.period_number if entry and entry.time_slot else 0

    def _student_sort_key(a: SessionAttendance) -> tuple[str, str]:
        s = a.student
        return (s.last_name, s.first_name) if s else ("", "")

    result_sessions = []
    for session in sorted(sessions, key=_period_sort_key):
        entry = session.schedule_entry
        students = []
        for att in sorted(session.attendances, key=_student_sort_key):
            if att.is_deleted:
                continue
            students.append(AttendanceStudentRead(
                student_id=att.student_id,
                full_name=att.student.full_name if att.student else "",
                photo_url=att.student.photo_url if att.student else None,
                status=att.status,
                marked_at=att.marked_at.isoformat() if att.marked_at else None,
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


@router.get("/attendance/history", response_model=AttendanceHistoryResponse)
async def get_attendance_history(
    db: SessionDep,
    current_user: CurrentUser,
    entry_id: list[int] = Query(..., alias="entry_id"),
    start_date: date = Query(...),
    end_date: date = Query(...),
) -> AttendanceHistoryResponse:
    """Teacher: attendance history for schedule entries across a date range."""
    _require_teacher(current_user)

    # Fetch all sessions with attendance for these entries in date range
    query = (
        select(LessonSession)
        .options(
            selectinload(LessonSession.attendances).selectinload(SessionAttendance.student),
        )
        .where(
            LessonSession.schedule_entry_id.in_(entry_id),
            LessonSession.session_date >= start_date,
            LessonSession.session_date <= end_date,
            LessonSession.is_deleted == False,  # noqa: E712
        )
        .order_by(LessonSession.session_date)
    )
    sessions = (await db.execute(query)).scalars().all()

    # Collect unique dates and build student → {date → status}
    dates_set: set[str] = set()
    student_map: dict[int, AttendanceHistoryStudent] = {}

    for session in sessions:
        ds = session.session_date.isoformat()
        dates_set.add(ds)
        for att in session.attendances:
            if att.is_deleted:
                continue
            if att.student_id not in student_map:
                student = att.student
                student_map[att.student_id] = AttendanceHistoryStudent(
                    student_id=att.student_id,
                    full_name=student.full_name if student else "",
                    photo_url=student.photo_url if student else None,
                    records={},
                )
            student_map[att.student_id].records[ds] = att.status

    # Sort dates and students
    sorted_dates = sorted(dates_set)
    sorted_students = sorted(student_map.values(), key=lambda s: s.full_name)

    return AttendanceHistoryResponse(
        dates=sorted_dates,
        students=sorted_students,
    )

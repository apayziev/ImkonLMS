"""Lesson session routes — teacher starts/ends lessons, marks attendance & grades."""

from datetime import UTC, date, datetime
from pathlib import Path

from fastapi import APIRouter, File, Query, UploadFile
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep, SuperUser
from app.core.config import today_local
from app.core.enums import AttendanceStatus, SessionStatus
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.core.uploads import validate_and_save_file
from app.core.utils import format_time
from app.crud.lessons import crud_lesson_sessions
from app.models.grade import Grade
from app.models.lesson_material import LessonMaterial
from app.models.lesson_session import LessonSession
from app.models.schedule_entry import ScheduleEntry
from app.models.session_attendance import SessionAttendance
from app.models.user import User, UserRole
from app.schemas.lessons import (
    AttendanceDayResponse,
    AttendanceSessionRead,
    AttendanceStudentRead,
    AttendanceUpdateRequest,
    LessonMaterialRead,
    SessionDetailRead,
    SessionStartRequest,
    SessionStudentRead,
    SessionUpdateRequest,
    TodayLessonRead,
    TodayLessonsResponse,
)

router = APIRouter(prefix="/lessons", tags=["lessons"])

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


async def _get_teacher_session(
    db: SessionDep, session_id: int, teacher_id: int,
) -> LessonSession:
    """Load a session verifying teacher ownership. Raises 404 if not found."""
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


# ─── Today's Lessons ────────────────────────────────────────────────────────


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
            )
        )

    return TodayLessonsResponse(data=lessons, date=today.isoformat())


# ─── Plan Session (create without starting) ─────────────────────────────────


@router.post("/sessions/plan", response_model=SessionDetailRead, status_code=201)
async def plan_session(
    body: SessionStartRequest, db: SessionDep, current_user: CurrentUser,
) -> SessionDetailRead:
    """Create a planned session for a lesson (no attendance yet, just a placeholder for topic/homework/materials)."""
    _require_teacher(current_user)

    entry_query = (
        select(ScheduleEntry)
        .options(*ENTRY_LOAD)
        .where(
            ScheduleEntry.id == body.schedule_entry_id,
            ScheduleEntry.is_deleted == False,  # noqa: E712
        )
    )
    entry = (await db.execute(entry_query)).scalar_one_or_none()
    if not entry:
        raise NotFoundException("Dars jadvali topilmadi")
    if entry.teacher_id != current_user.id:
        raise ForbiddenException("Bu dars sizga tegishli emas")

    today = body.target_date or today_local()

    existing = await crud_lesson_sessions.get(
        db, schedule_entry_id=body.schedule_entry_id, session_date=today, is_deleted=False,
    )
    if existing:
        raise BadRequestException("Bu dars uchun sessiya allaqachon mavjud")

    session = LessonSession(
        schedule_entry_id=entry.id,
        session_date=today,
        started_at=None,
        status=SessionStatus.PLANNED,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return _build_session_detail(session, entry, [])


# ─── Start Session ──────────────────────────────────────────────────────────


@router.post("/sessions", response_model=SessionDetailRead, status_code=201)
async def start_session(
    body: SessionStartRequest, db: SessionDep, current_user: CurrentUser,
) -> SessionDetailRead:
    """Start a lesson session. Creates attendance records for all students in the grade."""
    _require_teacher(current_user)

    # Validate schedule entry belongs to this teacher
    entry_query = (
        select(ScheduleEntry)
        .options(*ENTRY_LOAD)
        .where(
            ScheduleEntry.id == body.schedule_entry_id,
            ScheduleEntry.is_deleted == False,  # noqa: E712
        )
    )
    entry_result = await db.execute(entry_query)
    entry = entry_result.scalar_one_or_none()
    if not entry:
        raise NotFoundException("Dars jadvali topilmadi")
    if entry.teacher_id != current_user.id:
        raise ForbiddenException("Bu dars sizga tegishli emas")

    today = today_local()

    # Check if session already exists for today
    existing = await crud_lesson_sessions.get(
        db, schedule_entry_id=body.schedule_entry_id, session_date=today, is_deleted=False,
    )
    if existing and existing.status != SessionStatus.PLANNED:
        raise BadRequestException("Bu dars uchun bugun sessiya allaqachon mavjud")

    now = datetime.now(UTC)

    if existing and existing.status == SessionStatus.PLANNED:
        # Upgrade planned → in_progress
        session = existing
        session.started_at = now
        session.status = SessionStatus.IN_PROGRESS
        await db.flush()
    else:
        # Create new session
        session = LessonSession(
            schedule_entry_id=entry.id,
            session_date=today,
            started_at=now,
            status=SessionStatus.IN_PROGRESS,
        )
        db.add(session)
        await db.flush()

    # Get all active students in this grade
    students_query = (
        select(User)
        .where(
            User.grade_id == entry.grade_id,
            User.role == UserRole.STUDENT.value,
            User.is_active == True,  # noqa: E712
            User.is_deleted == False,  # noqa: E712
        )
        .order_by(User.last_name, User.first_name)
    )
    students_result = await db.execute(students_query)
    students = students_result.scalars().all()

    # Create attendance records (default: unmarked)
    attendances = []
    for student in students:
        att = SessionAttendance(
            lesson_session_id=session.id,
            student_id=student.id,
            status="unmarked",
            marked_at=None,
        )
        db.add(att)
        attendances.append((att, student))

    await db.commit()
    await db.refresh(session)

    return _build_session_detail(session, entry, attendances)


# ─── Get Session Detail ─────────────────────────────────────────────────────


@router.get("/sessions/{session_id}", response_model=SessionDetailRead)
async def get_session(session_id: int, db: SessionDep, current_user: CurrentUser) -> SessionDetailRead:
    """Get session details with all student attendance/grades."""
    _require_teacher(current_user)

    session = await _load_session_with_relations(db, session_id)
    if not session:
        raise NotFoundException("Sessiya topilmadi")

    entry = session.schedule_entry
    if entry.teacher_id != current_user.id:
        raise ForbiddenException("Bu sessiya sizga tegishli emas")

    # Load students for each attendance
    student_ids = [a.student_id for a in session.attendances]
    students_map: dict[int, User] = {}
    if student_ids:
        students_query = select(User).where(User.id.in_(student_ids))
        students_result = await db.execute(students_query)
        students_map = {s.id: s for s in students_result.scalars().all()}

    attendances = [
        (att, students_map.get(att.student_id))
        for att in sorted(session.attendances, key=lambda a: a.student_id)
    ]

    return _build_session_detail(session, entry, attendances)


# ─── Update Attendance ──────────────────────────────────────────────────────


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


# ─── Mark All Present ────────────────────────────────────────────────────────


@router.post("/sessions/{session_id}/attendance/mark-all-present")
async def mark_all_present(
    session_id: int, db: SessionDep, current_user: CurrentUser,
) -> dict:
    """Mark all unmarked students as present in one batch."""
    _require_teacher(current_user)

    session = await _get_teacher_session(db, session_id, current_user.id)

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


# ─── Unmark All ──────────────────────────────────────────────────────────────


@router.post("/sessions/{session_id}/attendance/unmark-all")
async def unmark_all(
    session_id: int, db: SessionDep, current_user: CurrentUser,
) -> dict:
    """Reset all students back to unmarked in one batch."""
    _require_teacher(current_user)

    session = await _get_teacher_session(db, session_id, current_user.id)

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


# ─── Update Session (topic / homework) ──────────────────────────────────────


@router.patch("/sessions/{session_id}", response_model=SessionDetailRead)
async def update_session(
    session_id: int,
    body: SessionUpdateRequest,
    db: SessionDep,
    current_user: CurrentUser,
) -> SessionDetailRead:
    """Update session topic and/or homework."""
    _require_teacher(current_user)

    session = await _get_teacher_session(db, session_id, current_user.id)

    if body.topic is not None:
        session.topic = body.topic
    if body.homework is not None:
        session.homework = body.homework
    if body.homework_deadline is not None:
        from datetime import date as date_type
        session.homework_deadline = date_type.fromisoformat(body.homework_deadline)
    if body.lesson_type is not None:
        session.lesson_type = body.lesson_type
    if body.objectives is not None:
        session.objectives = body.objectives
    if body.keywords is not None:
        session.keywords = body.keywords

    await db.commit()

    # Reload with relations for response
    full_session = await _load_session_with_relations(db, session_id)
    entry = full_session.schedule_entry
    student_ids = [a.student_id for a in full_session.attendances]
    students_map: dict[int, User] = {}
    if student_ids:
        students_result = await db.execute(select(User).where(User.id.in_(student_ids)))
        students_map = {s.id: s for s in students_result.scalars().all()}
    attendances = [
        (att, students_map.get(att.student_id))
        for att in sorted(full_session.attendances, key=lambda a: a.student_id)
    ]
    return _build_session_detail(full_session, entry, attendances)


# ─── End Session ────────────────────────────────────────────────────────────


@router.post("/sessions/{session_id}/end", status_code=200)
async def end_session(session_id: int, db: SessionDep, current_user: CurrentUser) -> dict:
    """End a lesson session."""
    _require_teacher(current_user)

    session = await _get_teacher_session(db, session_id, current_user.id)
    if session.status != SessionStatus.IN_PROGRESS:
        raise BadRequestException("Sessiya allaqachon tugatilgan")

    session.status = SessionStatus.COMPLETED
    session.ended_at = datetime.now(UTC)
    await db.commit()

    return {"message": "Dars tugatildi", "session_id": session_id}


# ─── Materials ───────────────────────────────────────────────────────────────


@router.post("/sessions/{session_id}/materials", response_model=LessonMaterialRead)
async def upload_material(
    session_id: int,
    db: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> LessonMaterialRead:
    """Upload a file to a lesson session."""
    _require_teacher(current_user)
    await _get_teacher_session(db, session_id, current_user.id)

    file_url, original_name, file_size = await validate_and_save_file(
        file, MATERIALS_UPLOAD_DIR, filename_prefix=f"{session_id}_",
    )

    material = LessonMaterial(
        lesson_session_id=session_id,
        file_url=file_url,
        original_name=original_name,
        file_size=file_size,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)

    return LessonMaterialRead(
        id=material.id,
        file_url=material.file_url,
        original_name=material.original_name,
        file_size=material.file_size,
    )


@router.delete("/sessions/{session_id}/materials/{material_id}", status_code=200)
async def delete_material(
    session_id: int,
    material_id: int,
    db: SessionDep,
    current_user: CurrentUser,
) -> dict:
    """Delete a material from a lesson session."""
    _require_teacher(current_user)
    await _get_teacher_session(db, session_id, current_user.id)

    material = (await db.execute(
        select(LessonMaterial).where(
            LessonMaterial.id == material_id,
            LessonMaterial.lesson_session_id == session_id,
            LessonMaterial.is_deleted == False,  # noqa: E712
        )
    )).scalar_one_or_none()
    if not material:
        raise NotFoundException("Material topilmadi")

    # Delete file from disk
    file_path = Path(material.file_url.lstrip("/")).resolve()
    if file_path.is_relative_to(MATERIALS_UPLOAD_DIR.resolve()) and file_path.exists():
        file_path.unlink()

    await db.delete(material)
    await db.commit()

    return {"message": "Material o'chirildi"}


# ─── Helpers ────────────────────────────────────────────────────────────────


def _get_loaded_materials(session: LessonSession) -> list:
    """Safely get materials if relationship is already loaded (avoids MissingGreenlet)."""
    from sqlalchemy import inspect as sa_inspect
    state = sa_inspect(session)
    if "materials" in state.dict:
        return session.materials or []
    return []


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
                grade=att.grade,
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
            for m in (_get_loaded_materials(session))
            if not m.is_deleted
        ],
    )


# ─── Admin: Attendance View ─────────────────────────────────────────────────


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

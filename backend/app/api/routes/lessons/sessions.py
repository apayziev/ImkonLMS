"""Session lifecycle: plan, start, get, update, end."""

from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import today_local
from app.core.enums import SessionStatus
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.crud.lessons import crud_lesson_sessions
from app.models.lesson_session import LessonSession
from app.models.schedule_entry import ScheduleEntry
from app.models.session_attendance import SessionAttendance
from app.models.user import User, UserRole
from app.schemas.lessons import (
    SessionDetailRead,
    SessionStartRequest,
    SessionUpdateRequest,
)

from ._helpers import (
    ENTRY_LOAD,
    _build_session_detail,
    _get_teacher_session,
    _load_attendances_with_students,
    _load_session_with_relations,
    _require_teacher,
)

router = APIRouter()


@router.post("/sessions/plan", response_model=SessionDetailRead, status_code=201)
async def plan_session(
    body: SessionStartRequest, db: SessionDep, current_user: CurrentUser,
) -> SessionDetailRead:
    """Create a planned session for a lesson (no attendance yet, just a placeholder for topic/homework/materials)."""
    _require_teacher(current_user)

    entry = await _validate_entry_ownership(db, body.schedule_entry_id, current_user.id)
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


@router.post("/sessions", response_model=SessionDetailRead, status_code=201)
async def start_session(
    body: SessionStartRequest, db: SessionDep, current_user: CurrentUser,
) -> SessionDetailRead:
    """Start a lesson session. Creates attendance records for all students in the grade."""
    _require_teacher(current_user)

    entry = await _validate_entry_ownership(db, body.schedule_entry_id, current_user.id)
    today = body.target_date or today_local()

    # Check if session already exists for this date
    existing = await crud_lesson_sessions.get(
        db, schedule_entry_id=body.schedule_entry_id, session_date=today, is_deleted=False,
    )
    if existing and existing.status == SessionStatus.COMPLETED:
        raise BadRequestException("Bu dars uchun bugun sessiya allaqachon tugallangan")

    # If already in_progress — return existing session (idempotent)
    if existing and existing.status == SessionStatus.IN_PROGRESS:
        full_session = await _load_session_with_relations(db, existing.id)
        attendances = await _load_attendances_with_students(db, full_session)
        return _build_session_detail(full_session, entry, attendances)

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

    attendances = await _load_attendances_with_students(db, session)
    return _build_session_detail(session, entry, attendances)


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
    attendances = await _load_attendances_with_students(db, full_session)
    return _build_session_detail(full_session, entry, attendances)


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


# ─── Internal ───────────────────────────────────────────────────────────────


async def _validate_entry_ownership(db: SessionDep, entry_id: int, teacher_id: int) -> ScheduleEntry:
    """Load a schedule entry and verify the teacher owns it."""
    entry_query = (
        select(ScheduleEntry)
        .options(*ENTRY_LOAD)
        .where(
            ScheduleEntry.id == entry_id,
            ScheduleEntry.is_deleted == False,  # noqa: E712
        )
    )
    entry = (await db.execute(entry_query)).scalar_one_or_none()
    if not entry:
        raise NotFoundException("Dars jadvali topilmadi")
    if entry.teacher_id != teacher_id:
        raise ForbiddenException("Bu dars sizga tegishli emas")
    return entry

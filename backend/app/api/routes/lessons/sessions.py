"""Session lifecycle: start, get, end. Plan is separate."""

from datetime import UTC, date, datetime

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep
from app.core.config import today_local
from app.core.enums import AttendanceStatus, SessionStatus
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.crud.lessons import crud_lesson_sessions
from app.models.lesson_plan import LessonPlan
from app.models.lesson_session import LessonSession
from app.models.schedule_entry import ScheduleEntry
from app.models.session_attendance import SessionAttendance
from app.models.user import User, UserRole
from app.schemas.lessons import (
    LessonPlanCreateRequest,
    LessonPlanRead,
    LessonPlanUpdateRequest,
    SessionDetailRead,
    SessionStartRequest,
)

from ._helpers import (
    ENTRY_LOAD,
    _build_plan_read,
    _build_session_detail,
    _get_teacher_plan,
    _get_teacher_session,
    _load_attendances_with_students,
    _load_session_with_relations,
    _require_teacher,
)

router = APIRouter()


# ─── Plan endpoints ────────────────────────────────────────────────────────


async def _validate_entry_ownership(db: SessionDep, entry_id: int, teacher_id: int) -> ScheduleEntry:
    query = select(ScheduleEntry).options(*ENTRY_LOAD).where(ScheduleEntry.id == entry_id)
    entry = (await db.execute(query)).scalar_one_or_none()
    if not entry:
        raise NotFoundException("Dars jadvali topilmadi")
    if entry.teacher_id != teacher_id:
        raise ForbiddenException("Bu dars sizga tegishli emas")
    return entry


@router.post("/plans", response_model=LessonPlanRead, status_code=201)
async def create_plan(
    body: LessonPlanCreateRequest, db: SessionDep, current_user: CurrentUser,
) -> LessonPlanRead:
    """Create a lesson plan for a scheduled lesson."""
    _require_teacher(current_user)

    entry = await _validate_entry_ownership(db, body.schedule_entry_id, current_user.id)
    target = body.target_date or today_local()

    # Check duplicate
    existing = (await db.execute(
        select(LessonPlan).where(
            LessonPlan.schedule_entry_id == entry.id,
            LessonPlan.plan_date == target,
            LessonPlan.is_deleted == False,  # noqa: E712
        )
    )).scalar_one_or_none()
    if existing:
        raise BadRequestException("Bu dars uchun reja allaqachon mavjud")

    plan = LessonPlan(schedule_entry_id=entry.id, plan_date=target)
    db.add(plan)
    await db.commit()
    await db.refresh(plan, ["materials"])

    return _build_plan_read(plan)


@router.get("/plans/{plan_id}", response_model=LessonPlanRead)
async def get_plan(plan_id: int, db: SessionDep, current_user: CurrentUser) -> LessonPlanRead:
    """Get a lesson plan by ID."""
    _require_teacher(current_user)
    plan = await _get_teacher_plan(db, plan_id, current_user.id)
    return _build_plan_read(plan)


@router.patch("/plans/{plan_id}", response_model=LessonPlanRead)
async def update_plan(
    plan_id: int, body: LessonPlanUpdateRequest, db: SessionDep, current_user: CurrentUser,
) -> LessonPlanRead:
    """Update lesson plan fields."""
    _require_teacher(current_user)
    plan = await _get_teacher_plan(db, plan_id, current_user.id)

    if body.topic is not None:
        plan.topic = body.topic
    if body.homework is not None:
        plan.homework = body.homework
    if body.homework_deadline is not None:
        plan.homework_deadline = date.fromisoformat(body.homework_deadline)
    if body.lesson_type is not None:
        plan.lesson_type = body.lesson_type
    if body.objectives is not None:
        plan.objectives = [o.model_dump() for o in body.objectives] if body.objectives else None
    if body.keywords is not None:
        plan.keywords = body.keywords
    if body.stages is not None:
        plan.stages = [s.model_dump() for s in body.stages]
    if body.resources is not None:
        plan.resources = body.resources
    if body.assessment_methods is not None:
        plan.assessment_methods = body.assessment_methods

    await db.commit()
    await db.refresh(plan, ["materials"])
    return _build_plan_read(plan)


# ─── Session endpoints ─────────────────────────────────────────────────────


@router.post("/sessions", response_model=SessionDetailRead, status_code=201)
async def start_session(
    body: SessionStartRequest, db: SessionDep, current_user: CurrentUser,
) -> SessionDetailRead:
    """Start a lesson session. Creates attendance records for all students in the grade."""
    _require_teacher(current_user)

    entry = await _validate_entry_ownership(db, body.schedule_entry_id, current_user.id)
    today = body.target_date or today_local()

    if today > today_local():
        raise BadRequestException("Kelajakdagi darsni boshlash mumkin emas")

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

    # Find existing plan for this lesson date
    plan = (await db.execute(
        select(LessonPlan).where(
            LessonPlan.schedule_entry_id == entry.id,
            LessonPlan.plan_date == today,
            LessonPlan.is_deleted == False,  # noqa: E712
        )
    )).scalar_one_or_none()

    # Create new session
    session = LessonSession(
        schedule_entry_id=entry.id,
        lesson_plan_id=plan.id if plan else None,
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
            status=AttendanceStatus.UNMARKED,
            marked_at=None,
        )
        db.add(att)
        attendances.append((att, student))

    await db.commit()

    # Reload with relations
    full_session = await _load_session_with_relations(db, session.id)
    attendances = await _load_attendances_with_students(db, full_session)
    return _build_session_detail(full_session, entry, attendances)


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


@router.post("/sessions/{session_id}/end", status_code=200)
async def end_session(session_id: int, db: SessionDep, current_user: CurrentUser) -> dict:
    """End a lesson session."""
    _require_teacher(current_user)

    session = await _get_teacher_session(db, session_id, current_user.id)
    if session.status != SessionStatus.IN_PROGRESS:
        raise BadRequestException("Faqat boshlangan darsni tugatish mumkin")

    session.status = SessionStatus.COMPLETED
    session.ended_at = datetime.now(UTC)
    await db.commit()

    return {"message": "Dars tugatildi", "session_id": session_id}

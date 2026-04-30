"""Student management routes — read-only (data synced from Payment)."""

from datetime import date

from fastapi import APIRouter, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep, SuperUser
from app.core.enums import AttendanceStatus
from app.core.exceptions import ForbiddenException, NotFoundException
from app.core.pagination import DEFAULT_LIMIT, LimitQuery, SkipQuery
from app.crud.users import crud_users
from app.models.schedule_entry import ScheduleEntry
from app.models.session_attendance import SessionAttendance
from app.models.user import User, UserRole
from app.schemas.students import (
    StudentList,
    StudentRead,
    StudentsStats,
)

router = APIRouter(prefix="/students", tags=["students"])


async def _teacher_grade_ids(db: SessionDep, teacher_id: int) -> list[int]:
    """Get grade IDs where this teacher has schedule entries."""
    result = await db.execute(
        select(ScheduleEntry.grade_id)
        .where(ScheduleEntry.teacher_id == teacher_id, ScheduleEntry.is_deleted == False)  # noqa: E712
        .distinct()
    )
    return list(result.scalars().all())


async def _get_student_or_404(db: SessionDep, student_id: int) -> User:
    user = await crud_users.get(
        db, id=student_id, role=UserRole.STUDENT.value, is_deleted=False,
        options=[selectinload(User.grade)],
    )
    if not user:
        raise NotFoundException("O'quvchi topilmadi")
    return user


async def _attendance_rates(
    db: SessionDep, student_ids: list[int]
) -> dict[int, int]:
    """Map student_id → attendance rate (0–100) from all marked sessions.

    "Attended" = present + late; denominator = present + late + absent
    (UNMARKED rows are not counted). Students with no marked sessions are
    omitted; the caller treats a missing key as null/unknown.
    """
    if not student_ids:
        return {}

    attended = func.sum(
        case(
            (SessionAttendance.status.in_(
                [AttendanceStatus.PRESENT, AttendanceStatus.LATE]
            ), 1),
            else_=0,
        )
    )
    total = func.count().filter(
        SessionAttendance.status.in_(
            [
                AttendanceStatus.PRESENT,
                AttendanceStatus.LATE,
                AttendanceStatus.ABSENT,
            ]
        )
    )
    rows = (
        await db.execute(
            select(
                SessionAttendance.student_id,
                attended.label("attended"),
                total.label("total"),
            )
            .where(
                SessionAttendance.student_id.in_(student_ids),
                SessionAttendance.is_deleted == False,  # noqa: E712
            )
            .group_by(SessionAttendance.student_id)
        )
    ).all()

    return {
        sid: round(att / tot * 100)
        for sid, att, tot in rows
        if tot
    }


@router.get("/stats", response_model=StudentsStats)
async def read_students_stats(
    db: SessionDep, current_user: CurrentUser
) -> StudentsStats:
    """Roster-wide counters for the students page header.

    Teachers see counts scoped to the grades they teach; admins see everything.
    """
    base = select(User).where(
        User.role == UserRole.STUDENT.value,
        User.is_deleted == False,  # noqa: E712
    )
    if current_user.role == UserRole.TEACHER.value:
        allowed = await _teacher_grade_ids(db, current_user.id)
        base = base.where(User.grade_id.in_(allowed)) if allowed else base.where(False)

    today = date.today()
    month_start = today.replace(day=1)

    # Single round-trip via FILTER aggregates.
    row = (
        await db.execute(
            select(
                func.count().label("total"),
                func.count().filter(
                    User.is_active.is_(True), User.is_frozen.is_(False)
                ).label("active"),
                func.count().filter(User.is_frozen.is_(True)).label("frozen"),
                func.count().filter(User.created_at >= month_start).label("new_this_month"),
            ).select_from(base.subquery())
        )
    ).one()

    return StudentsStats(
        total=row.total,
        active=row.active,
        frozen=row.frozen,
        new_this_month=row.new_this_month,
    )


@router.get("/", response_model=StudentList)
async def read_students(
    db: SessionDep,
    current_user: CurrentUser,
    skip: SkipQuery = 0,
    limit: LimitQuery = DEFAULT_LIMIT,
    grade_id: int | None = None,
    search: str | None = None,
    status: str | None = Query(None, description="Filter: active, frozen, inactive"),
) -> StudentList:
    """O'quvchilar ro'yxati. Teacher faqat o'z sinflarini ko'radi."""
    # Teachers can only see students in their assigned grades
    allowed_grades: list[int] | None = None
    if current_user.role == UserRole.TEACHER.value:
        allowed_grades = await _teacher_grade_ids(db, current_user.id)
        if grade_id is not None and grade_id not in allowed_grades:
            return StudentList(data=[], count=0)

    students, total = await crud_users.get_students(
        db, skip=skip, limit=limit, grade_id=grade_id, search=search, status=status,
        grade_ids=allowed_grades,
    )

    rates = await _attendance_rates(db, [s.id for s in students])
    data = []
    for s in students:
        sr = StudentRead.model_validate(s)
        sr.attendance_rate = rates.get(s.id)
        data.append(sr)

    return StudentList(data=data, count=total)


@router.get("/deleted/list", response_model=StudentList)
async def read_deleted_students(
    db: SessionDep,
    current_user: SuperUser,
    skip: SkipQuery = 0,
    limit: LimitQuery = DEFAULT_LIMIT,
    search: str | None = None,
) -> StudentList:
    """O'chirilgan o'quvchilar ro'yxati."""
    students, total = await crud_users.get_deleted_students(db, skip=skip, limit=limit, search=search)
    return StudentList(
        data=[StudentRead.model_validate(s) for s in students],
        count=total,
    )


@router.get("/{student_id}", response_model=StudentRead)
async def read_student(student_id: int, db: SessionDep, current_user: CurrentUser) -> StudentRead:
    """O'quvchini ID bo'yicha olish."""
    student = await _get_student_or_404(db, student_id)

    # Teachers can only view students in their assigned grades
    if current_user.role == UserRole.TEACHER.value:
        allowed_grades = await _teacher_grade_ids(db, current_user.id)
        if student.grade_id not in allowed_grades:
            raise ForbiddenException("Bu o'quvchini ko'rish huquqi yo'q")

    return StudentRead.model_validate(student)

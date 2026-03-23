"""Student management routes — read-only (data synced from Payment)."""

from fastapi import APIRouter, Query
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep, SuperUser
from app.core.exceptions import NotFoundException
from app.crud.users import crud_users
from app.models.user import User, UserRole
from app.schemas.students import (
    StudentList,
    StudentRead,
)

router = APIRouter(prefix="/students", tags=["students"])


async def _get_student_or_404(db: SessionDep, student_id: int) -> User:
    user = await crud_users.get(
        db, id=student_id, role=UserRole.STUDENT.value, is_deleted=False,
        options=[selectinload(User.grade)],
    )
    if not user:
        raise NotFoundException("O'quvchi topilmadi")
    return user


@router.get("/", response_model=StudentList)
async def read_students(
    db: SessionDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    grade_id: int | None = None,
    search: str | None = None,
    status: str | None = Query(None, description="Filter: active, frozen, inactive"),
) -> StudentList:
    """O'quvchilar ro'yxati."""
    students, total = await crud_users.get_students(
        db, skip=skip, limit=limit, grade_id=grade_id, search=search, status=status,
    )
    return StudentList(
        data=[StudentRead.model_validate(s) for s in students],
        count=total,
    )


@router.get("/deleted/list", response_model=StudentList)
async def read_deleted_students(
    db: SessionDep,
    current_user: SuperUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: str | None = None,
) -> StudentList:
    """O'chirilgan o'quvchilar ro'yxati."""
    students, total = await crud_users.get_deleted_students(db, skip=skip, limit=limit, search=search)
    return StudentList(
        data=[StudentRead.model_validate(s) for s in students],
        count=total,
    )


@router.get("/{student_id}", response_model=StudentRead)
async def read_student(student_id: int, db: SessionDep) -> StudentRead:
    """O'quvchini ID bo'yicha olish."""
    student = await _get_student_or_404(db, student_id)
    return StudentRead.model_validate(student)

"""Student management routes."""

from typing import Any

from fastapi import APIRouter, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep, SuperUser
from app.core.exceptions import DuplicateValueException, NotFoundException
from app.core.security import get_password_hash
from app.crud.users import crud_users
from app.models.user import User, UserRole
from app.schemas.students import StudentCreate, StudentList, StudentRead, StudentUpdate

router = APIRouter(prefix="/students", tags=["students"])


def _student_read(user: User) -> StudentRead:
    data = StudentRead.model_validate(user)
    if user.grade:
        data.grade_name = user.grade.display_name
    return data


@router.get("/", response_model=StudentList)
async def list_students(
    db: SessionDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    grade_id: int | None = None,
    search: str | None = None,
) -> Any:
    """O'quvchilar ro'yxati."""
    students, total = await crud_users.get_students(
        db, skip=skip, limit=limit, grade_id=grade_id, search=search,
    )
    return StudentList(
        data=[_student_read(s) for s in students],
        count=total,
    )


@router.get("/{student_id}", response_model=StudentRead)
async def get_student(student_id: int, db: SessionDep) -> Any:
    """Bitta o'quvchi ma'lumotlari."""
    user = await crud_users.get(db, id=student_id, role=UserRole.STUDENT.value, is_deleted=False, options=[selectinload(User.grade)])
    if not user:
        raise NotFoundException("O'quvchi topilmadi")
    return _student_read(user)


@router.post("/", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
async def create_student(
    student_in: StudentCreate,
    db: SessionDep,
    current_user: SuperUser,
) -> Any:
    """Yangi o'quvchi yaratish."""
    existing = await crud_users.get_by_document_id(db, document_id=student_in.document_id)
    if existing:
        raise DuplicateValueException("Bu hujjat raqami allaqachon ro'yxatdan o'tgan")

    student_data = student_in.model_dump()
    student_data["role"] = UserRole.STUDENT.value
    student_data["hashed_password"] = get_password_hash(student_in.document_id)

    user = User(**student_data)
    db.add(user)

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        error_info = str(e.orig) if e.orig else str(e)
        if "student_id" in error_info.lower():
            raise DuplicateValueException("Bu o'quvchi IDsi allaqachon mavjud") from e
        if "document_id" in error_info.lower():
            raise DuplicateValueException("Bu hujjat raqami allaqachon ro'yxatdan o'tgan") from e
        raise DuplicateValueException("Ma'lumotlarni saqlashda xatolik") from e

    await db.refresh(user, attribute_names=["grade"])
    return _student_read(user)


@router.patch("/{student_id}", response_model=StudentRead)
async def update_student(
    student_id: int,
    student_in: StudentUpdate,
    db: SessionDep,
    current_user: SuperUser,
) -> Any:
    """O'quvchi ma'lumotlarini yangilash."""
    user = await crud_users.get(db, id=student_id, role=UserRole.STUDENT.value, is_deleted=False)
    if not user:
        raise NotFoundException("O'quvchi topilmadi")

    update_data = student_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise DuplicateValueException("Ma'lumotlarni yangilashda xatolik") from e

    await db.refresh(user, attribute_names=["grade"])
    return _student_read(user)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: int,
    db: SessionDep,
    current_user: SuperUser,
) -> None:
    """O'quvchini o'chirish (soft delete)."""
    deleted = await crud_users.delete(db, id=student_id, role=UserRole.STUDENT.value)
    if not deleted:
        raise NotFoundException("O'quvchi topilmadi")

"""Student management routes — matching imkon-payment."""

from datetime import date
from pathlib import Path

from fastapi import APIRouter, File, Query, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep, SuperUser
from app.core.exceptions import BadRequestException, DuplicateValueException, NotFoundException
from app.core.security import get_password_hash
from app.core.uploads import validate_and_save_image
from app.crud.users import crud_users
from app.models.user import User, UserRole
from app.schemas.students import (
    StudentCreate,
    StudentFreezeRequest,
    StudentFreezeResponse,
    StudentList,
    StudentRead,
    StudentUnfreezeRequest,
    StudentUpdate,
)

router = APIRouter(prefix="/students", tags=["students"])

UPLOAD_DIR = Path("uploads/students")

MONTH_NAMES = {
    1: "Yanvar", 2: "Fevral", 3: "Mart", 4: "Aprel",
    5: "May", 6: "Iyun", 7: "Iyul", 8: "Avgust",
    9: "Sentyabr", 10: "Oktyabr", 11: "Noyabr", 12: "Dekabr",
}


def _delete_photo_file(photo_url: str | None) -> None:
    if not photo_url:
        return
    file_path = Path(photo_url.lstrip("/")).resolve()
    if file_path.is_relative_to(UPLOAD_DIR.resolve()) and file_path.exists():
        file_path.unlink()


async def _get_student_or_404(db: SessionDep, student_id: int) -> User:
    user = await crud_users.get(
        db, id=student_id, role=UserRole.STUDENT.value, is_deleted=False,
        options=[selectinload(User.grade)],
    )
    if not user:
        raise NotFoundException("O'quvchi topilmadi")
    return user


@router.post("/", response_model=StudentRead, status_code=201)
async def create_student(
    student_in: StudentCreate,
    db: SessionDep,
    current_user: SuperUser,
) -> StudentRead:
    """Yangi o'quvchi yaratish (faqat admin)."""
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
        if "document_id" in error_info.lower():
            raise DuplicateValueException("Bu hujjat raqami allaqachon ro'yxatdan o'tgan") from e
        if "phone_number" in error_info.lower():
            raise DuplicateValueException("Bu telefon raqami allaqachon ro'yxatdan o'tgan") from e
        raise BadRequestException("Ma'lumotlarni saqlashda xatolik yuz berdi") from e

    await db.refresh(user, attribute_names=["grade"])
    return StudentRead.model_validate(user)


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


@router.patch("/{student_id}", response_model=StudentRead)
async def update_student(
    student_id: int,
    values: StudentUpdate,
    db: SessionDep,
    current_user: SuperUser,
) -> StudentRead:
    """O'quvchini yangilash (faqat admin)."""
    student = await _get_student_or_404(db, student_id)
    update_data = values.model_dump(exclude_unset=True)

    if "document_id" in update_data:
        existing = await crud_users.get_by_document_id(db, document_id=update_data["document_id"])
        if existing and existing.id != student_id:
            raise DuplicateValueException("Bu hujjat raqami allaqachon ro'yxatdan o'tgan")

    for field, value in update_data.items():
        setattr(student, field, value)

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise DuplicateValueException("Ma'lumotlarni yangilashda xatolik") from e

    await db.refresh(student, attribute_names=["grade"])
    return StudentRead.model_validate(student)


@router.delete("/{student_id}", response_model=dict)
async def delete_student(
    student_id: int,
    db: SessionDep,
    current_user: SuperUser,
) -> dict:
    """O'quvchini o'chirish (soft delete)."""
    await _get_student_or_404(db, student_id)
    deleted = await crud_users.delete(db, id=student_id, role=UserRole.STUDENT.value)
    if not deleted:
        raise NotFoundException("O'quvchi topilmadi")
    return {"message": "O'quvchi muvaffaqiyatli o'chirildi"}


# === Photo Upload ===


@router.post("/{student_id}/photo", response_model=StudentRead)
async def upload_student_photo(
    student_id: int,
    db: SessionDep,
    current_user: SuperUser,
    file: UploadFile = File(...),
) -> StudentRead:
    """O'quvchi rasmini yuklash."""
    student = await _get_student_or_404(db, student_id)
    _delete_photo_file(student.photo_url)

    photo_url = await validate_and_save_image(file, UPLOAD_DIR, filename_prefix=f"{student_id}_")
    student.photo_url = photo_url
    await db.commit()
    await db.refresh(student, attribute_names=["grade"])
    return StudentRead.model_validate(student)


@router.delete("/{student_id}/photo", response_model=StudentRead)
async def delete_student_photo(
    student_id: int,
    db: SessionDep,
    current_user: SuperUser,
) -> StudentRead:
    """O'quvchi rasmini o'chirish."""
    student = await _get_student_or_404(db, student_id)
    _delete_photo_file(student.photo_url)

    student.photo_url = None
    await db.commit()
    await db.refresh(student, attribute_names=["grade"])
    return StudentRead.model_validate(student)


# === Freeze / Unfreeze ===


@router.post("/{student_id}/freeze", response_model=StudentFreezeResponse)
async def freeze_student(
    student_id: int,
    freeze_data: StudentFreezeRequest,
    db: SessionDep,
    current_user: SuperUser,
) -> StudentFreezeResponse:
    """O'quvchini muzlatish (vaqtincha to'xtatish)."""
    student = await _get_student_or_404(db, student_id)

    if student.is_frozen:
        raise BadRequestException("O'quvchi allaqachon muzlatilgan")

    student.is_frozen = True
    student.frozen_at = date.today()
    student.frozen_reason = freeze_data.reason
    student.departure_date = freeze_data.departure_date
    student.is_active = False
    await db.commit()

    return StudentFreezeResponse(
        id=student.id,
        full_name=student.full_name,
        is_frozen=True,
        frozen_at=student.frozen_at,
        frozen_reason=student.frozen_reason,
        departure_date=student.departure_date,
        message="O'quvchi muvaffaqiyatli muzlatildi",
    )


@router.post("/{student_id}/unfreeze", response_model=StudentFreezeResponse)
async def unfreeze_student(
    student_id: int,
    unfreeze_data: StudentUnfreezeRequest,
    db: SessionDep,
    current_user: SuperUser,
) -> StudentFreezeResponse:
    """O'quvchini muzlatishdan chiqarish."""
    student = await _get_student_or_404(db, student_id)

    if not student.is_frozen:
        raise BadRequestException("O'quvchi muzlatilmagan")

    student.is_frozen = False
    student.frozen_at = None
    student.frozen_reason = None
    student.departure_date = None
    student.return_date = unfreeze_data.return_date
    student.is_active = True
    await db.commit()

    return_date = unfreeze_data.return_date
    if return_date.day <= 15:
        payment_starts_from = return_date.replace(day=1)
    else:
        if return_date.month == 12:
            payment_starts_from = date(return_date.year + 1, 1, 1)
        else:
            payment_starts_from = date(return_date.year, return_date.month + 1, 1)

    month_name = MONTH_NAMES[payment_starts_from.month]

    return StudentFreezeResponse(
        id=student.id,
        full_name=student.full_name,
        is_frozen=False,
        return_date=student.return_date,
        message=f"O'quvchi muvaffaqiyatli faollashtirildi. {month_name} oyidan boshlanadi.",
    )


# === Restore / Hard Delete ===


@router.post("/{student_id}/restore", response_model=StudentRead)
async def restore_student(
    student_id: int,
    db: SessionDep,
    current_user: SuperUser,
) -> StudentRead:
    """O'chirilgan o'quvchini tiklash."""
    restored = await crud_users.restore(db, id=student_id)
    if restored is None:
        raise NotFoundException("O'chirilgan o'quvchi topilmadi")
    return StudentRead.model_validate(restored)


@router.delete("/{student_id}/permanent", response_model=dict)
async def hard_delete_student(
    student_id: int,
    db: SessionDep,
    current_user: SuperUser,
) -> dict:
    """O'chirilgan o'quvchini bazadan butunlay o'chirish."""
    student = await crud_users.get(db, id=student_id, is_deleted=True, role=UserRole.STUDENT.value)
    if student is None:
        raise NotFoundException("O'chirilgan o'quvchi topilmadi")

    _delete_photo_file(student.photo_url)
    await crud_users.hard_delete(db, id=student_id)
    return {"message": "O'quvchi bazadan butunlay o'chirildi"}

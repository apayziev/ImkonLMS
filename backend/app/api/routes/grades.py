from typing import Any

from fastapi import APIRouter, status

from app.api.deps import SessionDep, SuperUser
from app.core.exceptions import DuplicateValueException, NotFoundException
from app.crud.grades import crud_grades
from app.models.grade import Grade
from app.schemas.grades import GradeCreate, GradeList, GradeRead, GradeUpdate

router = APIRouter(prefix="/grades", tags=["grades"])


@router.get("/", response_model=GradeList)
async def list_grades(db: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    result = await crud_grades.get_multi(db, offset=skip, limit=limit, is_deleted=False)
    return GradeList(
        data=[GradeRead.model_validate(g) for g in result["data"]],
        count=result["total_count"],
    )


@router.get("/{grade_id}", response_model=GradeRead)
async def get_grade(grade_id: int, db: SessionDep) -> Any:
    grade = await crud_grades.get(db, id=grade_id, is_deleted=False)
    if not grade:
        raise NotFoundException("Sinf topilmadi")
    return grade


@router.post("/", response_model=GradeRead, status_code=status.HTTP_201_CREATED)
async def create_grade(grade_in: GradeCreate, db: SessionDep, current_user: SuperUser) -> Any:
    existing = await crud_grades.get(db, level=grade_in.level, section=grade_in.section, is_deleted=False)
    if existing:
        raise DuplicateValueException("Bu daraja va bo'lim allaqachon mavjud")

    grade = Grade(**grade_in.model_dump())
    db.add(grade)
    await db.commit()
    await db.refresh(grade)
    return grade


@router.patch("/{grade_id}", response_model=GradeRead)
async def update_grade(grade_id: int, grade_in: GradeUpdate, db: SessionDep, current_user: SuperUser) -> Any:
    grade = await crud_grades.get(db, id=grade_id, is_deleted=False)
    if not grade:
        raise NotFoundException("Sinf topilmadi")

    update_data = grade_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(grade, field, value)

    await db.commit()
    await db.refresh(grade)
    return grade


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grade(grade_id: int, db: SessionDep, current_user: SuperUser) -> None:
    grade = await crud_grades.get(db, id=grade_id, is_deleted=False)
    if not grade:
        raise NotFoundException("Sinf topilmadi")

    await crud_grades.delete(db, id=grade_id)

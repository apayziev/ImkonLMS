"""Grade routes — read-only (data synced from Payment)."""

from typing import Any

from fastapi import APIRouter

from app.api.deps import SessionDep
from app.core.exceptions import NotFoundException
from app.crud.grades import crud_grades
from app.schemas.grades import GradeList, GradeRead

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

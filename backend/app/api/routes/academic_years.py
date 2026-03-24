"""Academic year routes — read-only (data synced from Payment)."""

from typing import Any

from fastapi import APIRouter

from app.api.deps import SessionDep
from app.core.exceptions import NotFoundException
from app.crud.academic_years import crud_academic_years
from app.schemas.academic_year import AcademicYearList, AcademicYearRead

router = APIRouter(prefix="/academic-years", tags=["academic-years"])


@router.get("/", response_model=AcademicYearList)
async def list_academic_years(db: SessionDep) -> Any:
    result = await crud_academic_years.get_multi(db, is_deleted=False)
    return AcademicYearList(
        data=[AcademicYearRead.model_validate(a) for a in result["data"]],
        count=result["total_count"],
    )


@router.get("/current", response_model=AcademicYearRead)
async def get_current_academic_year(db: SessionDep) -> Any:
    current = await crud_academic_years.get(db, is_deleted=False, is_current=True)
    if not current:
        raise NotFoundException("Joriy o'quv yili topilmadi")
    return current


@router.get("/{academic_year_id}", response_model=AcademicYearRead)
async def get_academic_year(academic_year_id: int, db: SessionDep) -> Any:
    academic_year = await crud_academic_years.get(db, id=academic_year_id, is_deleted=False)
    if not academic_year:
        raise NotFoundException("O'quv yili topilmadi")
    return academic_year

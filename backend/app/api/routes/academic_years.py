"""Academic year routes — read-only (data synced from Payment)."""

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import SessionDep
from app.core.exceptions import NotFoundException
from app.models.academic_year import AcademicYear
from app.schemas.academic_year import AcademicYearList, AcademicYearRead

router = APIRouter(prefix="/academic-years", tags=["academic-years"])


@router.get("/", response_model=AcademicYearList)
async def list_academic_years(db: SessionDep) -> AcademicYearList:
    base = select(AcademicYear).where(AcademicYear.is_deleted.is_(False))
    total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()
    rows = (await db.execute(base)).scalars().all()
    return AcademicYearList(
        data=[AcademicYearRead.model_validate(a) for a in rows],
        count=total,
    )


@router.get("/current", response_model=AcademicYearRead)
async def get_current_academic_year(db: SessionDep) -> AcademicYearRead:
    current = (
        await db.execute(
            select(AcademicYear).where(
                AcademicYear.is_deleted.is_(False),
                AcademicYear.is_current.is_(True),
            )
        )
    ).scalar_one_or_none()
    if not current:
        raise NotFoundException("Joriy o'quv yili topilmadi")
    return AcademicYearRead.model_validate(current)


@router.get("/{academic_year_id}", response_model=AcademicYearRead)
async def get_academic_year(
    academic_year_id: int, db: SessionDep
) -> AcademicYearRead:
    academic_year = (
        await db.execute(
            select(AcademicYear).where(
                AcademicYear.id == academic_year_id,
                AcademicYear.is_deleted.is_(False),
            )
        )
    ).scalar_one_or_none()
    if not academic_year:
        raise NotFoundException("O'quv yili topilmadi")
    return AcademicYearRead.model_validate(academic_year)

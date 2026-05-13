"""Grade routes — read-only (data synced from Payment)."""

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import SessionDep
from app.core.exceptions import NotFoundException
from app.models.grade import Grade
from app.schemas.grades import GradeList, GradeRead

router = APIRouter(prefix="/grades", tags=["grades"])


@router.get("/", response_model=GradeList)
async def list_grades(db: SessionDep, skip: int = 0, limit: int = 100) -> GradeList:
    base = select(Grade).where(Grade.is_deleted.is_(False))
    total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()
    rows = (await db.execute(base.offset(skip).limit(limit))).scalars().all()
    return GradeList(
        data=[GradeRead.model_validate(g) for g in rows],
        count=total,
    )


@router.get("/{grade_id}", response_model=GradeRead)
async def get_grade(grade_id: int, db: SessionDep) -> GradeRead:
    grade = (
        await db.execute(
            select(Grade).where(Grade.id == grade_id, Grade.is_deleted.is_(False))
        )
    ).scalar_one_or_none()
    if not grade:
        raise NotFoundException("Sinf topilmadi")
    return GradeRead.model_validate(grade)

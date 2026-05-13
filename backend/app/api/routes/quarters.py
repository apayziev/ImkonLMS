"""Quarter routes — admin only CRUD."""

from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import CurrentUser, SessionDep, SuperUser
from app.core.config import today_local
from app.core.exceptions import NotFoundException
from app.models.quarter import Quarter
from app.schemas.quarter import QuarterCreate, QuarterList, QuarterRead, QuarterUpdate

router = APIRouter(prefix="/quarters", tags=["quarters"])


async def _get_quarter_or_404(db: SessionDep, quarter_id: int) -> Quarter:
    quarter = (
        await db.execute(
            select(Quarter).where(
                Quarter.id == quarter_id, Quarter.is_deleted.is_(False)
            )
        )
    ).scalar_one_or_none()
    if not quarter:
        raise NotFoundException("Chorak topilmadi")
    return quarter


@router.get("/", response_model=QuarterList)
async def list_quarters(
    db: SessionDep,
    _: CurrentUser,
    academic_year_id: int | None = None,
) -> QuarterList:
    base = select(Quarter).where(Quarter.is_deleted.is_(False))
    if academic_year_id:
        base = base.where(Quarter.academic_year_id == academic_year_id)
    total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()
    rows = (await db.execute(base)).scalars().all()
    return QuarterList(
        data=[QuarterRead.model_validate(q) for q in rows],
        count=total,
    )


@router.get("/current", response_model=QuarterRead | None)
async def get_current_quarter(db: SessionDep, _: CurrentUser) -> QuarterRead | None:
    """Bugungi sanaga mos aktiv chorakni qaytaradi."""
    today = today_local()
    result = await db.execute(
        select(Quarter).where(
            Quarter.is_deleted.is_(False),
            Quarter.start_date <= today,
            Quarter.end_date >= today,
        )
    )
    quarter = result.scalar_one_or_none()
    return QuarterRead.model_validate(quarter) if quarter else None


@router.post("/", response_model=QuarterRead, status_code=201)
async def create_quarter(
    body: QuarterCreate, db: SessionDep, _: SuperUser
) -> QuarterRead:
    quarter = Quarter(**body.model_dump())
    db.add(quarter)
    await db.commit()
    await db.refresh(quarter)
    return QuarterRead.model_validate(quarter)


@router.patch("/{quarter_id}", response_model=QuarterRead)
async def update_quarter(
    quarter_id: int, body: QuarterUpdate, db: SessionDep, _: SuperUser
) -> QuarterRead:
    quarter = await _get_quarter_or_404(db, quarter_id)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(quarter, field, value)
    await db.commit()
    await db.refresh(quarter)
    return QuarterRead.model_validate(quarter)


@router.delete("/{quarter_id}", status_code=204)
async def delete_quarter(quarter_id: int, db: SessionDep, _: SuperUser) -> None:
    quarter = await _get_quarter_or_404(db, quarter_id)
    quarter.is_deleted = True
    quarter.deleted_at = datetime.now(UTC)
    await db.commit()

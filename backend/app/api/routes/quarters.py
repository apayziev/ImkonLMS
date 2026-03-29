"""Quarter routes — admin only CRUD."""

from datetime import date

from fastapi import APIRouter

from app.api.deps import SessionDep, SuperUser
from app.core.exceptions import NotFoundException
from app.crud.quarters import crud_quarters
from app.models.quarter import Quarter
from app.schemas.quarter import QuarterCreate, QuarterList, QuarterRead, QuarterUpdate

router = APIRouter(prefix="/quarters", tags=["quarters"])


@router.get("/", response_model=QuarterList)
async def list_quarters(
    db: SessionDep,
    _: SuperUser,
    academic_year_id: int | None = None,
) -> QuarterList:
    filters: dict = {"is_deleted": False}
    if academic_year_id:
        filters["academic_year_id"] = academic_year_id
    result = await crud_quarters.get_multi(db, **filters)
    return QuarterList(
        data=[QuarterRead.model_validate(q) for q in result["data"]],
        count=result["count"],
    )


@router.get("/current", response_model=QuarterRead | None)
async def get_current_quarter(db: SessionDep, _: SuperUser) -> QuarterRead | None:
    """Bugungi sanaga mos aktiv chorakni qaytaradi."""
    today = date.today()
    result = await crud_quarters.get_multi(db, is_deleted=False)
    for q in result["data"]:
        if q.start_date <= today <= q.end_date:
            return QuarterRead.model_validate(q)
    return None


@router.post("/", response_model=QuarterRead, status_code=201)
async def create_quarter(body: QuarterCreate, db: SessionDep, _: SuperUser) -> QuarterRead:
    quarter = Quarter(**body.model_dump())
    db.add(quarter)
    await db.commit()
    await db.refresh(quarter)
    return QuarterRead.model_validate(quarter)


@router.patch("/{quarter_id}", response_model=QuarterRead)
async def update_quarter(
    quarter_id: int, body: QuarterUpdate, db: SessionDep, _: SuperUser
) -> QuarterRead:
    quarter = await crud_quarters.get(db, id=quarter_id, is_deleted=False)
    if not quarter:
        raise NotFoundException("Chorak topilmadi")
    updated = await crud_quarters.update(db, db_obj=quarter, update_data=body.model_dump(exclude_none=True))
    return QuarterRead.model_validate(updated)


@router.delete("/{quarter_id}", status_code=204)
async def delete_quarter(quarter_id: int, db: SessionDep, _: SuperUser) -> None:
    quarter = await crud_quarters.get(db, id=quarter_id, is_deleted=False)
    if not quarter:
        raise NotFoundException("Chorak topilmadi")
    deleted = await crud_quarters.delete(db, id=quarter_id, is_deleted=False)
    if not deleted:
        raise NotFoundException("Chorak topilmadi")

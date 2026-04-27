"""Admin routes for parent account management."""

from fastapi import APIRouter
from sqlalchemy import func, literal_column, select, union_all

from app.api.deps import SessionDep, SuperUser
from app.core.exceptions import DuplicateValueException, NotFoundException
from app.core.pagination import DEFAULT_LIMIT, LimitQuery, SkipQuery
from app.core.security import get_password_hash
from app.models.parent_auth import ParentAuth
from app.models.user import User, UserRole
from app.schemas.parent import ParentCreate, ParentListResponse, ParentRead

router = APIRouter(prefix="/parents", tags=["parents"])


def _children_count_subquery():
    """Subquery: count children per parent phone (single query, no N+1)."""
    father = select(
        User.father_phone.label("phone"),
        func.count().label("cnt"),
    ).where(
        User.role == UserRole.STUDENT.value,
        User.is_deleted == False,  # noqa: E712
        User.father_phone.isnot(None),
    ).group_by(User.father_phone)

    mother = select(
        User.mother_phone.label("phone"),
        func.count().label("cnt"),
    ).where(
        User.role == UserRole.STUDENT.value,
        User.is_deleted == False,  # noqa: E712
        User.mother_phone.isnot(None),
    ).group_by(User.mother_phone)

    return (
        select(
            literal_column("phone"),
            func.sum(literal_column("cnt")).label("children_count"),
        )
        .select_from(union_all(father, mother).subquery())
        .group_by(literal_column("phone"))
        .subquery()
    )


@router.get("/", response_model=ParentListResponse)
async def list_parents(
    db: SessionDep,
    _: SuperUser,
    skip: SkipQuery = 0,
    limit: LimitQuery = DEFAULT_LIMIT,
    search: str | None = None,
) -> ParentListResponse:
    """Barcha ota-ona hisoblarini ko'rish."""
    count_query = select(func.count()).select_from(ParentAuth)
    if search:
        count_query = count_query.where(ParentAuth.phone.ilike(f"%{search}%"))
    total = (await db.execute(count_query)).scalar() or 0

    children_sq = _children_count_subquery()
    query = (
        select(ParentAuth, func.coalesce(children_sq.c.children_count, 0).label("children_count"))
        .outerjoin(children_sq, ParentAuth.phone == children_sq.c.phone)
    )
    if search:
        query = query.where(ParentAuth.phone.ilike(f"%{search}%"))
    query = query.order_by(ParentAuth.created_at.desc()).offset(skip).limit(limit)

    rows = (await db.execute(query)).all()
    data = [
        ParentRead(
            id=p.id, phone=p.phone, is_active=p.is_active,
            created_at=p.created_at, children_count=cnt,
        )
        for p, cnt in rows
    ]
    return ParentListResponse(data=data, count=total)


@router.post("/", response_model=ParentRead, status_code=201)
async def create_parent(
    data: ParentCreate,
    db: SessionDep,
    _: SuperUser,
) -> ParentRead:
    """Yangi ota-ona hisobi yaratish."""
    existing = await db.execute(
        select(ParentAuth).where(ParentAuth.phone == data.phone)
    )
    if existing.scalar_one_or_none():
        raise DuplicateValueException("Bu telefon raqami bilan hisob allaqachon mavjud.")

    parent = ParentAuth(
        phone=data.phone,
        hashed_password=get_password_hash(data.password),
    )
    db.add(parent)
    await db.commit()
    await db.refresh(parent)

    # Count children
    children_count_result = await db.execute(
        select(func.count()).select_from(User).where(
            User.role == UserRole.STUDENT.value,
            User.is_deleted == False,  # noqa: E712
            (User.father_phone == parent.phone) | (User.mother_phone == parent.phone),
        )
    )
    children_count = children_count_result.scalar() or 0

    return ParentRead(
        id=parent.id, phone=parent.phone, is_active=parent.is_active,
        created_at=parent.created_at, children_count=children_count,
    )


@router.delete("/{parent_id}", status_code=204)
async def delete_parent(
    parent_id: int,
    db: SessionDep,
    _: SuperUser,
) -> None:
    """Ota-ona hisobini o'chirish."""
    result = await db.execute(select(ParentAuth).where(ParentAuth.id == parent_id))
    parent = result.scalar_one_or_none()
    if not parent:
        raise NotFoundException("Ota-ona topilmadi.")

    await db.delete(parent)
    await db.commit()

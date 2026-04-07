"""Admin routes for parent account management."""

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.api.deps import SessionDep, SuperUser
from app.core.exceptions import DuplicateValueException, NotFoundException
from app.core.security import get_password_hash
from app.models.parent_auth import ParentAuth
from app.models.user import User, UserRole
from app.schemas.parent import ParentCreate, ParentListResponse, ParentRead

router = APIRouter(prefix="/parents", tags=["parents"])


@router.get("/", response_model=ParentListResponse)
async def list_parents(
    db: SessionDep,
    _: SuperUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = None,
) -> ParentListResponse:
    """Barcha ota-ona hisoblarini ko'rish."""
    query = select(ParentAuth)
    count_query = select(func.count()).select_from(ParentAuth)

    if search:
        term = f"%{search}%"
        query = query.where(ParentAuth.phone.ilike(term))
        count_query = count_query.where(ParentAuth.phone.ilike(term))

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(
        query.order_by(ParentAuth.created_at.desc()).offset(skip).limit(limit)
    )
    parents = result.scalars().all()

    data = []
    for p in parents:
        # Count children
        children_count_result = await db.execute(
            select(func.count()).select_from(User).where(
                User.role == UserRole.STUDENT.value,
                User.is_deleted == False,  # noqa: E712
                (User.father_phone == p.phone) | (User.mother_phone == p.phone),
            )
        )
        children_count = children_count_result.scalar() or 0
        data.append(ParentRead(
            id=p.id, phone=p.phone, is_active=p.is_active,
            created_at=p.created_at, children_count=children_count,
        ))

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

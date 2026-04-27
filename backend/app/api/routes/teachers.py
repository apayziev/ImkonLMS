"""Teacher routes — read-only (data synced from Payment)."""

from fastapi import APIRouter

from app.api.deps import SessionDep
from app.core.pagination import DEFAULT_LIMIT, LimitQuery, SkipQuery
from app.crud.users import crud_users
from app.schemas.teachers import TeacherList, TeacherRead

router = APIRouter(prefix="/teachers", tags=["teachers"])


@router.get("/", response_model=TeacherList)
async def read_teachers(
    db: SessionDep,
    skip: SkipQuery = 0,
    limit: LimitQuery = DEFAULT_LIMIT,
    search: str | None = None,
) -> TeacherList:
    """O'qituvchilar ro'yxati."""
    teachers, total = await crud_users.get_teachers(
        db, skip=skip, limit=limit, search=search,
    )
    return TeacherList(
        data=[TeacherRead.model_validate(t) for t in teachers],
        count=total,
    )

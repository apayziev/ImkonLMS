"""Teacher routes — read-only (data synced from Payment)."""

from fastapi import APIRouter, Query

from app.api.deps import SessionDep
from app.crud.users import crud_users
from app.schemas.teachers import TeacherList, TeacherRead

router = APIRouter(prefix="/teachers", tags=["teachers"])


@router.get("/", response_model=TeacherList)
async def read_teachers(
    db: SessionDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
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

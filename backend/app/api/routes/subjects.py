"""Subject routes — read-only (data synced from Payment)."""

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import SessionDep
from app.core.exceptions import NotFoundException
from app.models.subject import Subject
from app.schemas.subjects import SubjectList, SubjectRead

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("/", response_model=SubjectList)
async def list_subjects(db: SessionDep, skip: int = 0, limit: int = 100) -> SubjectList:
    base = select(Subject).where(Subject.is_deleted.is_(False))
    total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()
    rows = (await db.execute(base.offset(skip).limit(limit))).scalars().all()
    return SubjectList(
        data=[SubjectRead.model_validate(s) for s in rows],
        count=total,
    )


@router.get("/{subject_id}", response_model=SubjectRead)
async def get_subject(subject_id: int, db: SessionDep) -> SubjectRead:
    subject = (
        await db.execute(
            select(Subject).where(
                Subject.id == subject_id, Subject.is_deleted.is_(False)
            )
        )
    ).scalar_one_or_none()
    if not subject:
        raise NotFoundException("Fan topilmadi")
    return SubjectRead.model_validate(subject)

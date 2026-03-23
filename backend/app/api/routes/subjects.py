"""Subject routes — read-only (data synced from Payment)."""

from typing import Any

from fastapi import APIRouter

from app.api.deps import SessionDep
from app.core.exceptions import NotFoundException
from app.crud.subjects import crud_subjects
from app.schemas.subjects import SubjectList, SubjectRead

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("/", response_model=SubjectList)
async def list_subjects(db: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    result = await crud_subjects.get_multi(db, offset=skip, limit=limit, is_deleted=False)
    return SubjectList(
        data=[SubjectRead.model_validate(s) for s in result["data"]],
        count=result["total_count"],
    )


@router.get("/{subject_id}", response_model=SubjectRead)
async def get_subject(subject_id: int, db: SessionDep) -> Any:
    subject = await crud_subjects.get(db, id=subject_id, is_deleted=False)
    if not subject:
        raise NotFoundException("Fan topilmadi")
    return subject

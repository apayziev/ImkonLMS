from typing import Any

from fastapi import APIRouter, status

from app.api.deps import SessionDep, SuperUser
from app.core.exceptions import DuplicateValueException, NotFoundException
from app.crud.subjects import crud_subjects
from app.models.subject import Subject
from app.schemas.subjects import SubjectCreate, SubjectList, SubjectRead, SubjectUpdate

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


@router.post("/", response_model=SubjectRead, status_code=status.HTTP_201_CREATED)
async def create_subject(subject_in: SubjectCreate, db: SessionDep, current_user: SuperUser) -> Any:
    existing = await crud_subjects.get(db, name=subject_in.name, is_deleted=False)
    if existing:
        raise DuplicateValueException("Bu nomdagi fan allaqachon mavjud")

    subject = Subject(**subject_in.model_dump())
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return subject


@router.patch("/{subject_id}", response_model=SubjectRead)
async def update_subject(subject_id: int, subject_in: SubjectUpdate, db: SessionDep, current_user: SuperUser) -> Any:
    subject = await crud_subjects.get(db, id=subject_id, is_deleted=False)
    if not subject:
        raise NotFoundException("Fan topilmadi")

    update_data = subject_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subject, field, value)

    await db.commit()
    await db.refresh(subject)
    return subject


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(subject_id: int, db: SessionDep, current_user: SuperUser) -> None:
    subject = await crud_subjects.get(db, id=subject_id, is_deleted=False)
    if not subject:
        raise NotFoundException("Fan topilmadi")

    await crud_subjects.delete(db, id=subject_id)

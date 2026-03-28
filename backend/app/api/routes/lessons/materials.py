"""Lesson materials: upload and delete."""

from pathlib import Path

from fastapi import APIRouter, File, UploadFile
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.core.exceptions import NotFoundException
from app.core.uploads import validate_and_save_file
from app.models.lesson_material import LessonMaterial
from app.schemas.lessons import LessonMaterialRead

from ._helpers import MATERIALS_UPLOAD_DIR, _get_teacher_session, _require_teacher

router = APIRouter()


@router.post("/sessions/{session_id}/materials", response_model=LessonMaterialRead)
async def upload_material(
    session_id: int,
    db: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> LessonMaterialRead:
    """Upload a file to a lesson session."""
    _require_teacher(current_user)
    session = await _get_teacher_session(db, session_id, current_user.id)

    file_url, original_name, file_size = await validate_and_save_file(
        file, MATERIALS_UPLOAD_DIR, filename_prefix=f"{session_id}_",
    )

    material = LessonMaterial(
        lesson_session_id=session_id,
        file_url=file_url,
        original_name=original_name,
        file_size=file_size,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)

    return LessonMaterialRead(
        id=material.id,
        file_url=material.file_url,
        original_name=material.original_name,
        file_size=material.file_size,
    )


@router.delete("/sessions/{session_id}/materials/{material_id}", status_code=200)
async def delete_material(
    session_id: int,
    material_id: int,
    db: SessionDep,
    current_user: CurrentUser,
) -> dict:
    """Delete a material from a lesson session."""
    _require_teacher(current_user)
    session = await _get_teacher_session(db, session_id, current_user.id)

    material = (await db.execute(
        select(LessonMaterial).where(
            LessonMaterial.id == material_id,
            LessonMaterial.lesson_session_id == session_id,
            LessonMaterial.is_deleted == False,  # noqa: E712
        )
    )).scalar_one_or_none()
    if not material:
        raise NotFoundException("Material topilmadi")

    # Delete file from disk
    file_path = Path(material.file_url.lstrip("/")).resolve()
    if file_path.is_relative_to(MATERIALS_UPLOAD_DIR.resolve()) and file_path.exists():
        file_path.unlink()

    await db.delete(material)
    await db.commit()

    return {"message": "Material o'chirildi"}

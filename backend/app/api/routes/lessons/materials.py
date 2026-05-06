"""Lesson materials: upload and delete (attached to lesson plans)."""

import logging

from fastapi import APIRouter, File, UploadFile
from sqlalchemy import select

from app.api.deps import CurrentUser, SessionDep
from app.core.exceptions import NotFoundException
from app.core.uploads import resolve_stored_path, validate_and_save_file
from app.models.lesson_material import LessonMaterial
from app.schemas.lessons import LessonMaterialRead

from ._helpers import MATERIALS_UPLOAD_DIR, _get_teacher_plan, _require_teacher

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/plans/{plan_id}/materials", response_model=LessonMaterialRead)
async def upload_material(
    plan_id: int,
    db: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> LessonMaterialRead:
    """Upload a file to a lesson plan."""
    _require_teacher(current_user)
    plan = await _get_teacher_plan(db, plan_id, current_user.id)

    file_url, original_name, file_size = await validate_and_save_file(
        file,
        MATERIALS_UPLOAD_DIR,
        filename_prefix=f"plan{plan_id}_",
    )

    material = LessonMaterial(
        lesson_plan_id=plan.id,
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


@router.delete("/plans/{plan_id}/materials/{material_id}", status_code=200)
async def delete_material(
    plan_id: int,
    material_id: int,
    db: SessionDep,
    current_user: CurrentUser,
) -> dict:
    """Delete a material from a lesson plan."""
    _require_teacher(current_user)
    plan = await _get_teacher_plan(db, plan_id, current_user.id)

    material = (
        await db.execute(
            select(LessonMaterial).where(
                LessonMaterial.id == material_id,
                LessonMaterial.lesson_plan_id == plan.id,
                LessonMaterial.is_deleted == False,  # noqa: E712
            )
        )
    ).scalar_one_or_none()
    if not material:
        raise NotFoundException("Material topilmadi")

    # Capture path BEFORE delete so we can clean disk after the DB row is gone.
    file_path = resolve_stored_path(MATERIALS_UPLOAD_DIR, material.file_url)

    await db.delete(material)
    await db.commit()

    # Disk cleanup runs AFTER commit. If unlink fails the row is already gone,
    # so a stale file is the worst case (cleaned up by a janitor later) — much
    # better than orphaning a row pointing at a missing file.
    try:
        file_path.unlink(missing_ok=True)
    except OSError:
        logger.exception("Failed to delete material file %s", file_path)

    return {"message": "Material o'chirildi"}

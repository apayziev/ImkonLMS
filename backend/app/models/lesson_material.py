"""Lesson material — files attached to a lesson session by the teacher."""

import logging
from pathlib import Path

from sqlalchemy import BigInteger, ForeignKey, String, Text, event
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel

logger = logging.getLogger(__name__)


class LessonMaterial(BaseModel):
    __tablename__ = "lesson_material"

    lesson_session_id: Mapped[int] = mapped_column(
        ForeignKey("lesson_session.id"), index=True, kw_only=True,
    )
    file_url: Mapped[str] = mapped_column(Text, kw_only=True)
    original_name: Mapped[str] = mapped_column(String(255), kw_only=True)
    file_size: Mapped[int] = mapped_column(BigInteger, kw_only=True)

    # === Relationships ===
    lesson_session: Mapped["LessonSession"] = relationship(init=False)


@event.listens_for(LessonMaterial, "after_delete")
def _cleanup_material_file(mapper, connection, target: LessonMaterial) -> None:  # noqa: ARG001
    """Remove material file from disk when DB row is deleted (including cascade)."""
    try:
        file_path = Path(target.file_url.lstrip("/"))
        if file_path.exists():
            file_path.unlink()
    except Exception:
        logger.warning("Failed to delete material file: %s", target.file_url)

"""Lesson material — files attached to a lesson session by the teacher."""

from sqlalchemy import BigInteger, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


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

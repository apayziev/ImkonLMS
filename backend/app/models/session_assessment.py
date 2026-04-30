"""Daily BQM assessment — one row per (session, student).

Each dimension is independently optional so a teacher can score only what
the student actually demonstrated in class (e.g. knowing only, no applying).
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class SessionAssessment(BaseModel):
    __tablename__ = "session_assessment"

    __table_args__ = (
        Index(
            "uq_assessment_session_student",
            "lesson_session_id",
            "student_id",
            unique=True,
            postgresql_where="is_deleted = false",
        ),
    )

    lesson_session_id: Mapped[int] = mapped_column(
        ForeignKey("lesson_session.id", ondelete="CASCADE"), index=True, kw_only=True
    )
    student_id: Mapped[int] = mapped_column(ForeignKey("user.id"), index=True, kw_only=True)
    knowing: Mapped[int | None] = mapped_column(
        SmallInteger, nullable=True, default=None, kw_only=True
    )
    applying: Mapped[int | None] = mapped_column(
        SmallInteger, nullable=True, default=None, kw_only=True
    )
    reasoning: Mapped[int | None] = mapped_column(
        SmallInteger, nullable=True, default=None, kw_only=True
    )
    marked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None, kw_only=True
    )

    lesson_session: Mapped["LessonSession"] = relationship(back_populates="assessments", init=False)  # type: ignore[name-defined]
    student: Mapped["User"] = relationship(init=False)  # type: ignore[name-defined]

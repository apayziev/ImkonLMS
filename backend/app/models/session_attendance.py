"""Session attendance — per-student attendance and grade for a lesson session."""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class SessionAttendance(BaseModel):
    __tablename__ = "session_attendance"

    __table_args__ = (
        Index(
            "uq_attendance_session_student",
            "lesson_session_id",
            "student_id",
            unique=True,
            postgresql_where="is_deleted = false",
        ),
        CheckConstraint("grade IS NULL OR (grade >= 1 AND grade <= 5)", name="ck_grade_range"),
    )

    lesson_session_id: Mapped[int] = mapped_column(
        ForeignKey("lesson_session.id", ondelete="CASCADE"), index=True, kw_only=True,
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("user.id"), index=True, kw_only=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), default="unmarked", kw_only=True,
    )  # unmarked | present | excused | unexcused
    marked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None, kw_only=True,
    )
    grade: Mapped[int | None] = mapped_column(
        SmallInteger, nullable=True, default=None, kw_only=True,
    )

    # === Relationships ===
    lesson_session: Mapped["LessonSession"] = relationship(
        back_populates="attendances", init=False,
    )
    student: Mapped["User"] = relationship(init=False)

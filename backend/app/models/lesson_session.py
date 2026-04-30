"""Lesson session — an actual lesson conducted by a teacher on a specific date."""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import SessionStatus

from .base import BaseModel


class LessonSession(BaseModel):
    __tablename__ = "lesson_session"

    __table_args__ = (
        Index(
            "uq_lesson_session_entry_date",
            "schedule_entry_id",
            "session_date",
            unique=True,
            postgresql_where="is_deleted = false",
        ),
    )

    schedule_entry_id: Mapped[int | None] = mapped_column(
        ForeignKey("schedule_entry.id", ondelete="SET NULL"), nullable=True, index=True, kw_only=True,
    )
    lesson_plan_id: Mapped[int | None] = mapped_column(
        ForeignKey("lesson_plan.id", ondelete="SET NULL"), nullable=True, index=True, kw_only=True,
    )
    session_date: Mapped[date] = mapped_column(Date, kw_only=True)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None, kw_only=True,
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None, kw_only=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), default=SessionStatus.IN_PROGRESS, kw_only=True,
    )

    # === Relationships ===
    schedule_entry: Mapped["ScheduleEntry"] = relationship(init=False)
    lesson_plan: Mapped["LessonPlan | None"] = relationship(init=False)
    attendances: Mapped[list["SessionAttendance"]] = relationship(
        back_populates="lesson_session",
        default_factory=list,
        init=False,
        cascade="all, delete-orphan",
    )
    assessments: Mapped[list["SessionAssessment"]] = relationship(
        back_populates="lesson_session",
        default_factory=list,
        init=False,
        cascade="all, delete-orphan",
    )

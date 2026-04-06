"""Lesson plan — a teacher's plan for a specific scheduled lesson."""

from datetime import date

from sqlalchemy import Date, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class LessonPlan(BaseModel):
    __tablename__ = "lesson_plan"

    __table_args__ = (
        Index(
            "uq_lesson_plan_entry_date",
            "schedule_entry_id",
            "plan_date",
            unique=True,
            postgresql_where="is_deleted = false",
        ),
    )

    schedule_entry_id: Mapped[int | None] = mapped_column(
        ForeignKey("schedule_entry.id", ondelete="SET NULL"), nullable=True, index=True, kw_only=True,
    )
    plan_date: Mapped[date] = mapped_column(Date, kw_only=True)

    # --- Plan content ---
    topic: Mapped[str | None] = mapped_column(
        Text, nullable=True, default=None, kw_only=True,
    )
    lesson_type: Mapped[str | None] = mapped_column(
        String(30), nullable=True, default=None, kw_only=True,
    )
    objectives: Mapped[list | None] = mapped_column(
        JSONB, nullable=True, default=None, kw_only=True,
    )
    keywords: Mapped[list | None] = mapped_column(
        JSONB, nullable=True, default=None, kw_only=True,
    )
    homework: Mapped[str | None] = mapped_column(
        Text, nullable=True, default=None, kw_only=True,
    )
    homework_deadline: Mapped[date | None] = mapped_column(
        Date, nullable=True, default=None, kw_only=True,
    )

    # --- New fields ---
    stages: Mapped[list | None] = mapped_column(
        JSONB, nullable=True, default=None, kw_only=True,
    )
    resources: Mapped[str | None] = mapped_column(
        Text, nullable=True, default=None, kw_only=True,
    )
    assessment_methods: Mapped[list | None] = mapped_column(
        JSONB, nullable=True, default=None, kw_only=True,
    )

    # === Relationships ===
    schedule_entry: Mapped["ScheduleEntry"] = relationship(init=False)
    materials: Mapped[list["LessonMaterial"]] = relationship(
        back_populates="lesson_plan",
        default_factory=list,
        init=False,
        cascade="all, delete-orphan",
    )

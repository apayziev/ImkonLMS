"""Qoidabuzarlik xabari — o'qituvchi tomonidan yuboriladi."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class ViolationReport(BaseModel):
    """O'qituvchi tomonidan yuborilgan qoidabuzarlik xabari. Choraklik hisoblanadi."""

    __tablename__ = "violation_report"

    student_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"),
        index=True,
        comment="Qoidabuzarlik qilgan o'quvchi",
        kw_only=True,
    )
    violation_type_id: Mapped[int] = mapped_column(
        ForeignKey("violation_type.id", ondelete="CASCADE"),
        index=True,
        comment="Qoidabuzarlik turi",
        kw_only=True,
    )
    quarter_id: Mapped[int] = mapped_column(
        ForeignKey("quarter.id", ondelete="CASCADE"),
        index=True,
        comment="Chorak (balllar choraklik hisoblanadi)",
        kw_only=True,
    )
    session_id: Mapped[int | None] = mapped_column(
        ForeignKey("lesson_session.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
        comment="Qaysi darsda yuz bergani (ixtiyoriy)",
        kw_only=True,
    )
    reported_by_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"),
        index=True,
        comment="Xabar bergan o'qituvchi",
        kw_only=True,
    )
    note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
        comment="Izoh",
        kw_only=True,
    )
    location: Mapped[str | None] = mapped_column(
        String(300),
        nullable=True,
        default=None,
        comment="Qoidabuzarlik yuz bergan joy",
        kw_only=True,
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        comment="Yuz bergan vaqt",
        kw_only=True,
    )

    # === Relationships ===
    student: Mapped["User"] = relationship(foreign_keys=[student_id], init=False)  # type: ignore[name-defined]
    reported_by: Mapped["User"] = relationship(foreign_keys=[reported_by_id], init=False)  # type: ignore[name-defined]
    violation_type: Mapped["ViolationType"] = relationship(init=False)  # type: ignore[name-defined]

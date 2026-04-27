"""Yellow card model — o'quvchiga beriladigan ogohlantirish kartochkasi."""

from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class YellowCard(BaseModel):
    """O'quvchiga beriladigan sariq kartochka (ogohlantirish)."""

    __tablename__ = "yellow_card"

    student_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"),
        index=True,
        comment="Kartochka berilgan o'quvchi (RESTRICT: audit trail saqlanadi)",
        kw_only=True,
    )
    quarter_id: Mapped[int] = mapped_column(
        ForeignKey("quarter.id", ondelete="CASCADE"),
        index=True,
        comment="Chorak",
        kw_only=True,
    )
    lesson_session_id: Mapped[int | None] = mapped_column(
        ForeignKey("lesson_session.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
        comment="Qaysi darsda berilgani (ixtiyoriy)",
        kw_only=True,
    )
    issued_by_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"),
        index=True,
        comment="Kartochkani bergan o'qituvchi",
        kw_only=True,
    )
    reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
        comment="Sabab / izoh",
        kw_only=True,
    )

    # === Relationships ===
    student: Mapped["User"] = relationship(foreign_keys=[student_id], init=False)  # type: ignore[name-defined]
    issued_by: Mapped["User"] = relationship(foreign_keys=[issued_by_id], init=False)  # type: ignore[name-defined]

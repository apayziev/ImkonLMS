"""AcademicYear model — synced from Payment system (read-only)."""

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Integer, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel

if TYPE_CHECKING:
    from .quarter import Quarter


class AcademicYear(BaseModel):
    """O'quv yili (masalan: 2025-2026, Sentabr-Iyun). PMS dan sync bo'ladi."""

    __tablename__ = "academic_year"

    name: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        index=True,
        comment="Display name, e.g. '2025-2026'",
        kw_only=True,
    )
    start_year: Mapped[int] = mapped_column(
        Integer,
        index=True,
        comment="Calendar year when academic year starts (e.g. 2025)",
        kw_only=True,
    )
    end_year: Mapped[int] = mapped_column(
        Integer,
        comment="Calendar year when academic year ends (e.g. 2026)",
        kw_only=True,
    )
    start_month: Mapped[int] = mapped_column(
        SmallInteger,
        default=9,
        comment="First academic month (1-12, default 9=September)",
        kw_only=True,
    )
    end_month: Mapped[int] = mapped_column(
        SmallInteger,
        default=6,
        comment="Last academic month (1-12, default 6=June)",
        kw_only=True,
    )
    is_current: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        index=True,
        comment="Whether this is the currently active academic year",
        kw_only=True,
    )

    quarters: Mapped[list["Quarter"]] = relationship(
        back_populates="academic_year",
        cascade="all, delete-orphan",
        order_by="Quarter.number",
        init=False,
    )

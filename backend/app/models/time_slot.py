from sqlalchemy import ForeignKey, Index, SmallInteger, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class TimeSlot(BaseModel):
    """A lesson period within a school day, linked to an academic year."""

    __tablename__ = "time_slot"

    __table_args__ = (
        Index("ix_time_slot_year_period", "academic_year_id", "period_number", unique=True),
    )

    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_year.id"), index=True, kw_only=True
    )
    period_number: Mapped[int] = mapped_column(SmallInteger, kw_only=True)
    start_time: Mapped[str] = mapped_column(Time, kw_only=True)
    end_time: Mapped[str] = mapped_column(Time, kw_only=True)

    # === Relationships ===
    academic_year: Mapped["AcademicYear"] = relationship(init=False)

"""Quarter model — admin tomonidan kiritiladi."""

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, SmallInteger, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class Quarter(BaseModel):
    """O'quv choragi (masalan: 1-chorak, 2025-2026)."""

    __tablename__ = "quarter"
    __table_args__ = (
        UniqueConstraint("academic_year_id", "number", name="uq_quarter_year_number"),
        {"comment": "O'quv choraklari — admin tomonidan boshlanish/tugash sanalari kiritiladi"},
    )

    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_year.id", ondelete="CASCADE"),
        index=True,
        comment="O'quv yili",
        kw_only=True,
    )
    number: Mapped[int] = mapped_column(
        SmallInteger,
        comment="Chorak raqami (1–4)",
        kw_only=True,
    )
    start_date: Mapped[date] = mapped_column(
        Date,
        comment="Chorak boshlanish sanasi",
        kw_only=True,
    )
    end_date: Mapped[date] = mapped_column(
        Date,
        comment="Chorak tugash sanasi",
        kw_only=True,
    )
    holidays: Mapped[list[date]] = mapped_column(
        ARRAY(Date),
        default=list,
        server_default="{}",
        comment="Dam kunlari (public holidays) ro'yxati",
        kw_only=True,
    )
    yellow_card_limit: Mapped[int] = mapped_column(
        Integer,
        default=2,
        server_default="2",
        comment="Bir chorakda bir o'quvchiga berilishi mumkin bo'lgan sariq kartochkalar soni",
        kw_only=True,
    )

    academic_year: Mapped["AcademicYear"] = relationship(back_populates="quarters", init=False)  # type: ignore[name-defined]

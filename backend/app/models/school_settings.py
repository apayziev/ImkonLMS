from sqlalchemy import JSON, SmallInteger, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from .base import BaseModel


class SchoolSettings(BaseModel):
    """Single-row school configuration. Admin-editable via API."""

    __tablename__ = "school_settings"

    key: Mapped[str] = mapped_column(String(50), unique=True, index=True, kw_only=True)
    day_start_time: Mapped[str] = mapped_column(String(5), default="08:00", kw_only=True)
    day_end_time: Mapped[str] = mapped_column(String(5), default="16:00", kw_only=True)
    lesson_duration_minutes: Mapped[int] = mapped_column(SmallInteger, default=45, kw_only=True)
    default_break_minutes: Mapped[int] = mapped_column(SmallInteger, default=5, kw_only=True)
    working_days: Mapped[list[int]] = mapped_column(
        ARRAY(SmallInteger), default_factory=lambda: [1, 2, 3, 4, 5, 6], kw_only=True
    )
    breaks: Mapped[list] = mapped_column(
        JSON, default_factory=list, kw_only=True
    )

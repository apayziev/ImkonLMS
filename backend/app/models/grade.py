from sqlalchemy import Index, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import BaseModel


class Grade(BaseModel):
    __tablename__ = "grade"

    __table_args__ = (Index("ix_grade_level_section", "level", "section"),)

    level: Mapped[int] = mapped_column(SmallInteger, index=True, kw_only=True)
    section: Mapped[str] = mapped_column(String(50), kw_only=True)

    @property
    def display_name(self) -> str:
        prefix = "K" if self.level == 0 else str(self.level)
        return f"{prefix}-{self.section}"

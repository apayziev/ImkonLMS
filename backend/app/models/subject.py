from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from .base import BaseModel


class Subject(BaseModel):
    __tablename__ = "subject"

    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, kw_only=True)
    name_uz: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None, kw_only=True)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None, kw_only=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True, default=None, kw_only=True)

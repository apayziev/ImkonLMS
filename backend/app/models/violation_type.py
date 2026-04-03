"""Qoidabuzarlik turi — admin tomonidan yaratiladigan kategoriyalar."""

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import BaseModel


class ViolationType(BaseModel):
    """Qoidabuzarlik turi (admin CRUD)."""

    __tablename__ = "violation_type"

    name: Mapped[str] = mapped_column(
        String(200),
        comment="Qoidabuzarlik nomi (masalan, 'Yengil intizomiy xatolar')",
        kw_only=True,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
        comment="Tavsif",
        kw_only=True,
    )
    points: Mapped[int] = mapped_column(
        Integer,
        default=1,
        comment="Ball (jazol miqdori)",
        kw_only=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        comment="Faol/nofaol",
        kw_only=True,
    )

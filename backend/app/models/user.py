"""User model — represents all system users with role-based fields."""

from datetime import date
from enum import Enum

from sqlalchemy import Date, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import BaseModel


class UserRole(str, Enum):
    ADMIN = "admin"
    STUDENT = "student"


class User(BaseModel):
    __tablename__ = "user"
    __table_args__ = (
        Index("ix_user_role_active", "role", "is_active"),
    )

    # === Authentication ===
    document_id: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        index=True,
        kw_only=True,
    )
    phone_number: Mapped[str | None] = mapped_column(
        String(20),
        unique=True,
        nullable=True,
        default=None,
        index=True,
        kw_only=True,
    )
    hashed_password: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        default=None,
        kw_only=True,
    )

    # === Personal Info ===
    first_name: Mapped[str] = mapped_column(String(50), kw_only=True)
    last_name: Mapped[str] = mapped_column(String(50), kw_only=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True, default=None, kw_only=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True, default=None, kw_only=True)

    # === Role & Status ===
    role: Mapped[str] = mapped_column(
        String(20),
        default=UserRole.STUDENT.value,
        index=True,
        kw_only=True,
    )
    is_active: Mapped[bool] = mapped_column(default=True, kw_only=True)
    is_superuser: Mapped[bool] = mapped_column(default=False, kw_only=True)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

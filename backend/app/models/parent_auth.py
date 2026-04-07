"""Parent authentication — credentials for parent portal access."""

from datetime import UTC, datetime

from sqlalchemy import DateTime, String, text
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column

from app.core.db import Base


class ParentAuth(Base, MappedAsDataclass):
    """Minimal credential store for parent login. Children found by phone match at runtime."""

    __tablename__ = "parent_auth"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True, kw_only=True)
    hashed_password: Mapped[str] = mapped_column(String(255), kw_only=True)
    is_active: Mapped[bool] = mapped_column(default=True, kw_only=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default_factory=lambda: datetime.now(UTC),
        server_default=text("current_timestamp(0)"),
    )

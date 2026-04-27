"""Refresh token rotation tracking — one row per outstanding refresh JWT.

Implements OWASP-recommended single-use refresh tokens with replay detection:
- Each login mints a new family_id and a fresh jti.
- Each /refresh marks the presented jti as used (used_at) and inserts a new row
  with the same family_id and a new jti.
- If a jti is presented twice (used_at already set), the entire family is
  deleted — kicking out the attacker AND the legitimate user, who must log in
  again. This is the standard refresh-token-rotation defense.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column

from app.core.db import Base


class RefreshToken(Base, MappedAsDataclass):
    __tablename__ = "refresh_token"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True, init=False)
    subject: Mapped[str] = mapped_column(String(64), index=True, kw_only=True)
    role: Mapped[str | None] = mapped_column(String(20), nullable=True, default=None, kw_only=True)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, kw_only=True)
    jti: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, index=True, kw_only=True)
    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None, kw_only=True,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), kw_only=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default_factory=lambda: datetime.now(UTC),
        server_default=text("current_timestamp(0)"),
    )

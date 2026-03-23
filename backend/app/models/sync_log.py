"""Sync log model to track Payment sync history."""

from datetime import UTC, datetime

from sqlalchemy import DateTime, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, IDMixin


class SyncLog(Base, IDMixin):
    """Records each sync attempt with status, stats, and errors."""

    __tablename__ = "sync_log"

    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default_factory=lambda: datetime.now(UTC),
        server_default=text("current_timestamp(0)"),
    )
    status: Mapped[str] = mapped_column(String(20), default="success")
    stats: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=None)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    triggered_by: Mapped[str] = mapped_column(String(50), default="manual")

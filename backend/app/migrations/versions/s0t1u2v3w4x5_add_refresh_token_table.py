"""add refresh_token table for rotation + replay detection

Revision ID: s0t1u2v3w4x5
Revises: r9s0t1u2v3w4
Create Date: 2026-04-27 00:00:00.000000

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "s0t1u2v3w4x5"
down_revision: Union[str, None] = "r9s0t1u2v3w4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "refresh_token",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("subject", sa.String(length=64), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=True),
        sa.Column("family_id", UUID(as_uuid=True), nullable=False),
        sa.Column("jti", UUID(as_uuid=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("current_timestamp(0)"),
            nullable=False,
        ),
    )
    op.create_index("ix_refresh_token_subject", "refresh_token", ["subject"])
    op.create_index("ix_refresh_token_family_id", "refresh_token", ["family_id"])
    op.create_index("ix_refresh_token_jti", "refresh_token", ["jti"], unique=True)
    op.create_index("ix_refresh_token_expires_at", "refresh_token", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_refresh_token_expires_at", table_name="refresh_token")
    op.drop_index("ix_refresh_token_jti", table_name="refresh_token")
    op.drop_index("ix_refresh_token_family_id", table_name="refresh_token")
    op.drop_index("ix_refresh_token_subject", table_name="refresh_token")
    op.drop_table("refresh_token")

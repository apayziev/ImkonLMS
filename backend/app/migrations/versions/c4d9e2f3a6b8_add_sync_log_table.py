"""add_sync_log_table

Revision ID: c4d9e2f3a6b8
Revises: b3c8f1a2d5e7
Create Date: 2026-03-24 11:15:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c4d9e2f3a6b8"
down_revision: Union[str, None] = "b3c8f1a2d5e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sync_log",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("current_timestamp(0)"),
            nullable=False,
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="success"),
        sa.Column("stats", postgresql.JSONB(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("triggered_by", sa.String(50), nullable=False, server_default="manual"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("sync_log")

"""drop school_settings.key (singleton, not keyed)

Revision ID: x5y6z7a8b9c0
Revises: w4x5y6z7a8b9
Create Date: 2026-05-13 00:00:00.000000

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "x5y6z7a8b9c0"
down_revision: Union[str, None] = "w4x5y6z7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("ix_school_settings_key", table_name="school_settings")
    op.drop_column("school_settings", "key")


def downgrade() -> None:
    op.add_column(
        "school_settings",
        sa.Column("key", sa.String(length=50), nullable=False, server_default="default"),
    )
    op.create_index(
        "ix_school_settings_key", "school_settings", ["key"], unique=True
    )

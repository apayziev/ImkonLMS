"""add_academic_year_table

Revision ID: d5e6f7a8b9c0
Revises: c4d9e2f3a6b8
Create Date: 2026-03-24 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, None] = "c4d9e2f3a6b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "academic_year",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(20), nullable=False, unique=True),
        sa.Column("start_year", sa.Integer(), nullable=False),
        sa.Column("end_year", sa.Integer(), nullable=False),
        sa.Column("start_month", sa.SmallInteger(), nullable=False, server_default="9"),
        sa.Column("end_month", sa.SmallInteger(), nullable=False, server_default="6"),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)"), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_academic_year_name", "academic_year", ["name"])
    op.create_index("ix_academic_year_start_year", "academic_year", ["start_year"])
    op.create_index("ix_academic_year_is_current", "academic_year", ["is_current"])
    op.create_index("ix_academic_year_is_deleted", "academic_year", ["is_deleted"])


def downgrade() -> None:
    op.drop_table("academic_year")

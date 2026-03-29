"""add_quarter_table

Revision ID: i0j1k2l3m4n5
Revises: h9i0j1k2l3m4
Create Date: 2026-03-29 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "i0j1k2l3m4n5"
down_revision: Union[str, None] = "h9i0j1k2l3m4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)

    if not inspector.has_table("quarter"):
        op.create_table(
            "quarter",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("academic_year_id", sa.Integer(), nullable=False),
            sa.Column("number", sa.SmallInteger(), nullable=False),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
            sa.ForeignKeyConstraint(["academic_year_id"], ["academic_year.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("academic_year_id", "number", name="uq_quarter_year_number"),
        )
        op.create_index("ix_quarter_academic_year_id", "quarter", ["academic_year_id"])


def downgrade() -> None:
    op.drop_index("ix_quarter_academic_year_id", table_name="quarter")
    op.drop_table("quarter")

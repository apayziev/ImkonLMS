"""add session_assessment table (BQM daily assessment)

Revision ID: w4x5y6z7a8b9
Revises: v3w4x5y6z7a8
Create Date: 2026-04-28 00:00:00.000000

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "w4x5y6z7a8b9"
down_revision: Union[str, None] = "v3w4x5y6z7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "session_assessment",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column(
            "lesson_session_id",
            sa.Integer(),
            sa.ForeignKey("lesson_session.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "student_id",
            sa.Integer(),
            sa.ForeignKey("user.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("knowing", sa.SmallInteger(), nullable=True),
        sa.Column("applying", sa.SmallInteger(), nullable=True),
        sa.Column("reasoning", sa.SmallInteger(), nullable=True),
        sa.Column("marked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("current_timestamp(0)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("current_timestamp(0)"),
            nullable=True,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false"), index=True
        ),
        sa.CheckConstraint("knowing IS NULL OR knowing BETWEEN 0 AND 4", name="ck_knowing_range"),
        sa.CheckConstraint(
            "applying IS NULL OR applying BETWEEN 0 AND 4", name="ck_applying_range"
        ),
        sa.CheckConstraint(
            "reasoning IS NULL OR reasoning BETWEEN 0 AND 2", name="ck_reasoning_range"
        ),
    )
    op.create_index(
        "uq_assessment_session_student",
        "session_assessment",
        ["lesson_session_id", "student_id"],
        unique=True,
        postgresql_where=sa.text("is_deleted = false"),
    )


def downgrade() -> None:
    op.drop_table("session_assessment")

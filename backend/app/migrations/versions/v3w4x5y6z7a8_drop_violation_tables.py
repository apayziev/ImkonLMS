"""drop violation tables (feature removed)

Revision ID: v3w4x5y6z7a8
Revises: u2v3w4x5y6z7
Create Date: 2026-04-28 00:00:00.000000

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "v3w4x5y6z7a8"
down_revision: Union[str, None] = "u2v3w4x5y6z7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("violation_report")
    op.drop_table("violation_type")


def downgrade() -> None:
    op.create_table(
        "violation_type",
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("points", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "violation_report",
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("violation_type_id", sa.Integer(), nullable=False),
        sa.Column("quarter_id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=True),
        sa.Column("reported_by_id", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("location", sa.String(300), nullable=True),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["user.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["violation_type_id"], ["violation_type.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["quarter_id"], ["quarter.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["lesson_session.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reported_by_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_violation_report_student_id", "violation_report", ["student_id"])
    op.create_index(
        "ix_violation_report_violation_type_id", "violation_report", ["violation_type_id"]
    )
    op.create_index("ix_violation_report_quarter_id", "violation_report", ["quarter_id"])
    op.create_index(
        "ix_violation_report_reported_by_id", "violation_report", ["reported_by_id"]
    )

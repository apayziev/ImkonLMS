"""add_violation_tables

Revision ID: n5o6p7q8r9s0
Revises: m4n5o6p7q8r9
Create Date: 2026-04-03 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "n5o6p7q8r9s0"
down_revision: Union[str, None] = "m4n5o6p7q8r9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "violation_type",
        sa.Column("name", sa.String(200), nullable=False, comment="Qoidabuzarlik nomi"),
        sa.Column("description", sa.Text(), nullable=True, comment="Tavsif"),
        sa.Column("points", sa.Integer(), nullable=False, server_default="1", comment="Ball (jazol miqdori)"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true"), comment="Faol/nofaol"),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "violation_report",
        sa.Column("student_id", sa.Integer(), nullable=False, comment="Qoidabuzarlik qilgan o'quvchi"),
        sa.Column("violation_type_id", sa.Integer(), nullable=False, comment="Qoidabuzarlik turi"),
        sa.Column("quarter_id", sa.Integer(), nullable=False, comment="Chorak"),
        sa.Column("session_id", sa.Integer(), nullable=True, comment="Qaysi darsda yuz bergani"),
        sa.Column("reported_by_id", sa.Integer(), nullable=False, comment="Xabar bergan o'qituvchi"),
        sa.Column("note", sa.Text(), nullable=True, comment="Izoh"),
        sa.Column("location", sa.String(300), nullable=True, comment="Qoidabuzarlik yuz bergan joy"),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), comment="Yuz bergan vaqt"),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["student_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["violation_type_id"], ["violation_type.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["quarter_id"], ["quarter.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["lesson_session.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reported_by_id"], ["user.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_violation_report_student_id", "violation_report", ["student_id"])
    op.create_index("ix_violation_report_violation_type_id", "violation_report", ["violation_type_id"])
    op.create_index("ix_violation_report_quarter_id", "violation_report", ["quarter_id"])
    op.create_index("ix_violation_report_reported_by_id", "violation_report", ["reported_by_id"])


def downgrade() -> None:
    op.drop_table("violation_report")
    op.drop_table("violation_type")

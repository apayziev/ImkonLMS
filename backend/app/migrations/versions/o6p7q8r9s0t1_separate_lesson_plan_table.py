"""separate lesson_plan table from lesson_session

Revision ID: o6p7q8r9s0t1
Revises: n5o6p7q8r9s0
Create Date: 2026-04-14

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "o6p7q8r9s0t1"
down_revision: Union[str, None] = "n5o6p7q8r9s0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create lesson_plan table
    op.create_table(
        "lesson_plan",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("schedule_entry_id", sa.Integer(), sa.ForeignKey("schedule_entry.id", ondelete="SET NULL"), nullable=True),
        sa.Column("plan_date", sa.Date(), nullable=False),
        sa.Column("topic", sa.Text(), nullable=True),
        sa.Column("lesson_type", sa.String(30), nullable=True),
        sa.Column("objectives", postgresql.JSONB(), nullable=True),
        sa.Column("keywords", postgresql.JSONB(), nullable=True),
        sa.Column("homework", sa.Text(), nullable=True),
        sa.Column("homework_deadline", sa.Date(), nullable=True),
        sa.Column("stages", postgresql.JSONB(), nullable=True),
        sa.Column("resources", sa.Text(), nullable=True),
        sa.Column("assessment_methods", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_lesson_plan_schedule_entry_id", "lesson_plan", ["schedule_entry_id"])
    op.create_index("ix_lesson_plan_is_deleted", "lesson_plan", ["is_deleted"])
    op.create_index(
        "uq_lesson_plan_entry_date",
        "lesson_plan",
        ["schedule_entry_id", "plan_date"],
        unique=True,
        postgresql_where=sa.text("is_deleted = false"),
    )

    # 2. Add lesson_plan_id FK to lesson_session
    op.add_column("lesson_session", sa.Column("lesson_plan_id", sa.Integer(), sa.ForeignKey("lesson_plan.id", ondelete="SET NULL"), nullable=True))
    op.create_index("ix_lesson_session_lesson_plan_id", "lesson_session", ["lesson_plan_id"])

    # 3. Drop plan columns from lesson_session
    op.drop_column("lesson_session", "topic")
    op.drop_column("lesson_session", "homework")
    op.drop_column("lesson_session", "homework_deadline")
    op.drop_column("lesson_session", "lesson_type")
    op.drop_column("lesson_session", "objectives")
    op.drop_column("lesson_session", "keywords")

    # 4. Change lesson_material FK: lesson_session_id → lesson_plan_id
    op.drop_index("ix_lesson_material_lesson_session_id", table_name="lesson_material")
    op.drop_constraint("lesson_material_lesson_session_id_fkey", "lesson_material", type_="foreignkey")
    op.drop_column("lesson_material", "lesson_session_id")
    op.add_column("lesson_material", sa.Column("lesson_plan_id", sa.Integer(), sa.ForeignKey("lesson_plan.id", ondelete="CASCADE"), nullable=False))
    op.create_index("ix_lesson_material_lesson_plan_id", "lesson_material", ["lesson_plan_id"])


def downgrade() -> None:
    # Reverse lesson_material FK
    op.drop_index("ix_lesson_material_lesson_plan_id", table_name="lesson_material")
    op.drop_constraint("lesson_material_lesson_plan_id_fkey", "lesson_material", type_="foreignkey")
    op.drop_column("lesson_material", "lesson_plan_id")
    op.add_column("lesson_material", sa.Column("lesson_session_id", sa.Integer(), sa.ForeignKey("lesson_session.id"), nullable=False))
    op.create_index("ix_lesson_material_lesson_session_id", "lesson_material", ["lesson_session_id"])

    # Re-add plan columns to lesson_session
    op.add_column("lesson_session", sa.Column("keywords", postgresql.JSONB(), nullable=True))
    op.add_column("lesson_session", sa.Column("objectives", postgresql.JSONB(), nullable=True))
    op.add_column("lesson_session", sa.Column("lesson_type", sa.String(30), nullable=True))
    op.add_column("lesson_session", sa.Column("homework_deadline", sa.Date(), nullable=True))
    op.add_column("lesson_session", sa.Column("homework", sa.Text(), nullable=True))
    op.add_column("lesson_session", sa.Column("topic", sa.Text(), nullable=True))

    # Remove lesson_plan_id from lesson_session
    op.drop_index("ix_lesson_session_lesson_plan_id", table_name="lesson_session")
    op.drop_column("lesson_session", "lesson_plan_id")

    # Drop lesson_plan table
    op.drop_index("uq_lesson_plan_entry_date", table_name="lesson_plan")
    op.drop_index("ix_lesson_plan_is_deleted", table_name="lesson_plan")
    op.drop_index("ix_lesson_plan_schedule_entry_id", table_name="lesson_plan")
    op.drop_table("lesson_plan")

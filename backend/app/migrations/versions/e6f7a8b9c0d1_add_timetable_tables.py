"""add_timetable_tables

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-03-24 18:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e6f7a8b9c0d1"
down_revision: Union[str, None] = "d5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- school_settings ---
    op.create_table(
        "school_settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("key", sa.String(50), nullable=False, unique=True),
        sa.Column("day_start_time", sa.String(5), nullable=False, server_default="08:00"),
        sa.Column("day_end_time", sa.String(5), nullable=False, server_default="16:00"),
        sa.Column("lesson_duration_minutes", sa.SmallInteger(), nullable=False, server_default="45"),
        sa.Column("default_break_minutes", sa.SmallInteger(), nullable=False, server_default="5"),
        sa.Column("periods_per_day", sa.SmallInteger(), nullable=False, server_default="6"),
        sa.Column("working_days", sa.ARRAY(sa.SmallInteger()), nullable=False, server_default="{1,2,3,4,5,6}"),
        sa.Column("breaks", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)"), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_school_settings_key", "school_settings", ["key"])
    op.create_index("ix_school_settings_is_deleted", "school_settings", ["is_deleted"])

    # --- time_slot ---
    op.create_table(
        "time_slot",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("academic_year_id", sa.Integer(), sa.ForeignKey("academic_year.id"), nullable=False),
        sa.Column("period_number", sa.SmallInteger(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)"), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_time_slot_academic_year_id", "time_slot", ["academic_year_id"])
    op.create_index("ix_time_slot_year_period", "time_slot", ["academic_year_id", "period_number"], unique=True)
    op.create_index("ix_time_slot_is_deleted", "time_slot", ["is_deleted"])

    # --- schedule_entry ---
    op.create_table(
        "schedule_entry",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("academic_year_id", sa.Integer(), sa.ForeignKey("academic_year.id"), nullable=False),
        sa.Column("grade_id", sa.Integer(), sa.ForeignKey("grade.id"), nullable=False),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subject.id"), nullable=False),
        sa.Column("teacher_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("time_slot_id", sa.Integer(), sa.ForeignKey("time_slot.id"), nullable=False),
        sa.Column("day_of_week", sa.SmallInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)"), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_schedule_entry_academic_year_id", "schedule_entry", ["academic_year_id"])
    op.create_index("ix_schedule_entry_grade_id", "schedule_entry", ["grade_id"])
    op.create_index("ix_schedule_entry_subject_id", "schedule_entry", ["subject_id"])
    op.create_index("ix_schedule_entry_teacher_id", "schedule_entry", ["teacher_id"])
    op.create_index("ix_schedule_entry_time_slot_id", "schedule_entry", ["time_slot_id"])
    op.create_index("ix_schedule_entry_is_deleted", "schedule_entry", ["is_deleted"])
    op.create_index(
        "uq_schedule_grade_day_slot", "schedule_entry",
        ["grade_id", "day_of_week", "time_slot_id", "academic_year_id"],
        unique=True,
    )
    op.create_index(
        "uq_schedule_teacher_day_slot", "schedule_entry",
        ["teacher_id", "day_of_week", "time_slot_id", "academic_year_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("schedule_entry")
    op.drop_table("time_slot")
    op.drop_table("school_settings")

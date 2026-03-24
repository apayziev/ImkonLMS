"""Make schedule unique indexes partial (exclude soft-deleted rows).

Revision ID: a1b2c3d4e5f6
Revises: f7a8b9c0d1e2
"""

from alembic import op

revision = "a1b2c3d4e5f6"
down_revision = "f7a8b9c0d1e2"


def upgrade() -> None:
    # Drop old (non-partial) unique indexes
    op.drop_index("uq_schedule_grade_day_slot", table_name="schedule_entry")
    op.drop_index("uq_schedule_teacher_day_slot", table_name="schedule_entry")

    # Create partial unique indexes — only enforce on active (non-deleted) rows
    op.execute(
        """
        CREATE UNIQUE INDEX uq_schedule_grade_day_slot
        ON schedule_entry (grade_id, day_of_week, time_slot_id, academic_year_id)
        WHERE is_deleted = false
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX uq_schedule_teacher_day_slot
        ON schedule_entry (teacher_id, day_of_week, time_slot_id, academic_year_id)
        WHERE is_deleted = false
        """
    )


def downgrade() -> None:
    op.drop_index("uq_schedule_grade_day_slot", table_name="schedule_entry")
    op.drop_index("uq_schedule_teacher_day_slot", table_name="schedule_entry")

    op.create_index(
        "uq_schedule_grade_day_slot",
        "schedule_entry",
        ["grade_id", "day_of_week", "time_slot_id", "academic_year_id"],
        unique=True,
    )
    op.create_index(
        "uq_schedule_teacher_day_slot",
        "schedule_entry",
        ["teacher_id", "day_of_week", "time_slot_id", "academic_year_id"],
        unique=True,
    )

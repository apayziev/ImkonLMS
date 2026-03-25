"""Add lesson_session and session_attendance tables.

Revision ID: a1b2c3d4e5f7
Revises: b2c3d4e5f6a7
Create Date: 2026-03-25

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f7"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lesson_session",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("schedule_entry_id", sa.Integer(), sa.ForeignKey("schedule_entry.id"), nullable=False, index=True),
        sa.Column("session_date", sa.Date(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="in_progress"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false"), index=True),
    )
    op.create_index(
        "uq_lesson_session_entry_date",
        "lesson_session",
        ["schedule_entry_id", "session_date"],
        unique=True,
        postgresql_where=sa.text("is_deleted = false"),
    )

    op.create_table(
        "session_attendance",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("lesson_session_id", sa.Integer(), sa.ForeignKey("lesson_session.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False, index=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="present"),
        sa.Column("marked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("grade", sa.SmallInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false"), index=True),
        sa.CheckConstraint("grade IS NULL OR (grade >= 1 AND grade <= 5)", name="ck_grade_range"),
    )
    op.create_index(
        "uq_attendance_session_student",
        "session_attendance",
        ["lesson_session_id", "student_id"],
        unique=True,
        postgresql_where=sa.text("is_deleted = false"),
    )


def downgrade() -> None:
    op.drop_table("session_attendance")
    op.drop_table("lesson_session")

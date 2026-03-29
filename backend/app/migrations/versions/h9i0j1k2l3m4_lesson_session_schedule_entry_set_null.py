"""lesson_session schedule_entry_id SET NULL on delete

Revision ID: h9i0j1k2l3m4
Revises: g8h9i0j1k2l3
Create Date: 2026-03-29 00:00:00.000000

"""
from alembic import op

revision = "h9i0j1k2l3m4"
down_revision = "g8h9i0j1k2l3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop old FK (without ON DELETE SET NULL)
    op.drop_constraint(
        "lesson_session_schedule_entry_id_fkey", "lesson_session", type_="foreignkey"
    )
    # Allow NULL
    op.alter_column("lesson_session", "schedule_entry_id", nullable=True)
    # Re-create FK with SET NULL
    op.create_foreign_key(
        "lesson_session_schedule_entry_id_fkey",
        "lesson_session",
        "schedule_entry",
        ["schedule_entry_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "lesson_session_schedule_entry_id_fkey", "lesson_session", type_="foreignkey"
    )
    op.alter_column("lesson_session", "schedule_entry_id", nullable=False)
    op.create_foreign_key(
        "lesson_session_schedule_entry_id_fkey",
        "lesson_session",
        "schedule_entry",
        ["schedule_entry_id"],
        ["id"],
    )

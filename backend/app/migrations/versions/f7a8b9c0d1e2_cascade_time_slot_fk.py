"""cascade time_slot FK on schedule_entry

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-03-25 03:00:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "f7a8b9c0d1e2"
down_revision = "e6f7a8b9c0d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "schedule_entry_time_slot_id_fkey", "schedule_entry", type_="foreignkey"
    )
    op.create_foreign_key(
        "schedule_entry_time_slot_id_fkey",
        "schedule_entry",
        "time_slot",
        ["time_slot_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        "schedule_entry_time_slot_id_fkey", "schedule_entry", type_="foreignkey"
    )
    op.create_foreign_key(
        "schedule_entry_time_slot_id_fkey",
        "schedule_entry",
        "time_slot",
        ["time_slot_id"],
        ["id"],
    )

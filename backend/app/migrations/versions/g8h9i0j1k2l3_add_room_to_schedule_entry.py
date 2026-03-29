"""add room to schedule_entry

Revision ID: g8h9i0j1k2l3
Revises: f7a8b9c0d1e2
Create Date: 2026-04-01 00:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "g8h9i0j1k2l3"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "schedule_entry",
        sa.Column("room", sa.String(length=20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("schedule_entry", "room")

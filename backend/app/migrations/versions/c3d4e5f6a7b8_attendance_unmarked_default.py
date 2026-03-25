"""Make session_attendance.marked_at nullable and default status unmarked.

Revision ID: c3d4e5f6a7b8
Revises: a1b2c3d4e5f7
Create Date: 2026-03-25

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "c3d4e5f6a7b8"
down_revision = "a1b2c3d4e5f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "session_attendance",
        "marked_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=True,
    )
    op.alter_column(
        "session_attendance",
        "status",
        existing_type=sa.String(20),
        server_default="unmarked",
    )


def downgrade() -> None:
    op.alter_column(
        "session_attendance",
        "status",
        existing_type=sa.String(20),
        server_default="present",
    )
    op.alter_column(
        "session_attendance",
        "marked_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
    )

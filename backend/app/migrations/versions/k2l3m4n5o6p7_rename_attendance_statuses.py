"""rename_attendance_statuses

Revision ID: k2l3m4n5o6p7
Revises: j1k2l3m4n5o6
Create Date: 2026-03-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = "k2l3m4n5o6p7"
down_revision: Union[str, None] = "j1k2l3m4n5o6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "UPDATE session_attendance SET status = 'late' WHERE status = 'excused'"
    )
    op.execute(
        "UPDATE session_attendance SET status = 'absent' WHERE status = 'unexcused'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE session_attendance SET status = 'excused' WHERE status = 'late'"
    )
    op.execute(
        "UPDATE session_attendance SET status = 'unexcused' WHERE status = 'absent'"
    )

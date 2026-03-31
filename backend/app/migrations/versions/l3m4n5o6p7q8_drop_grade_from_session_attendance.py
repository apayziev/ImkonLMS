"""drop_grade_from_session_attendance

Revision ID: l3m4n5o6p7q8
Revises: k2l3m4n5o6p7
Create Date: 2026-03-31 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "l3m4n5o6p7q8"
down_revision: Union[str, None] = "k2l3m4n5o6p7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE session_attendance DROP CONSTRAINT IF EXISTS ck_grade_range"
    )
    op.drop_column("session_attendance", "grade")


def downgrade() -> None:
    op.add_column(
        "session_attendance",
        sa.Column("grade", sa.SmallInteger(), nullable=True),
    )
    op.create_check_constraint(
        "ck_grade_range",
        "session_attendance",
        "grade IS NULL OR (grade >= 1 AND grade <= 5)",
    )

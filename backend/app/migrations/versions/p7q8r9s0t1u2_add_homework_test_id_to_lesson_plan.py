"""add homework_test_id to lesson_plan

Revision ID: p7q8r9s0t1u2
Revises: o6p7q8r9s0t1
Create Date: 2025-07-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "p7q8r9s0t1u2"
down_revision: Union[str, None] = "o6p7q8r9s0t1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("lesson_plan", sa.Column("homework_test_id", sa.Integer(), nullable=True))
    op.add_column("lesson_plan", sa.Column("homework_test_title", sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column("lesson_plan", "homework_test_title")
    op.drop_column("lesson_plan", "homework_test_id")

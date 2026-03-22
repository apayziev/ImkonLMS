"""add_teacher_fields

Revision ID: b3c8f1a2d5e7
Revises: 0f7c77e0507b
Create Date: 2025-05-20 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b3c8f1a2d5e7"
down_revision: Union[str, None] = "0f7c77e0507b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user", sa.Column("subjects", postgresql.JSONB(), nullable=True))
    op.add_column(
        "user",
        sa.Column(
            "class_teacher_grade_id",
            sa.Integer(),
            sa.ForeignKey("grade.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_user_class_teacher_grade_id", "user", ["class_teacher_grade_id"])


def downgrade() -> None:
    op.drop_index("ix_user_class_teacher_grade_id", table_name="user")
    op.drop_column("user", "class_teacher_grade_id")
    op.drop_column("user", "subjects")

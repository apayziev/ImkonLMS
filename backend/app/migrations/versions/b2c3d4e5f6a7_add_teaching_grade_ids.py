"""Add teaching_grade_ids to user table.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column(
            "teaching_grade_ids",
            JSONB,
            nullable=True,
            comment="Dars beradigan sinflar ID ro'yxati",
        ),
    )


def downgrade() -> None:
    op.drop_column("user", "teaching_grade_ids")

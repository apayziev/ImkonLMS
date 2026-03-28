"""add lesson_type, objectives, keywords to lesson_session

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-03-28 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "a7b8c9d0e1f2"
down_revision = "f6a7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("lesson_session", sa.Column("lesson_type", sa.String(30), nullable=True))
    op.add_column("lesson_session", sa.Column("objectives", postgresql.JSONB(), nullable=True))
    op.add_column("lesson_session", sa.Column("keywords", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("lesson_session", "keywords")
    op.drop_column("lesson_session", "objectives")
    op.drop_column("lesson_session", "lesson_type")

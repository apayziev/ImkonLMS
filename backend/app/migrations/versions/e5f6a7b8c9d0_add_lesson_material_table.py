"""add lesson_material table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-03-27

"""
from alembic import op
import sqlalchemy as sa

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lesson_material",
        sa.Column("lesson_session_id", sa.Integer(), sa.ForeignKey("lesson_session.id"), nullable=False),
        sa.Column("file_url", sa.Text(), nullable=False),
        sa.Column("original_name", sa.String(255), nullable=False),
        sa.Column("file_size", sa.BigInteger(), nullable=False),
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, default=False),
    )
    op.create_index("ix_lesson_material_lesson_session_id", "lesson_material", ["lesson_session_id"])
    op.create_index("ix_lesson_material_is_deleted", "lesson_material", ["is_deleted"])


def downgrade() -> None:
    op.drop_index("ix_lesson_material_is_deleted")
    op.drop_index("ix_lesson_material_lesson_session_id")
    op.drop_table("lesson_material")

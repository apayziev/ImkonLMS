"""drop yellow_card table and quarter.yellow_card_limit column

Revision ID: t1u2v3w4x5y6
Revises: s0t1u2v3w4x5
Create Date: 2026-04-28 00:00:00.000000

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "t1u2v3w4x5y6"
down_revision: Union[str, None] = "s0t1u2v3w4x5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("yellow_card")
    op.drop_column("quarter", "yellow_card_limit")


def downgrade() -> None:
    op.add_column(
        "quarter",
        sa.Column(
            "yellow_card_limit",
            sa.Integer(),
            nullable=False,
            server_default="2",
            comment="Bir chorakda bir o'quvchiga berilishi mumkin bo'lgan sariq kartochkalar soni",
        ),
    )
    op.create_table(
        "yellow_card",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)"), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("quarter_id", sa.Integer(), nullable=False),
        sa.Column("lesson_session_id", sa.Integer(), nullable=True),
        sa.Column("issued_by_id", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["student_id"], ["user.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["quarter_id"], ["quarter.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lesson_session_id"], ["lesson_session.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["issued_by_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_yellow_card_student_id", "yellow_card", ["student_id"])
    op.create_index("ix_yellow_card_quarter_id", "yellow_card", ["quarter_id"])
    op.create_index("ix_yellow_card_issued_by_id", "yellow_card", ["issued_by_id"])
    op.create_index("ix_yellow_card_is_deleted", "yellow_card", ["is_deleted"])

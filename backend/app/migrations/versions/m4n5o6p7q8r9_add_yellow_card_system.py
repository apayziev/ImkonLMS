"""add_yellow_card_system

Revision ID: m4n5o6p7q8r9
Revises: l3m4n5o6p7q8
Create Date: 2026-04-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "m4n5o6p7q8r9"
down_revision: Union[str, None] = "l3m4n5o6p7q8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add yellow_card_limit to quarter table
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

    # 2. Create yellow_card table
    op.create_table(
        "yellow_card",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("current_timestamp(0)"), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("student_id", sa.Integer(), nullable=False, comment="Kartochka berilgan o'quvchi"),
        sa.Column("quarter_id", sa.Integer(), nullable=False, comment="Chorak"),
        sa.Column("lesson_session_id", sa.Integer(), nullable=True, comment="Qaysi darsda berilgani (ixtiyoriy)"),
        sa.Column("issued_by_id", sa.Integer(), nullable=False, comment="Kartochkani bergan o'qituvchi"),
        sa.Column("reason", sa.Text(), nullable=True, comment="Sabab / izoh"),
        sa.ForeignKeyConstraint(["student_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["quarter_id"], ["quarter.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lesson_session_id"], ["lesson_session.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["issued_by_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_yellow_card_student_id", "yellow_card", ["student_id"])
    op.create_index("ix_yellow_card_quarter_id", "yellow_card", ["quarter_id"])
    op.create_index("ix_yellow_card_issued_by_id", "yellow_card", ["issued_by_id"])
    op.create_index("ix_yellow_card_is_deleted", "yellow_card", ["is_deleted"])


def downgrade() -> None:
    op.drop_table("yellow_card")
    op.drop_column("quarter", "yellow_card_limit")

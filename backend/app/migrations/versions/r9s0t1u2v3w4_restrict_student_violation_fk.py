"""restrict student FK on violation_report and yellow_card

Switch CASCADE to RESTRICT so accidental hard-delete of a student with
discipline history fails loudly instead of silently destroying the audit
trail. Soft-delete (is_deleted=True) is unaffected.

Revision ID: r9s0t1u2v3w4
Revises: q8r9s0t1u2v3
Create Date: 2026-04-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = "r9s0t1u2v3w4"
down_revision: Union[str, None] = "q8r9s0t1u2v3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_FKS = [
    ("violation_report", "violation_report_student_id_fkey", "student_id"),
    ("yellow_card", "yellow_card_student_id_fkey", "student_id"),
]


def _swap_fk(table: str, fk_name: str, column: str, ondelete: str) -> None:
    op.drop_constraint(fk_name, table, type_="foreignkey")
    op.create_foreign_key(
        fk_name, table, "user",
        [column], ["id"],
        ondelete=ondelete,
    )


def upgrade() -> None:
    for table, fk, col in _FKS:
        _swap_fk(table, fk, col, ondelete="RESTRICT")


def downgrade() -> None:
    for table, fk, col in _FKS:
        _swap_fk(table, fk, col, ondelete="CASCADE")

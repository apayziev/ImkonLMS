"""tighten session_assessment ranges to 1..N (drop the 0)

A 0 score was semantically the same as "not assessed" (NULL) — the total
is unaffected and the UI treats them identically. Coerce existing 0s to
NULL and tighten the CHECK constraints so the API/UI stop having to
distinguish them.

Revision ID: x5y6z7a8b9c0
Revises: w4x5y6z7a8b9
Create Date: 2026-04-30 00:00:00.000000

"""
from collections.abc import Sequence
from typing import Union

from alembic import op

revision: str = "x5y6z7a8b9c0"
down_revision: Union[str, None] = "w4x5y6z7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE session_assessment SET knowing = NULL WHERE knowing = 0")
    op.execute("UPDATE session_assessment SET applying = NULL WHERE applying = 0")
    op.execute("UPDATE session_assessment SET reasoning = NULL WHERE reasoning = 0")

    op.drop_constraint("ck_knowing_range", "session_assessment", type_="check")
    op.drop_constraint("ck_applying_range", "session_assessment", type_="check")
    op.drop_constraint("ck_reasoning_range", "session_assessment", type_="check")

    op.create_check_constraint(
        "ck_knowing_range",
        "session_assessment",
        "knowing IS NULL OR knowing BETWEEN 1 AND 4",
    )
    op.create_check_constraint(
        "ck_applying_range",
        "session_assessment",
        "applying IS NULL OR applying BETWEEN 1 AND 4",
    )
    op.create_check_constraint(
        "ck_reasoning_range",
        "session_assessment",
        "reasoning IS NULL OR reasoning BETWEEN 1 AND 2",
    )


def downgrade() -> None:
    op.drop_constraint("ck_knowing_range", "session_assessment", type_="check")
    op.drop_constraint("ck_applying_range", "session_assessment", type_="check")
    op.drop_constraint("ck_reasoning_range", "session_assessment", type_="check")

    op.create_check_constraint(
        "ck_knowing_range",
        "session_assessment",
        "knowing IS NULL OR knowing BETWEEN 0 AND 4",
    )
    op.create_check_constraint(
        "ck_applying_range",
        "session_assessment",
        "applying IS NULL OR applying BETWEEN 0 AND 4",
    )
    op.create_check_constraint(
        "ck_reasoning_range",
        "session_assessment",
        "reasoning IS NULL OR reasoning BETWEEN 0 AND 2",
    )

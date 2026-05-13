"""baseline schema (squash of 38 prior migrations)

This is a fresh-install baseline produced from the production schema dump on
2026-05-13. It replaces the 38 incremental migrations that lived in this
directory. On an empty DB it creates the full schema in one shot. On a DB
that's already at the previous head (`x5y6z7a8b9c0`), it is a no-op —
existing tables are detected and the migration returns early.

Operational notes:
- Production: alembic_version is manually stamped to this revision once,
  swapping the version row from `x5y6z7a8b9c0` → this id. After the stamp,
  prestart's `alembic upgrade head` is a no-op (already at head).
- Fresh dev DB: `alembic upgrade head` runs only this migration, applying
  the SQL bundled alongside in `baseline_2026_05_13.sql`.

Revision ID: y6z7a8b9c0d1
Revises:
Create Date: 2026-05-13 11:30:00.000000
"""
from __future__ import annotations

from collections.abc import Sequence
from pathlib import Path

from alembic import op
from sqlalchemy import inspect

revision: str = "y6z7a8b9c0d1"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_BASELINE_SQL_PATH = Path(__file__).resolve().parent.parent / "baseline_2026_05_13.sql"


def upgrade() -> None:
    conn = op.get_bind()
    insp = inspect(conn)
    # If any of the canonical tables already exist, the schema is in place
    # (production case) and the baseline must not re-run DDL.
    if insp.has_table("user") or insp.has_table("academic_year"):
        return

    sql = _BASELINE_SQL_PATH.read_text(encoding="utf-8")
    op.execute(sql)


def downgrade() -> None:
    raise NotImplementedError(
        "Baseline migration is not reversible. Restore from a database backup."
    )

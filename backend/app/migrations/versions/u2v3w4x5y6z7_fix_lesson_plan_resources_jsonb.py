"""fix lesson_plan.resources column type (Text -> JSONB)

Model declared resources as JSONB but the original migration created it as
TEXT. Practical writes worked because SQLAlchemy serialises the list to JSON
either way, but DB-level validation was off and JSONB operators were unusable.

Revision ID: u2v3w4x5y6z7
Revises: t1u2v3w4x5y6
Create Date: 2026-04-28 00:00:00.000000

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "u2v3w4x5y6z7"
down_revision: Union[str, None] = "t1u2v3w4x5y6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Empty strings would fail ::jsonb cast; coerce them to NULL first.
    op.execute(
        "ALTER TABLE lesson_plan "
        "ALTER COLUMN resources TYPE jsonb "
        "USING CASE WHEN resources IS NULL OR resources = '' "
        "THEN NULL ELSE resources::jsonb END"
    )


def downgrade() -> None:
    op.alter_column(
        "lesson_plan",
        "resources",
        type_=sa.Text(),
        existing_type=postgresql.JSONB(),
        postgresql_using="resources::text",
    )

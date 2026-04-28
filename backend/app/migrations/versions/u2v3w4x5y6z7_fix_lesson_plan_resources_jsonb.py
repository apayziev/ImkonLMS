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
    # Some legacy rows held unparseable text in the TEXT column (whitespace-only
    # strings, truncated objects). Use a plpgsql helper that catches any cast
    # failure and falls back to NULL — a hard ::jsonb cast would abort the
    # whole migration on the first bad row.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION pg_temp.safe_to_jsonb(t text)
        RETURNS jsonb AS $$
        BEGIN
            IF t IS NULL OR btrim(t) = '' THEN
                RETURN NULL;
            END IF;
            RETURN t::jsonb;
        EXCEPTION WHEN OTHERS THEN
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
        """
    )
    op.execute(
        "ALTER TABLE lesson_plan "
        "ALTER COLUMN resources TYPE jsonb "
        "USING pg_temp.safe_to_jsonb(resources)"
    )


def downgrade() -> None:
    op.alter_column(
        "lesson_plan",
        "resources",
        type_=sa.Text(),
        existing_type=postgresql.JSONB(),
        postgresql_using="resources::text",
    )

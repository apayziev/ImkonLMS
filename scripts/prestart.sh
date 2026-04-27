#!/bin/bash

set -euo pipefail

echo "Starting prestart script..."

if [ ! -f "alembic.ini" ]; then
    echo "ERROR: alembic.ini not found in $(pwd) — refusing to start" >&2
    exit 1
fi

echo "Running database migrations..."
python -m alembic upgrade head

# Superuser creation is non-fatal: a duplicate is fine, but other errors
# (DB write failures, etc.) must surface in logs.
echo "Creating first superuser..."
if ! python -m app.commands.create_first_superuser 2>&1; then
    echo "WARNING: superuser creation returned non-zero — check logs" >&2
fi

echo "Prestart script completed."

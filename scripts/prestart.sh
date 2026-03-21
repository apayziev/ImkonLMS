#!/bin/bash

set -e

echo "Starting prestart script..."

# Run migrations
echo "Running database migrations..."
if [ -f "alembic.ini" ]; then
    python -m alembic upgrade head
else
    echo "alembic.ini not found in $(pwd), skipping migrations."
fi

# Create first superuser
echo "Creating first superuser..."
set +e
python -m app.commands.create_first_superuser 2>&1
set -e

echo "Prestart script completed."

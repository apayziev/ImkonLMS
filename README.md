# IMKON LMS - Learning Management System

O'quv jarayonini boshqarish tizimi — IMKON Liderlar Maktabi uchun.

## Stack

- **Backend**: FastAPI + SQLAlchemy async + PostgreSQL
- **Frontend**: React + TanStack Router/Query + Tailwind CSS
- **Deploy**: Docker Compose + GitHub Actions + Nginx

## Local Development

```bash
# Backend
cd backend
uv sync
cp ../.env.example ../.env  # Edit with your values
uv run alembic upgrade head
uv run uvicorn app.main:app --reload

# Docker
docker compose up -d
```

## Project Structure

```
backend/
└── app/
    ├── main.py           # FastAPI application
    ├── api/              # Routes & dependencies
    ├── core/             # Config, DB, security, exceptions
    ├── crud/             # Database operations
    ├── models/           # SQLAlchemy models
    ├── schemas/          # Pydantic schemas
    └── migrations/       # Alembic migrations

frontend/
└── src/
    ├── routes/           # TanStack Router file-based routes
    ├── components/       # Feature + ui components
    ├── hooks/            # Reusable hooks
    └── lib/              # API client, utils, locale
```

## Pre-commit hooks

```bash
uv run pre-commit install   # one-time, sets up the git hook
uv run pre-commit run -a    # run on all files manually
```

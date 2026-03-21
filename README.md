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
├── app/
│   ├── main.py           # FastAPI application
│   ├── api/              # Routes & dependencies
│   ├── core/             # Config, DB, security, exceptions
│   ├── crud/             # Database operations
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   └── migrations/       # Alembic migrations
└── tests/
```

COMPOSE = docker compose

.PHONY: up down build logs shell migrate

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

logs:
	$(COMPOSE) logs -f api

shell:
	$(COMPOSE) exec api bash

migrate:
	$(COMPOSE) exec api python -m alembic upgrade head

makemigrations:
	$(COMPOSE) exec api python -m alembic revision --autogenerate -m "$(msg)"

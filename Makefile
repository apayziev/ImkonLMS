PYTHON := backend/.venv/bin/python
export PYTHONPATH := backend
COMPOSE = docker compose

.PHONY: help
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: install
install: ## Install backend dependencies
	uv --project backend sync

.PHONY: run
run: ## Run backend locally with reload
	cd backend && uv run uvicorn app.main:app --reload --port 8002

.PHONY: migrate
migrate: ## Run database migrations
	cd backend && uv run alembic upgrade head

.PHONY: makemigrations
makemigrations: ## Create migration (usage: make makemigrations m="message")
	cd backend && uv run alembic revision --autogenerate -m "$(m)"

.PHONY: cmd
cmd: ## Run command (usage: make cmd n="create_first_superuser")
	cd backend && uv run python -m app.commands.$(n)

.PHONY: up
up: ## Start dev DB
	$(COMPOSE) up -d

.PHONY: down
down: ## Stop dev DB
	$(COMPOSE) down

.PHONY: prod
prod: ## Start production
	$(COMPOSE) -f docker-compose.prod.yml up -d --build

.PHONY: prod-down
prod-down: ## Stop production
	$(COMPOSE) -f docker-compose.prod.yml down

.PHONY: prod-logs
prod-logs: ## View production logs
	$(COMPOSE) -f docker-compose.prod.yml logs -f

.PHONY: prod-restart
prod-restart: ## Rebuild and restart production
	$(COMPOSE) -f docker-compose.prod.yml up -d --build api frontend

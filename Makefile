.DEFAULT_GOAL := help
.PHONY: help setup dev build test lint format seed sync export docker-up docker-down docker-test clean

# ── Help ──────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  Project Tracker — available targets"
	@echo ""
	@echo "  setup        Install all dependencies and prepare the environment"
	@echo "  dev          Start the Next.js dev server"
	@echo "  build        Production build"
	@echo "  test         Run the test suite"
	@echo "  lint         Run ESLint and type-check"
	@echo "  format       Run Prettier"
	@echo "  seed         Seed the datastore from the migration template"
	@echo "  sync         Run the template sync pipeline locally"
	@echo "  export       Download exports via the running API"
	@echo "  docker-up    Start the full Docker Compose stack"
	@echo "  docker-down  Tear down the Docker Compose stack"
	@echo "  docker-test  Run replication tests inside Docker"
	@echo "  clean        Remove build artefacts"
	@echo ""

# ── Environment ───────────────────────────────────────────────────────────────
setup:
	@echo "→ Installing Node dependencies..."
	npm ci
	@echo "→ Installing pre-commit hooks..."
	pip install pre-commit
	pre-commit install
	@echo "→ Copying .env.example to .env.local (if not present)..."
	@if [ ! -f .env.local ]; then cp .env.example .env.local; echo "  Created .env.local — fill in real values before running."; fi
	@echo "✓ Setup complete."

# ── Development ───────────────────────────────────────────────────────────────
dev:
	npm run dev

build:
	npm run build

test:
	npm run test

# ── Code quality ──────────────────────────────────────────────────────────────
lint:
	npm run lint
	npm run type-check

format:
	npm run format

# ── Data operations ───────────────────────────────────────────────────────────
seed:
	npm run seed

sync:
	npm run sync

export:
	@echo "Open the running tracker UI and use the export buttons, or call:"
	@echo "  curl -s \$${TRACKER_API_URL}/api/export/tasks"

# ── Docker ────────────────────────────────────────────────────────────────────
docker-up:
	docker compose up --build -d

docker-down:
	docker compose down -v

docker-test:
	docker compose run --rm test

# ── Cleanup ───────────────────────────────────────────────────────────────────
clean:
	rm -rf .next out node_modules/.cache

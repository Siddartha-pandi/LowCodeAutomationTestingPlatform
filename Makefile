.PHONY: help install install-backend install-frontend dev start backend backend-api backend-worker worker frontend build build-backend build-frontend test test-backend test-frontend clean up down

help:
	@echo "Available commands:"
	@echo "  --- Core Commands (HMR & Embedded Worker Built-in) ---"
	@echo "  make backend           Start unified NestJS API + Embedded Playwright Worker (port 8000)"
	@echo "  make frontend          Start Next.js frontend dev server with HMR (port 3000)"
	@echo "  make dev               Start Backend & Frontend together concurrently in one terminal"
	@echo ""
	@echo "  --- Dependency Installation ---"
	@echo "  make install           Install all dependencies (backend, frontend)"
	@echo "  make install-backend   Install unified NestJS backend dependencies"
	@echo "  make install-frontend  Install Next.js frontend dependencies"
	@echo ""
	@echo "  --- Build & Test ---"
	@echo "  make build             Compile both backend and frontend production builds"
	@echo "  make build-backend     Compile backend NestJS production build"
	@echo "  make build-frontend    Compile frontend Next.js production build"
	@echo "  make test              Run backend unit test suites"
	@echo "  make test-backend      Run backend unit test suites"
	@echo "  make test-frontend     Run frontend TypeScript checks"
	@echo ""
	@echo "  --- Production & Standalone ---"
	@echo "  make start             Start production builds of backend and frontend concurrently"
	@echo "  make worker            Start standalone worker process (for multi-container scaling)"
	@echo ""
	@echo "  --- Infrastructure ---"
	@echo "  make up                Launch PostgreSQL and Redis containers with Docker Compose"
	@echo "  make down              Stop all running containers"
	@echo "  make clean             Remove compilation artifacts and caches"

# ==============================================================================
# INDIVIDUAL SERVICE & INSTALL COMMANDS (HMR & EMBEDDED WORKER BUILT-IN)
# ==============================================================================

# Install dependencies
install: install-backend install-frontend

install-backend:
	cd backend && npm install --legacy-peer-deps

install-frontend:
	cd frontend && npm install

# Start Backend (API + Embedded Playwright Worker with Webpack HMR)
backend: backend-api

backend-api:
	cd backend && npm run start:api

# Optional: Run standalone worker if EMBED_WORKER=false is desired
backend-worker:
	cd backend && npm run start:worker

worker: backend-worker

# Start Frontend (Next.js with Fast Refresh / HMR polling)
frontend:
	cd frontend && npm run dev

# ==============================================================================
# ALL-IN-ONE SINGLE START COMMANDS (CONCURRENT EXECUTION)
# ==============================================================================

# Start Backend (API + Worker) and Frontend together in a single command
dev:
	npx concurrently -k --prefix "[{name}]" -n "BACKEND,FRONTEND" -c "cyan.bold,green.bold" \
		"cd backend && npm run start:api" \
		"cd frontend && npm run dev"

# Start production builds of backend and frontend concurrently
start:
	npx concurrently -k --prefix "[{name}]" -n "BACKEND,FRONTEND" -c "blue.bold,green.bold" \
		"cd backend && npm run start:prod:api" \
		"cd frontend && npm run start"

# ==============================================================================
# BUILD, TEST & INFRASTRUCTURE
# ==============================================================================

build: build-backend build-frontend

build-backend:
	cd backend && npm run build

build-frontend:
	cd frontend && npm run build

test: test-backend

test-backend:
	cd backend && npm test

test-frontend:
	cd frontend && npx tsc --noEmit

up:
	docker compose -f .devcontainer/docker-compose.yml up -d

down:
	docker compose -f .devcontainer/docker-compose.yml down

clean:
	cd backend && rm -rf dist coverage .turbo
	cd frontend && rm -rf .next out

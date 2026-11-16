.PHONY: help install install-backend install-frontend backend backend-api backend-worker frontend build test test-backend clean up down

help:
	@echo "Available commands:"
	@echo "  make install           Install all dependencies (backend, frontend)"
	@echo "  make install-backend   Install unified NestJS backend dependencies"
	@echo "  make install-frontend  Install Next.js frontend dependencies"
	@echo "  make backend-api       Start the unified NestJS API process (port 8000)"
	@echo "  make backend-worker    Start the standalone Playwright BullMQ Worker process"
	@echo "  make frontend          Start the Next.js frontend dev server (port 3000)"
	@echo "  make build             Compile backend and frontend production builds"
	@echo "  make test              Run backend unit test suites"
	@echo "  make up                Launch all production services with Docker Compose"
	@echo "  make down              Stop all running containers"
	@echo "  make clean             Remove compilation artifacts and caches"

install: install-backend install-frontend

install-backend:
	cd backend && npm install --legacy-peer-deps

install-frontend:
	cd frontend && npm install

backend: backend-api

backend-api:
	cd backend && npm run start:api

backend-worker:
	cd backend && npm run start:worker

frontend:
	cd frontend && npm run dev

build:
	cd backend && npm run build
	cd frontend && npm run build

test: test-backend

test-backend:
	cd backend && npm test

up:
	docker compose -f .devcontainer/docker-compose.yml up -d

down:
	docker compose -f .devcontainer/docker-compose.yml down

clean:
	cd backend && rm -rf dist coverage .turbo
	cd frontend && rm -rf .next out

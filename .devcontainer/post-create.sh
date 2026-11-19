#!/usr/bin/env bash
set -e

echo "================================================================================"
echo "🚀 [DevContainer Setup] Initializing Single-Container Environment..."
echo "================================================================================"

WORKSPACE_ROOT="/workspaces/LowCodeAutomationTestingPlatform"
if [ -d "$WORKSPACE_ROOT" ]; then
  cd "$WORKSPACE_ROOT"
fi

# 1. Environment Configurations
echo "📋 [1/5] Verifying environment configurations..."
if [ ! -f .env ] && [ -f .env.example ]; then
  echo "   -> Creating .env from .env.example"
  cp .env.example .env
fi

if [ ! -f backend/.env ] && [ -f .env ]; then
  echo "   -> Linking backend/.env with root .env"
  cp .env backend/.env
fi

if [ ! -f frontend/.env.local ] && [ -f frontend/.env.example ]; then
  echo "   -> Creating frontend/.env.local from frontend/.env.example"
  cp frontend/.env.example frontend/.env.local
  sed -i 's/NODE_ENV=production/NODE_ENV=development/g' frontend/.env.local 2>/dev/null || true
fi

# 2. Storage & Report Directories
echo "📁 [2/5] Creating local storage directories..."
mkdir -p storage/screenshots storage/traces storage/logs storage/videos
mkdir -p backend/storage/screenshots backend/storage/traces backend/storage/logs
sudo chown -R TeamDolphin:TeamDolphin "$WORKSPACE_ROOT" 2>/dev/null || true

# 3. Start Local Redis & PostgreSQL Inside This Container
echo "⚡ [3/5] Starting local Redis and PostgreSQL inside container..."

# Start Redis
sudo service redis-server start >/dev/null 2>&1 || true
until redis-cli ping 2>/dev/null | grep -q "PONG"; do
  sleep 0.5
done
echo "   ✅ Redis is running locally on 127.0.0.1:6379."

# Start PostgreSQL
sudo service postgresql start >/dev/null 2>&1 || true
until pg_isready -h 127.0.0.1 -p 5432 -U postgres >/dev/null 2>&1 || [ "$i" -gt 10 ]; do
  sleep 0.5
done

# Ensure database and user credentials
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'automation_platform_db'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE automation_platform_db;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE automation_platform_db TO postgres;" 2>/dev/null || true
echo "   ✅ PostgreSQL is running locally on 127.0.0.1:5432."

# 4. Dependency Verification
echo "📦 [4/5] Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "   -> Installing root dependencies..."
  npm install --no-audit --no-fund || true
fi

if [ ! -d "backend/node_modules" ]; then
  echo "   -> Installing backend dependencies..."
  npm --prefix backend install --legacy-peer-deps --no-audit --no-fund || true
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "   -> Installing frontend dependencies..."
  npm --prefix frontend install --no-audit --no-fund || true
fi

# 5. Database Schema & Initial Seed
echo "🌱 [5/5] Running database seed (schema & initial admin)..."
npm --prefix backend run seed 2>/dev/null || echo "   (Seed already present or skipped)"

echo "================================================================================"
echo "✨ [DevContainer Setup] Single-container setup ready! (Redis, Postgres, Node, Playwright)"
echo "================================================================================"

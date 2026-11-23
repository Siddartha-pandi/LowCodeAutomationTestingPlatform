#!/usr/bin/env bash

# ==============================================================================
# Auto-Switch: If Docker App is running, stop it so Local Run gets ports 8000/3000
# ==============================================================================

if command -v docker >/dev/null 2>&1; then
  # 1. Detect if any Docker container is currently running backend or frontend
  RUNNING_APPS=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E '^(backend|frontend-app|dolphin-devcontainer-single|all-in-one)$' || true)

  if [ -n "$RUNNING_APPS" ]; then
    echo "⚠️  Detected Docker app containers actively running:"
    echo "   $RUNNING_APPS"
    echo "🛑 Automatically stopping Docker app containers to free ports 8000 & 3000 for your local run..."
    docker stop backend frontend-app dolphin-devcontainer-single all-in-one 2>/dev/null || true
    echo "✅ Docker app containers stopped."
  fi

  # 2. Keep PostgreSQL & Redis running in Docker so local backend can connect
  if [ -f docker-compose.yml ]; then
    echo "🐘 Ensuring PostgreSQL and Redis are running in background..."
    docker compose up -d postgres redis 2>/dev/null || true
  fi
fi

# 3. Double check and free ports 8000 and 3000 if held by any lingering process
if command -v fuser >/dev/null 2>&1; then
  fuser -k 8000/tcp 3000/tcp 2>/dev/null || true
elif command -v lsof >/dev/null 2>&1; then
  lsof -ti:8000,3000 2>/dev/null | xargs -r kill -9 2>/dev/null || true
fi

echo "🚀 Ready! Starting local frontend and backend..."

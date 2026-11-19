#!/usr/bin/env bash

# Ensure local services are running inside this single container
if ! redis-cli ping >/dev/null 2>&1; then
  sudo service redis-server start >/dev/null 2>&1 || true
fi

if ! pg_isready -h 127.0.0.1 -p 5432 -U postgres -d automation_platform_db >/dev/null 2>&1; then
  sudo service postgresql start >/dev/null 2>&1 || true
fi

# Print welcoming dashboard on container startup / terminal attachment
echo ""
echo "================================================================================"
echo "🐬 LowCode Automation Platform - Single Dev Container Active"
echo "================================================================================"
echo "  ⚡ Redis Server : 127.0.0.1:6379 (Internal)"
echo "  🐘 PostgreSQL   : postgresql://postgres:postgres@127.0.0.1:5432/automation_platform_db"
echo "  🔌 Backend API  : http://localhost:8000  (Docs: http://localhost:8000/api/docs)"
echo "  🌐 Frontend UI  : http://localhost:3000"
echo "--------------------------------------------------------------------------------"
echo "  💡 Available Commands:"
echo "     • npm run dev      -> Start BOTH Backend (:8000) & Frontend (:3000)"
echo "     • dev:api          -> Start Unified NestJS Backend only (:8000)"
echo "     • dev:frontend     -> Start Next.js Frontend only (:3000)"
echo "     • dev:worker       -> Start Standalone Playwright BullMQ Worker"
echo "     • dev:test         -> Run test suite"
echo "     • dev:seed         -> Run database seed"
echo "================================================================================"
echo ""

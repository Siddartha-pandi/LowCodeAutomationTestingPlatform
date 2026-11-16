#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "Initializing LowCode Automation Testing Platform Dev Setup"
echo "=========================================================="

# 1. Ensure storage directories exist
mkdir -p storage/screenshots storage/traces storage/dom storage/artifacts

# 2. Install backend dependencies
echo "Installing backend dependencies..."
npm --prefix backend install --legacy-peer-deps

# 3. Install frontend dependencies
echo "Installing frontend dependencies..."
npm --prefix frontend install

echo ""
echo "=========================================================="
echo "Dev Container environment initialized successfully!"
echo "PostgreSQL (5432) and Redis (6379) are running in background."
echo ""
echo "Quick start commands:"
echo "  Start API Server:     npm --prefix backend run start:api"
echo "  Start Playwright:     npm --prefix backend run start:worker"
echo "  Start Frontend:       npm --prefix frontend run dev"
echo "  Run Backend Tests:    npm --prefix backend test"
echo "=========================================================="

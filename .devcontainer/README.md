# VS Code & Codespaces Dev Container

This directory provides a pre-configured, production-identical development container for **LowCodeAutomationTestingPlatform**.

## Included Services & Stack

- **Container Environment**:
  - Base Image: `mcr.microsoft.com/playwright:v1.49.1-noble`
  - Node.js & npm pre-installed
  - Native Playwright browsers (Chromium, Firefox, WebKit) and all Linux display/sandbox libraries pre-baked
  - Shared memory (`shm_size: 2gb`) configured for stable headless browser execution
  - PostgreSQL client (`psql`), Redis CLI (`redis-cli`), `git`, `zsh`, `sudo`, `jq`
- **PostgreSQL 16**: Automatically spun up and health-checked on port `5432` (`POSTGRES_DB=automation_platform_db`).
- **Redis 7**: Automatically spun up and health-checked on port `6379`.
- **Pre-installed Extensions**:
  - Playwright Test runner
  - ESLint & Prettier
  - Jest Runner
  - PostgreSQL client & Database explorer
  - DotENV & YAML syntax highlighters

---

## How to Use

### 1. In VS Code
1. Install the **Dev Containers** extension (`ms-vscode-remote.remote-containers`) in VS Code.
2. Open this repository folder in VS Code.
3. Click the prompt **"Reopen in Container"** (or press `F1` and select `Dev Containers: Reopen in Container`).
4. The dev container will build, start PostgreSQL and Redis, and automatically run `post-create.sh` to install all dependencies.

### 2. In GitHub Codespaces
1. Click **Code** -> **Codespaces** -> **Create codespace on main**.
2. GitHub Codespaces will detect `.devcontainer/devcontainer.json` and initialize the full environment automatically.

---

## Common Development Commands inside Container

```bash
# Start API Server (Port 8000)
npm --prefix backend run start:api

# Start Playwright Background Worker
npm --prefix backend run start:worker

# Start Next.js Frontend (Port 3000)
npm --prefix frontend run dev

# Run all backend test suites
npm --prefix backend test

# Test database connection
psql $DATABASE_URL -c "\dt"

# Test Redis connection
redis-cli -h redis ping
```

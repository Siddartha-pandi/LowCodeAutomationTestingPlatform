# Dev Container & Docker Environment Guide

## 1. Overview
The platform utilizes a streamlined, containerized developer environment via **VS Code Dev Containers** / **GitHub Codespaces** located in [`.devcontainer/`](../../.devcontainer):

1. **`app`**: Development container running Ubuntu Noble with Node.js 20, native Playwright browser engines (Chromium, Firefox, WebKit), PostgreSQL client tools (`psql`), Redis CLI (`redis-cli`), `git`, `zsh`, and passwordless `sudo` access for `pwuser`.
2. **`postgres`**: PostgreSQL 16 Alpine relational database with persistent healthchecked storage on port `5432`.
3. **`redis`**: Redis 7 Alpine in-memory broker for BullMQ background execution queues on port `6379`.

---

## 2. Dev Container Quick Start

### In VS Code:
1. Ensure the **Dev Containers** extension (`ms-vscode-remote.remote-containers`) is installed in VS Code.
2. Open this project in VS Code.
3. Click the prompt **"Reopen in Container"** or press `F1` and select `Dev Containers: Reopen in Container`.
4. VS Code builds the image, starts PostgreSQL and Redis, and automatically executes `post-create.sh` to install dependencies and create local storage directories.

### In GitHub Codespaces:
1. Click **Code** -> **Codespaces** -> **Create codespace on main**.
2. GitHub automatically provisions the environment based on `.devcontainer/devcontainer.json`.

---

## 3. Running Services Inside Dev Container

```bash
# 1. Start Unified NestJS API Server (Port 8000)
npm --prefix backend run start:api

# 2. Start Standalone Playwright Execution Worker
npm --prefix backend run start:worker

# 3. Start Next.js Frontend (Port 3000)
npm --prefix frontend run dev

# 4. Run Backend Tests
npm --prefix backend test
```

---

## 4. Standalone Docker Compose (Outside VS Code)

If running without VS Code, you can launch the database and Redis services using the Dev Container compose file:

```bash
# Launch PostgreSQL and Redis
docker compose -f .devcontainer/docker-compose.yml up -d postgres redis

# Stop services
docker compose -f .devcontainer/docker-compose.yml down
```

# Local Development Setup Guide

## Prerequisites
- **Node.js**: v20 LTS or higher (`node -v`)
- **npm**: v10 or higher (`npm -v`)
- **Docker & Docker Compose**: (For running PostgreSQL 16 and Redis 7 locally)

---

## 1. Start Database & Message Broker

Launch PostgreSQL and Redis in the background:
```bash
docker compose up -d postgres redis
```

Verify services are healthy:
```bash
docker ps
```

---

## 2. Configure Environment

Copy the unified environment template:
```bash
cp .env.example .env
```

Ensure `DATABASE_URL` and `REDIS_HOST` point to your local services:
```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/automation_platform_db
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
JWT_SECRET=development-jwt-secret-key-at-least-32-chars-long
CREDENTIALS_MASTER_KEY=development-master-encryption-key-32chars
```

---

## 3. Install Dependencies & Playwright Browsers

### Backend:
```bash
cd backend
npm install --legacy-peer-deps
npx playwright install --with-deps chromium
```

### Frontend:
```bash
cd frontend
npm install
```

---

## 4. Run the Development Environment

You will run three terminal processes:

### Terminal 1: Unified NestJS API Server
```bash
cd backend
npm run start:api
```
- API starts at: `http://localhost:8000`
- Healthcheck: `http://localhost:8000/health`
- Interactive Swagger Documentation: `http://localhost:8000/api/docs`
- WebSocket Monitor: `ws://localhost:8000/ws/executions/:id`

### Terminal 2: Standalone Playwright Execution Worker
```bash
cd backend
npm run start:worker
```
- Listens to BullMQ queues: `browser-execution`, `test-suite-execution`, `maintenance`
- Launches Chromium browser instances in isolated contexts

### Terminal 3: Next.js Frontend
```bash
cd frontend
npm run dev
```
- Access UI at: `http://localhost:3000`

---

## 5. Run Tests

### Backend Unit & Entity Tests:
```bash
cd backend
npm test
```

### Typecheck Frontend:
```bash
cd frontend
npx tsc --noEmit
```

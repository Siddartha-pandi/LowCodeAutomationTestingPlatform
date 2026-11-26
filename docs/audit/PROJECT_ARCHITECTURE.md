# Project Architecture Map — LowCodeAutomationTestingPlatform

## 1. System Overview

LowCodeAutomationTestingPlatform is a monorepo containing a **Next.js 16 (App Router) + React 19** frontend and a **Unified NestJS 10 + Playwright + BullMQ** backend, backed by **PostgreSQL 16** (via TypeORM) and **Redis 7** (BullMQ job queues + Pub/Sub).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 Frontend (:3000)                      │
│  App Router • React 19 • @xyflow/react • Recharts • WebSocket Client    │
└───────────────────┬─────────────────────────────┬───────────────────────┘
                    │ REST (/api/v1/*)            │ WS (/ws/executions/:id)
                    ▼                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Unified NestJS Backend (:8000)                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ HTTP Controllers + JwtAuthGuard + RbacGuard + ValidationPipe      │  │
│  │ MonitoringGateway (ws adapter)                                    │  │
│  └───────────────┬───────────────────────────────────┬───────────────┘  │
│                  │ Enqueue / Cancel / Status         │ Publish Events   │
│                  ▼                                   ▼                  │
│  ┌──────────────────────────┐        ┌───────────────────────────────┐  │
│  │ BullMQ Queues (Redis)    │        │ EventPublisherService         │  │
│  │ - browser-execution      │        │ (In-memory + Redis Pub/Sub)   │  │
│  │ - test-suite-execution   │        └───────────────────────────────┘  │
│  │ - maintenance            │                                           │
│  └───────────────┬──────────┘                                           │
│                  │ Embedded (EMBED_WORKER !== 'false') or Standalone    │
│                  ▼                                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ WorkersModule (ExecutionWorker, SuiteWorker)                      │  │
│  │ FlowExecutorService -> ActionExecutor / AssertionExecutor         │  │
│  │ BrowserManagerService -> ContextManager -> PageManager (Playwright)│ │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────────────┬─────────────────────────────┬───────────────────────┘
                    │ TypeORM                     │ Local FS (STORAGE_DIR)
                    ▼                             ▼
          PostgreSQL 16                   ./storage/{screenshots,traces,
                                                     logs,videos}
```

## 2. Repository Structure

- `frontend/` — Next.js 16 App Router application (`src/app/`, `src/components/`, `src/context/`, `src/api.ts`)
- `backend/` — NestJS 10 API + Worker (`src/main.ts`, `src/worker.ts`, `src/app.module.ts`, `src/worker.module.ts`)
  - `src/common/` — Guards (`JwtAuthGuard`, `RbacGuard`, `InternalAuthGuard`), Decorators (`@Public`, `@CurrentUser`, `@RequirePermissions`), Filters, Interceptors, `AppWsAdapter`
  - `src/config/` — `configuration.ts`, `env.validation.ts`
  - `src/contracts/` — Zod schemas (`execution.contract.ts`) and event enums (`events.contract.ts`)
  - `src/database/` — `database.module.ts`, 21 TypeORM entities (`src/database/entities/`), `seed.ts` (no migrations directory)
  - `src/queue/` — `QueueModule`, `QueueService` (BullMQ + ioredis)
  - `src/workers/` — `WorkersModule`, `ExecutionWorker`, `SuiteWorker`
  - `src/modules/` — 19 feature modules (`auth`, `users`, `roles`, `projects`, `environments`, `credentials`, `browser`, `selectors`, `actions`, `assertions`, `screenshots`, `monitoring`, `change-detection`, `flows`, `test-cases`, `test-suites`, `executions`, `reports`, `artifacts`, `audit`, `scheduling`, plus dead `execution/` module)
- `.devcontainer/` — `devcontainer.json`, `docker-compose.yml` (`app` + `redis`), `Dockerfile` (Ubuntu 22.04 + Node 22 + PG + Redis + Playwright)
- `scripts/prepare-dev.sh`, `Makefile`, `package.json`

## 3. Frontend Architecture

- **Routing:** App Router split into `(public)` (`/`, `/login`, `/register`, `/reset-password`) and `(authenticated)` (`/app`, `/dashboard`, `/flows`).
- **Workspace Shell:** `AuthenticatedWorkspace.tsx` + `AppShell.tsx` render a multi-view SPA inside `(authenticated)` with `AppContext` and `AuthContext`.
- **API Client (`src/api.ts`):** Fetch wrapper using `NEXT_PUBLIC_API_URL` (and Next.js `rewrites()` proxying `/api/:path*`), reading `auth_token` from `localStorage` and attaching `Authorization: Bearer`.
- **Visual Flow Builder:** Built with `@xyflow/react` (`VisualFlowBuilder.tsx`, `FlowLiveRunnerPage.tsx`, `VisualTestBuilder.tsx`).

## 4. Backend & Execution Lifecycle

1. **Trigger:** User calls `POST /api/v1/flows/:id/execute`, `POST /api/v1/tests/:id/execute`, or `POST /api/v1/test-suites/:id/execute`, or `ScheduleRunnerService` (`@Cron(EVERY_MINUTE)`) triggers due schedules.
2. **Persistence & Enqueue:** Service creates an `ExecutionEntity` (`status: 'queued'`) and enqueues a job in BullMQ (`browser-execution` or `test-suite-execution`) with `jobId: exec-<executionId>`.
3. **Worker Execution:** `ExecutionWorker` picks up the job, updates status to `running`, launches/reuses a Playwright `Browser` via `BrowserManagerService`, creates an isolated `BrowserContext` via `ContextManagerService`, and creates a `Page` via `PageManagerService`.
4. **Graph Execution:** `FlowExecutorService` validates the graph, topologically sorts nodes, interpolates `{{variables}}`, and runs `ActionExecutorService` / `AssertionExecutorService` per node, publishing events via `EventPublisherService` (in-memory + Redis Pub/Sub).
5. **Monitoring:** `MonitoringGateway` (`@WebSocketGateway({ path: '/ws/executions' })`) streams events to connected WebSocket clients.
6. **Finalization:** Worker persists `ExecutionStepEntity`, `ExecutionLogEntity`, `ArtifactEntity` (traces/screenshots), updates `ExecutionEntity` status, and closes the `BrowserContext`.

## 5. Identified Module & Structural Anomalies

- **Dead Duplicate Module:** `backend/src/modules/execution/` (`ExecutionModule`, `ExecutionController`, `ExecutionService`) duplicates `ExecutionsModule`'s `/health` and `/internal/v1/*` routes and is not imported in `AppModule`.
- **Re-export Shim:** `backend/src/modules/queue/queue.module.ts` is a 1-line re-export of `../../queue/queue.module`.
- **Circular `forwardRef` Usage:** `AppModule` wraps 22 module imports in `forwardRef(() => ...)`.
- **Missing Migrations:** `backend/src/database/` has no `migrations/` directory; schema relies on `DB_SYNCHRONIZE`.

# Technical Audit Report — LowCodeAutomationTestingPlatform

## 1. Overall Assessment

The repository implements a substantial, well-structured foundation for a deterministic low-code browser automation platform (NestJS 10 + TypeORM + BullMQ + Playwright + Next.js 16 + React Flow). Existing backend unit tests (13 suites, 53 tests) and TypeScript typechecks (`backend` and `frontend`) pass.

However, deep code inspection uncovered **multiple critical and high-severity defects** across authorization, controller-to-JWT identity mapping, SSRF protection, workflow execution, cancellation, configuration keys, and frontend token handling.

---

## 2. Prioritized Issue List

| ID | Severity | Component | File / Module | Problem & Evidence | Impact |
|---|---|---|---|---|---|
| **AUD-001** | **CRITICAL** | Auth / Controllers | 9 controllers (`executions`, `artifacts`, `test-cases`, `test-suites`, `browser`, `recorder`, `dom`, `elements`, `healing`, `schedules`, `audit`) | Controllers read `user.userId` (54 call sites), but `JwtStrategy.validate()` returns `{ id: user.id, ... }`. `user.userId` is `undefined` at runtime! | Project isolation & ownership checks receive `undefined`; `ProjectsService.listProjects(undefined)` in TypeORM drops `ownerId` filter or misbehaves, breaking multi-tenant isolation and causing `ExecutionEntity.triggeredBy` / `createdBy` to be `undefined`. |
| **AUD-002** | **CRITICAL** | RBAC / Audit | `backend/src/modules/audit/audit.controller.ts` | `AuditController` uses `@UseGuards(JwtAuthGuard)` without `RbacGuard` or `@RequirePermissions`. | Any authenticated user can read all audit logs, export them, and trigger `POST /api/v1/audit/retention/purge` to delete logs and artifacts platform-wide. |
| **AUD-003** | **CRITICAL** | Authorization | `backend/src/modules/scheduling/schedules.controller.ts`, `schedules.service.ts` | `listSchedules`, `getSchedule`, `updateSchedule`, `deleteSchedule`, `evaluateNow` do not verify project access or user ownership. | Any authenticated user can view, modify, delete, or trigger any project's schedules. |
| **AUD-004** | **CRITICAL** | Authorization | `backend/src/modules/reports/reports.controller.ts`, `reports.service.ts` | `getSummary(projectId)` and `exportCsv(projectId)` do not verify project access. | Any authenticated user can read/export execution reports for any project. |
| **AUD-005** | **CRITICAL** | Browser SSRF | `backend/src/modules/browser/interactive-session.service.ts` | `launchSession` defaults `allowedDomains` to `['*']`, and line 101 `if (isAllowed \|\| route.request().resourceType() === 'document')` **always allows top-level/iframe document navigation** regardless of allowlist. No private IP / localhost / metadata / scheme blocking. | Full SSRF: authenticated users can navigate Playwright to `http://169.254.169.254/`, `http://127.0.0.1:*`, `http://10.0.0.0/8`, or `file:///etc/passwd`. |
| **AUD-006** | **CRITICAL** | Browser SSRF | `backend/src/modules/browser/page-manager.service.ts`, `actions/action-executor.service.ts` | `PageManagerService` only blocks `169.254.*` and `metadata.google*`; does not block RFC1918 (`10/8`, `172.16/12`, `192.168/16`), loopback (`127/8`, `::1`), link-local (`fe80::/10`), ULA (`fc00::/7`), or `file://` / `javascript:` schemes. | Worker executions can access internal network services, Redis/Postgres ports, or local files when `ALLOWED_DOMAINS` includes `*` or is misconfigured. |
| **AUD-007** | **CRITICAL** | WebSocket Auth | `backend/src/modules/monitoring/monitoring.gateway.ts` | Lines 79-96: When `NODE_ENV === 'development'`, unauthenticated WS connections are accepted as `{ sub: 'dev-user' }`. Also `payload.is_superuser` is read from JWT even though `AuthService.generateToken()` does not include `is_superuser` in JWT claims. | Unauthenticated WS access in dev mode; superusers denied WS access to non-owned projects. |
| **AUD-008** | **HIGH** | Path Traversal | `backend/src/modules/artifacts/artifacts.service.ts` | Line 75: `if (relative.startsWith('..') && !path.isAbsolute(artifact.filePath))` — skips path traversal check whenever `artifact.filePath` is absolute! | Arbitrary file read if an `ArtifactEntity.filePath` ever points outside `storageDir`. |
| **AUD-009** | **HIGH** | Config Bug | `backend/src/modules/artifacts/artifacts.service.ts`, `backend/src/workers/execution.worker.ts` | Both read `configService.get<string>('app.storage.dir')`, but `configuration.ts` defines `app.storageDir`. | `STORAGE_DIR` env var is silently ignored; always falls back to relative `'storage'`. |
| **AUD-010** | **HIGH** | Auth / Reset Token | `backend/src/modules/auth/auth.service.ts` | `forgotPassword` stores `resetPasswordToken` in plaintext in DB and logs the raw `resetUrl` containing the token. | Anyone with DB read access or log access can hijack password resets. |
| **AUD-011** | **HIGH** | Workflow Engine | `backend/src/modules/flows/flow-executor.service.ts` | 1) `topologicalSort` falls back to `graph.nodes` on cycles instead of rejecting cyclic graphs. 2) `condition`/`if_else` nodes set a variable but still execute ALL downstream branches. 3) `state.cancelled` is never checked against Redis during execution. | Cyclic graphs execute unpredictably; conditional branching executes both true and false paths; cancelling a running execution does not stop it. |
| **AUD-012** | **HIGH** | Frontend Auth | `frontend/src/api.ts`, `frontend/src/context/AuthContext.tsx` | `fetch()` omits `credentials: 'include'`, relies on `localStorage.getItem('auth_token')`, `logout()` does not call `/api/v1/auth/logout`, and `useEffect` never validates stored session with `/api/v1/auth/me`. | HttpOnly cookie is never sent by browser; XSS can steal JWT from `localStorage`; stale sessions persist until 401. |
| **AUD-013** | **MEDIUM** | Performance / WS | `backend/src/modules/monitoring/monitoring.gateway.ts` | Creates a dedicated `new Redis(...)` subscriber connection per WebSocket client. | Redis connection exhaustion under concurrent monitoring clients. |
| **AUD-014** | **MEDIUM** | Database | `backend/src/database/` | Zero TypeORM migrations exist; `.devcontainer/docker-compose.yml` sets `DB_SYNCHRONIZE: "true"`. | Unsafe schema evolution for production deployments. |
| **AUD-015** | **MEDIUM** | Infra / Docker | `backend/Dockerfile`, `frontend/Dockerfile`, `Makefile`, `scripts/prepare-dev.sh`, `frontend/next.config.mjs` | `backend/Dockerfile` and `frontend/Dockerfile` are incomplete stubs; `Makefile` and `prepare-dev.sh` reference non-existent root `docker-compose.yml`; `next.config.mjs` hardcodes `poll: 1000` regardless of `WATCHPACK_POLLING`. | Production Docker builds fail; high CPU in frontend dev mode; broken `make up`. |
| **AUD-016** | **LOW** | Dead Code | `backend/src/modules/execution/`, `backend/src/modules/queue/queue.module.ts` | Unused `ExecutionModule` and 1-line `modules/queue/queue.module.ts` shim. | Confusing module boundaries. |

---

## 3. Architectural Strengths

- Clean NestJS modular separation with Zod contracts (`src/contracts/`) and `class-validator` DTOs.
- AES-256-GCM authenticated encryption in `CryptoVaultService` with 96-bit random IV and 16-byte auth tag.
- Deterministic selector priority hierarchy (`test_id` -> `role` -> `label` -> `placeholder` -> `text` -> `css`/`xpath`) with strict ambiguity checks.
- BullMQ job idempotency via `jobId: exec-${execution_id}` and `attempts: 1` for non-idempotent browser actions.
- Comprehensive TypeORM entity model with SHA-256 integrity hashing on artifacts.

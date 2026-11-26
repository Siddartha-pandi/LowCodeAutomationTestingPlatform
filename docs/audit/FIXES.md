# Fixes & Remediation Log — LowCodeAutomationTestingPlatform

## Phase 1 & Phase 2 Verified Changes

1. **SSRF & Browser Network Security (`P0-1`, `P0-2`, `P0-3`, `AUD-005`, `AUD-006`):**
   - Updated `backend/src/common/security/url-security.ts` to decouple domain allowlisting from private IP/DNS checks, resolve both A and AAAA records (failing closed on resolution errors), block `ALLOW_LOCALHOST_AUTOMATION` when `NODE_ENV=production`, and provide shared `attachPageSecurityPolicies()`.
   - Updated `PageManagerService`, `InteractiveSessionService` (`launchSession`, `navigateSession`, `startRecorder`, `recordAction`, `exploreDom`), and `ActionExecutorService` (`navigate` post-redirect check + `api_request`).
   - Added unit tests in `backend/src/common/security/url-security.spec.ts` and `backend/src/modules/browser/selector-validation.spec.ts`.

2. **Secret Management (`P0-4`, `AUD-009`):**
   - Updated `backend/src/config/env.validation.ts` and `backend/src/config/configuration.ts` (ephemeral CSPRNG dev fallbacks; strict production rejection of weak/placeholder secrets, `ALLOW_LOCALHOST_AUTOMATION=true`, and `DB_SYNCHRONIZE=true`).
   - Wired `validate: validateEnvironment` into `AppModule` and `WorkerModule`.
   - Removed hardcoded fallback literals from `jwt.strategy.ts`, `auth.module.ts`, `crypto-vault.service.ts`, `.env.example`, and `.devcontainer/docker-compose.yml`.

3. **Authentication, CSRF, CORS (`P1-1`, `AUD-010`, `AUD-012`):**
   - Added `backend/src/common/security/csrf.middleware.ts` (`csrf.middleware.spec.ts`) and registered it in `AppModule`.
   - Updated `AuthController` to set `access_token` (`HttpOnly`) + `csrf_token` cookies with `path: '/'` and config-driven expiry, and clear both on logout.
   - Updated `AuthService` to SHA-256 hash password reset tokens and include `is_superuser` in JWT claims.
   - Hardened CORS in `main.ts` and exception sanitization in `http-exception.filter.ts`.
   - Migrated `frontend/src/api.ts`, `frontend/src/context/AuthContext.tsx`, `FlowLiveRunnerPage.tsx`, and `ExecutionDetailsPage.tsx` away from `localStorage` JWTs to cookie-based auth + `X-CSRF-Token`.

4. **Authorization & Multi-Tenant Isolation (`P1-2`, `AUD-001`–`AUD-004`):**
   - Standardized all controllers to `user.id` (including `RecorderController.getStatus`).
   - Enforced project access in `ProjectsService` (`verifyProjectAdmin`), `InteractiveSessionService`, `HealingService`/`HealingController`, `SchedulesService`/`SchedulesController`, `ReportsService`/`ReportsController`, `AuditController`, `ElementsController`/`ElementsService`, `FlowsService`, and `TestCasesService`.
   - Added tests in `backend/src/modules/projects/authorization.spec.ts`.

5. **Execution Engine Reliability (`P1-3`, `AUD-011`):**
   - Created `backend/src/modules/executions/execution-state.ts` (`execution-state.spec.ts`).
   - Eliminated double execution in `FlowsService.executeFlow()`, added `QueueService.isQueueHealthy()`, enforced execution/step timeouts, cycle rejection, conditional branching, cancellation mid-retry, and `SuiteWorker` cancel preservation.

6. **Database Migrations (`P1-4`, `AUD-014`):**
   - Created `backend/src/database/data-source.ts`, `backend/src/database/migrations/1732600000000-InitialSchema.ts`, disabled `synchronize` in `production` in `database.module.ts`, and added `migration:*` scripts to `backend/package.json`.

7. **Production Docker & DevContainer (`P1-5`, `P2-2`, `AUD-015`):**
   - Implemented multi-stage `backend/Dockerfile`, `frontend/Dockerfile`, `.dockerignore` files, and `docker-compose.prod.yml`.
   - Fixed unconditional `WATCHPACK_POLLING=true` in `frontend/package.json`, `next.config.mjs`, and `backend/webpack-hmr.config.js`.

8. **WebSocket & Artifact Security (`P1-6`, `P2-1`, `AUD-007`, `AUD-008`, `AUD-013`):**
   - Replaced per-client Redis connections with shared `EventPublisherService.subscribeRemote()`, added event deduplication and sensitive payload redaction (`monitoring.gateway.spec.ts`).
   - Added `realpathSync` symlink checks in `ArtifactsService` and `ExecutionsService.getExecutionViewportPath`, and active-execution-safe `AuditService.purgeRetention` (`artifacts.service.spec.ts`).

# Phase 2 Remediation Plan — LowCodeAutomationTestingPlatform

## 1. Phase 0 Repository Baseline

- **Branch:** `playwright-dev` (clean working tree at Phase 2 start; previous V2 audit & fixes committed/present)
- **Existing Audit Docs:** `PROJECT_ARCHITECTURE.md`, `TECHNICAL_AUDIT_REPORT.md`, `SECURITY_AUDIT.md`, `IMPLEMENTATION_STATUS.md`, `FIXES.md`, `TESTING_REPORT.md`, `PRODUCTION_READINESS.md`
- **Test Baseline:** Backend Jest (14 suites, 60 tests passing), Backend `tsc --noEmit` & `nest build` passing, Frontend `tsc --noEmit` & `next build` passing.
- **Key Baseline Modules Inspected:**
  - `backend/src/common/security/url-security.ts` (V2 SSRF utility)
  - `backend/src/modules/browser/{interactive-session,page-manager,context-manager,browser-manager}.service.ts`
  - `backend/src/modules/actions/action-executor.service.ts`
  - `backend/src/config/{configuration,env.validation}.ts`, `.env.example`, `.devcontainer/docker-compose.yml`
  - `backend/src/modules/auth/*`, `frontend/src/api.ts`, `frontend/src/context/AuthContext.tsx`
  - `backend/src/modules/flows/flows.service.ts`, `flow-executor.service.ts`, `backend/src/workers/execution.worker.ts`
  - `backend/src/modules/monitoring/{monitoring.gateway,event-publisher.service}.ts`
  - `backend/src/modules/artifacts/artifacts.service.ts`, `backend/src/modules/audit/audit.service.ts`
  - `backend/src/database/database.module.ts`, `backend/src/database/seed.ts`

## 2. Newly Identified & Remaining P0/P1/P2 Defects

| ID | Priority | Area | Finding |
|---|---|---|---|
| **P0-1** | P0 | SSRF / Allowlist Bypass | `url-security.ts` treats any `explicitlyAllowlisted` domain as `allowLocalhost = true`, skipping `isRestrictedIp()` and DNS validation. Allowlisted domains resolving to private IPs bypass SSRF checks. |
| **P0-2** | P0 | SSRF / Unprotected Entry Points | `InteractiveSessionService.startRecorder()`, `exploreDom()`, and `recordAction()` (`navigate`) create contexts/pages or call `page.goto()` without `page.route()` SSRF interception or `validateNavigationUrl()`. No post-redirect URL validation on `navigateSession`, `ActionExecutorService.navigate`, or `PageManagerService` redirects. |
| **P0-3** | P0 | SSRF / Dev Bypass | `ALLOW_LOCALHOST_AUTOMATION` has no guard preventing activation in `NODE_ENV=production`. |
| **P0-4** | P0 | Secrets & Config Validation | `validateEnvironment` in `env.validation.ts` is never passed to `ConfigModule.forRoot({ validate })` in `AppModule` or `WorkerModule`. Hardcoded fallback secrets exist in `configuration.ts`, `jwt.strategy.ts`, `auth.module.ts`, `crypto-vault.service.ts`, `.env.example`, and `.devcontainer/docker-compose.yml`. |
| **P1-1** | P1 | Auth / CSRF / CORS | Frontend still sends `localStorage` `auth_token` alongside `HttpOnly` cookie; backend lacks CSRF origin/header validation for cookie-authenticated mutations; `main.ts` CORS unconditionally allows all `localhost`/`127.0.0.1` origins even in production. |
| **P1-2** | P1 | Authorization & Isolation | `RecorderController.getStatus` still reads `user?.userId`; `InteractiveSessionService.getRecorderStatus` & `exploreDom` leak/reuse sessions across users; `launchSession`/`saveRecording`/`exploreDom` skip `ProjectsService.verifyProjectAccess`; `HealingController`/`HealingService` lack project isolation; `ElementsService.createElementProfile` omits `isSuperuser`; `FlowsService.executeFlow` & `TestCasesService.executeTestCase` do not verify `environment_id` belongs to the project. |
| **P1-3** | P1 | Execution Reliability | `FlowsService.executeFlow()` launches BOTH in-process `runBackgroundExecution()` AND `queueService.addExecutionJob()` for the same execution (double execution!). `runBackgroundExecution` uses `app.storage.dir`, lacks `isCancelled`, and lacks execution timeout. `ExecutionState` transitions (`queued -> running -> passed/failed/cancelled/timed_out`) are not enforced atomically. |
| **P1-4** | P1 | Database Migrations | No TypeORM `DataSource` config or initial schema migration exists; `DB_SYNCHRONIZE` defaults to `true` outside `production`. |
| **P1-5** | P1 | Production Docker | `backend/Dockerfile` and `frontend/Dockerfile` are non-functional stubs; no production `docker-compose.prod.yml` or isolated `worker` service definition. |
| **P1-6** | P1 | WebSocket / Redis | `MonitoringGateway` creates 1 Redis TCP connection per WS client instead of a shared pub/sub subscriber manager; `event-publisher.service.ts` `sequences` map grows unbounded; WS disconnect/cleanup and error handling need hardening. |
| **P2-1** | P2 | Artifact Security | `ArtifactsService.getSafeArtifactFile` does not resolve `fs.realpathSync` to prevent symlink escape; `AuditService.purgeRetention` deletes `ArtifactEntity` rows without unlinking underlying files or skipping active executions; `ExecutionsService.getExecutionViewportPath` does not validate path against `storageDir`. |
| **P2-2** | P2 | Dev Container Perf | `.devcontainer/docker-compose.yml` mounts workspace without named volume caching for `node_modules`/`.next`; backend watch & frontend HMR config can be optimized for WSL2. |

## 3. Execution Batches

1. **Batch 1:** SSRF & URL Security (`url-security.ts`, `InteractiveSessionService`, `PageManagerService`, `ActionExecutorService`, `env.validation.ts` prod bypass block) + Secret Management (`AppModule`/`WorkerModule` validation, `.env.example`, `.devcontainer/docker-compose.yml`, `SECRET_MANAGEMENT.md`).
2. **Batch 2:** Authentication Standardization, CSRF protection, CORS hardening (`AUTHENTICATION.md`).
3. **Batch 3:** Authorization & Multi-Tenant Isolation (`RecorderController`, `InteractiveSessionService`, `HealingController`/`Service`, `ElementsService`, `FlowsService`, `TestCasesService`, `AUTHORIZATION.md`).
4. **Batch 4:** Execution Engine Reliability (`FlowsService` double-exec fix, state machine, timeouts, cancellation, retries, cleanup, `EXECUTION_RELIABILITY.md`).
5. **Batch 5:** Database Migrations (`data-source.ts`, initial migration, `MIGRATIONS.md`).
6. **Batch 6:** Production Docker Infrastructure (`backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.prod.yml`, `DOCKER_DEPLOYMENT.md`).
7. **Batch 7:** WebSocket & Redis Reliability (shared Redis pub/sub manager, cleanup, `WEBSOCKET_RELIABILITY.md`).
8. **Batch 8:** Artifact & Storage Security (symlink-safe `realpathSync`, viewport path check, safe retention purge, `ARTIFACT_SECURITY.md`).
9. **Batch 9:** Dev Container & WSL2 Performance (`DEV_CONTAINER_OPTIMIZATION.md`).
10. **Batch 10:** Audit Documentation Reconciliation & `PHASE_2_FINAL_REPORT.md` + Full Verification.

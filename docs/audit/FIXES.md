# Fixes & Remediation Log — LowCodeAutomationTestingPlatform

This document tracks all defects fixed during the technical audit, files modified, tests added, and verification results.

## Completed & Verified Fixes

1. **AUD-001 (CRITICAL):** Fixed `user.userId` -> `user.id` across all 11 controllers (`elements`, `healing`, `artifacts`, `schedules`, `test-suites`, `executions`, `test-cases`, `browser`, `recorder`, `dom`, `audit`).
2. **AUD-002 (CRITICAL):** Added `RbacGuard` and `@RequirePermissions('users:manage')` to `AuditController`.
3. **AUD-003 (CRITICAL):** Enforced project-level authorization in `SchedulesController` & `SchedulesService` (`createSchedule`, `listSchedules`, `getSchedule`, `updateSchedule`, `deleteSchedule`) and guarded `evaluateNow` with `RbacGuard` + `@RequirePermissions('users:manage')`.
4. **AUD-004 (CRITICAL):** Imported `ProjectsModule` into `ReportsModule` and enforced project-level authorization in `ReportsController` & `ReportsService` (`getSummary`, `exportCsv`).
5. **AUD-005 / AUD-006 (CRITICAL):** Created `backend/src/common/security/url-security.ts` + `url-security.spec.ts` blocking non-HTTP(S) schemes, cloud metadata (`169.254.169.254`, `metadata.google*`), private RFC1918, loopback, link-local, and IPv6 ULA/loopback IPs (with DNS resolution check). Enforced in `PageManagerService`, `InteractiveSessionService` (removed `resourceType() === 'document'` bypass), and `ActionExecutorService.navigate`.
6. **AUD-007 (CRITICAL):** Removed unauthenticated `NODE_ENV === 'development'` bypass in `MonitoringGateway` and included `is_superuser` in `AuthService.generateToken()` JWT claims.
7. **AUD-008 / AUD-009 (HIGH):** Fixed `ArtifactsService` path traversal check (rejecting any path outside `storageDir` regardless of `path.isAbsolute`) and fixed `app.storageDir` config key lookup in `ArtifactsService` and `ExecutionWorker`.
8. **AUD-010 (HIGH):** Hashed `resetPasswordToken` with SHA-256 in `AuthService` (`forgotPassword` / `resetPassword`) and removed raw `resetUrl` token logging.
9. **AUD-011 (HIGH):** Updated `FlowExecutorService` to reject cyclic graphs in `validateGraph` / `topologicalSort`, skip unchosen conditional branches (`true`/`false` handles), and check live cancellation via `isCancelled` wired to `QueueService.isExecutionCancelled()` in `ExecutionWorker`.
10. **AUD-012 (HIGH):** Updated `frontend/src/api.ts` (`credentials: 'include'`, `authApi.logout`) and `frontend/src/context/AuthContext.tsx` (call `/api/v1/auth/logout`, verify session via `authApi.me()`).
11. **AUD-015 (MEDIUM):** Updated `frontend/next.config.mjs` to only enable `poll: 1000` when `WATCHPACK_POLLING === 'true'`.

## Remaining Risks & Next Steps
- **AUD-013:** `MonitoringGateway` still opens one Redis subscriber per WS client (recommend shared subscriber manager).
- **AUD-014:** TypeORM migrations are still absent (`DB_SYNCHRONIZE` used in dev).
- **AUD-015 (Dockerfiles):** `backend/Dockerfile`, `frontend/Dockerfile`, and root `docker-compose.yml` still need production multi-stage definitions.
- **AUD-016:** Dead `backend/src/modules/execution/` module and `backend/src/modules/queue/queue.module.ts` shim can be removed.

# Security Audit Report — LowCodeAutomationTestingPlatform

## 1. Authentication & Session Management

- **Password Hashing:** `PasswordService` uses `bcrypt` with 12 salt rounds (`backend/src/modules/auth/password.service.ts`). Strong.
- **JWT Validation:** `JwtStrategy` extracts JWT from `Authorization: Bearer` header or `access_token` cookie (`backend/src/modules/auth/jwt.strategy.ts`), verifies signature and expiration, and reloads user + roles from PostgreSQL.
- **Findings:**
  - **[HIGH] Plaintext Reset Token & Log Exposure (`auth.service.ts`):** `forgotPassword()` stores raw `resetPasswordToken` in `users` table and logs the full `resetUrl` with token to stdout. **Remediation:** Hash reset token with SHA-256 before storing/querying and redact token from logs.
  - **[HIGH] Frontend Token Storage (`frontend/src/api.ts`, `AuthContext.tsx`):** Frontend stores JWT in `localStorage` and omits `credentials: 'include'` on `fetch()`, preventing HttpOnly cookie usage. **Remediation:** Add `credentials: 'include'` to `fetch()`, call `POST /api/v1/auth/logout` on logout, and validate session via `/api/v1/auth/me`.
  - **[MEDIUM] Hardcoded Dev Secrets in `.devcontainer/docker-compose.yml`:** Static `JWT_SECRET`, `CREDENTIALS_MASTER_KEY`, `INTERNAL_SERVICE_KEY`, and `ADMIN_PASSWORD` committed in compose file (though `env.validation.ts` blocks default secrets in `NODE_ENV=production`).

## 2. Authorization, RBAC & Multi-Tenant Isolation

- **[CRITICAL] `user.userId` Undefined Bug (9 Controllers, 54 Call Sites):** `JwtStrategy.validate()` returns `{ id: user.id, ... }`, but controllers pass `user.userId` (`undefined`) to services. This breaks ownership attribution and multi-tenant project isolation in `ProjectsService` when `isSuperuser` is `false`.
- **[CRITICAL] Missing RBAC on `AuditController`:** `GET /api/v1/audit`, `GET /api/v1/audit/export`, and `POST /api/v1/audit/retention/purge` only check `JwtAuthGuard`, allowing any authenticated user to read audit logs and purge platform data.
- **[CRITICAL] Missing Project Access Checks on `SchedulesController` & `ReportsController`:** Any authenticated user can list/get/update/delete any project's schedules and view/export any project's execution reports.
- **[MEDIUM] Missing `RbacGuard` on Feature Controllers:** Only `UsersController` uses `RbacGuard`. Other controllers rely solely on project membership without checking role permissions.

## 3. Browser Automation & SSRF Security

- **[CRITICAL] `InteractiveSessionService` SSRF Bypass (`interactive-session.service.ts`):**
  - `allowedDomains` defaults to `['*']`.
  - Line 101: `if (isAllowed || route.request().resourceType() === 'document')` bypasses domain allowlists for all document navigations.
  - No scheme validation (`file://`, `ftp://`, `javascript:`), no private/loopback/link-local/metadata IP blocking, and no DNS-resolution IP check.
- **[CRITICAL] `PageManagerService` & `ActionExecutorService` Incomplete SSRF Protection:**
  - `PageManagerService` only blocks `169.254.*` and `metadata.google*`. It does not block `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `0.0.0.0`, `::1`, `fc00::/7`, `fe80::/10`, or non-HTTP(S) schemes.
  - **Remediation:** Introduce a shared `UrlSecurityService` / helper that validates URL schemes (`http:`/`https:` only), resolves DNS (`dns.lookup` all), and blocks loopback, private RFC1918, link-local, CGNAT, and cloud metadata IPs at both navigation and Playwright route interception layers (with configurable opt-in for explicit `ALLOW_LOCALHOST_AUTOMATION=true` in local dev only).

## 4. Credential Vault

- `CryptoVaultService` uses `aes-256-gcm` with 12-byte random IV and 16-byte auth tag, deriving a 256-bit key via SHA-256 from `APP_ENCRYPTION_KEY`.
- `CredentialsService` masks `secret_value` as `'********'` in all API responses and enforces `verifyProjectAccess`.
- **Gap:** No key rotation/versioning prefix on ciphertext; no automatic secret redaction in execution logs/errors if a credential value is interpolated into a failed step.

## 5. WebSocket & Artifact Security

- **[CRITICAL] `MonitoringGateway` Dev Auth Bypass & Superuser Claim Mismatch (`monitoring.gateway.ts`):**
  - Unauthenticated WS connections allowed when `NODE_ENV === 'development'`.
  - Reads `payload.is_superuser`, which is not present in JWTs signed by `AuthService.generateToken()`.
- **[HIGH] `ArtifactsService` Path Traversal Bypass (`artifacts.service.ts`):**
  - Line 75 skips path traversal rejection when `artifact.filePath` is absolute (`!path.isAbsolute(artifact.filePath)`), and uses wrong config key `'app.storage.dir'`.

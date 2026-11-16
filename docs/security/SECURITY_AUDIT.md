# Security Audit & Compliance Report

## Overview
This security audit verifies that the **Unified NestJS Backend** satisfies all enterprise security policies, eliminates legacy vulnerabilities, enforces strict RBAC/tenant isolation, and adheres strictly to the **Zero-AI / Company Data Protection Guarantee**.

---

## 1. Authentication & Session Security

### Findings & Implementation
- **JWT Authentication**: Authenticates requests using JSON Web Tokens signed with HMAC-SHA256. Tokens have configurable expiration (`TOKEN_EXPIRY_MINUTES`).
- **Global & Route Protection**: Protected routes enforce `JwtAuthGuard`. The `@Public()` decorator is strictly restricted to public onboarding routes (`/api/v1/auth/login`, `/api/v1/auth/register`, `/health`).
- **Internal Service Protection**: Inter-service endpoints (`/internal/v1/jobs/execute`, `/internal/v1/jobs/:id/cancel`) enforce `InternalAuthGuard`, verifying the `X-Internal-Service-Key` header with constant-time comparison.
- **Cookie Security**: HTTP-only cookies (`access_token`) are supported for secure browser sessions, mitigating XSS token harvesting.

---

## 2. Multi-Tenant Authorization & RBAC

### Findings & Implementation
- **Role-Based Access Control**: `RbacGuard` and `@RequirePermissions(...)` verify that the caller possesses required permission flags (e.g. `flows:create_edit`, `tests:execute`, `audit:read`).
- **Project Isolation**: Every controller method querying or updating project-scoped resources (`flows`, `tests`, `credentials`, `environments`, `executions`, `artifacts`) calls `projectsService.verifyProjectAccess(projectId, userId, isSuperuser)`. Ordinary users are strictly prevented from viewing or modifying records belonging to other projects.
- **Superuser Scoping**: `isSuperuser` flags are validated server-side from JWT claims and database records; client payloads cannot elevate privilege.

---

## 3. Input Validation & Parameter Sanitization

### Findings & Implementation
- **Global Validation Pipe**: `main.ts` configures `ValidationPipe({ whitelist: true, transform: true })`. Non-whitelisted fields in incoming request bodies are stripped automatically, preventing mass-assignment vulnerabilities.
- **DTO Validation**: Class-validator decorators enforce UUID format (`@IsUUID()`), string constraints (`@MinLength()`, `@MaxLength()`), and whitelist enums (`@IsIn()`).
- **Environment Validation**: Zod schema validation in `env.validation.ts` validates all system environment variables at boot time, preventing execution with missing or malformed secrets.

---

## 4. Secret Protection & Cryptographic Vault

### Findings & Implementation
- **AES-256-GCM Encryption**: The credential vault in `crypto-vault.service.ts` uses AES-256-GCM with a 12-byte random IV (nonce) and 16-byte authentication tag per encryption operation.
- **Format Interoperability**: Output is formatted as URL-safe base64 (`Buffer.concat([iv, ciphertext, tag])`), ensuring 100% compatibility with records previously encrypted by Python's `cryptography` library.
- **Secret Masking**: Secret values in database records are never exposed via REST API responses; `CredentialsService` masks secrets as `********`.

---

## 5. Subprocess & Command Injection Elimination

### Findings & Implementation
- **No Shell Execution**: The legacy architecture's reliance on shell subprocess invocations (`subprocess.Popen(["agent-browser", ...])`) has been completely eliminated.
- **Native Playwright Engine**: The unified backend uses native Playwright Node.js APIs (`chromium.launch()`, `page.goto()`, `page.click()`), completely closing shell command injection attack vectors.

---

## 6. Path Traversal & File System Protection

### Findings & Implementation
- **Artifact Security**: `ArtifactsService` strictly verifies that resolved artifact paths reside within the configured `STORAGE_DIR` using `path.relative()`. Any attempt to escape storage via `..` or absolute path manipulation throws `ForbiddenException`.
- **Integrity Verification**: All saved screenshots, DOM dumps, and traces record their cryptographic SHA-256 hash in PostgreSQL. `/api/v1/artifacts/:id/verify` verifies on-disk files against the database digest.

---

## 7. SSRF & Network Policy

### Findings & Implementation
- **Domain Whitelisting**: Automated executions and interactive sessions enforce domain allowlists via Playwright's `page.route('**/*')`. Requests to unapproved hosts, private network ranges, or cloud metadata services (`169.254.169.254`) are intercepted and aborted.

---

## 8. WebSocket Live Monitor Security

### Findings & Implementation
- **Connection Authentication**: `MonitoringGateway` extracts tokens from query parameters, cookies, or authorization headers, validating them through `JwtService.verify()`.
- **Authorization Verification**: Verifies that the connected user has permission to view the execution's project.
- **Policy Violation Disconnect**: Sockets failing token or project validation are immediately closed with WebSocket status code `1008` (Policy Violation).

---

## 9. Zero-AI Compliance Verification

| Check | Requirement | Audit Result |
|---|---|---|
| External LLM APIs | Zero calls to OpenAI, Claude, Anthropic, Gemini, etc. | **PASS (0 occurrences)** |
| Local AI Models | Zero local Ollama, vLLM, Torch, or HuggingFace inference | **PASS (0 occurrences)** |
| Element Selectors | 100% deterministic heuristic & ARIA matching | **PASS** |
| Self-Healing | Deterministic structural DOM fingerprinting & attribute scoring | **PASS** |
| Data Protection | No customer DOM, telemetry, or screenshots leave private infrastructure | **PASS** |

---

## 10. Audit Summary
The Unified NestJS Backend complies with all security policies, achieves complete protection against common web vulnerabilities (OWASP Top 10), and safely operates without Python or external CLI dependencies.

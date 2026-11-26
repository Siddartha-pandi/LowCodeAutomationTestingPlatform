# Authentication Architecture — LowCodeAutomationTestingPlatform

## 1. Strategy: HttpOnly Cookie Session + Double-Submit CSRF

Browser clients authenticate via an **HttpOnly, SameSite=Lax** `access_token` cookie issued by `AuthController` (`POST /api/v1/auth/login`, `POST /api/v1/auth/register`), eliminating JWT exposure to browser JavaScript (`localStorage`).

- **Cookie Flags:** `httpOnly: true`, `sameSite: 'lax'`, `secure: NODE_ENV === 'production'`, `path: '/'`, `maxAge: TOKEN_EXPIRY_MINUTES * 60 * 1000`.
- **API & CLI Compatibility:** `JwtStrategy` extracts JWT from `Authorization: Bearer <token>` first, then falls back to `req.cookies['access_token']`.
- **WebSocket Authentication:** `MonitoringGateway` validates the JWT from the `access_token` cookie sent automatically on the browser WebSocket upgrade handshake (or `Authorization: Bearer` / query param for non-browser clients). No unauthenticated development bypass exists.

## 2. CSRF Protection (`CsrfMiddleware`)

For all mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) authenticated via `access_token` cookie:
1. `AuthController` issues a non-HttpOnly `csrf_token` cookie (`crypto.randomBytes(32).toString('hex')`) alongside `access_token`.
2. The Next.js API client (`frontend/src/api.ts`) sends `credentials: 'include'` and attaches `X-CSRF-Token`.
3. `CsrfMiddleware` validates both the `Origin` header (against configured `CORS_ORIGINS`) and constant-time equality (`crypto.timingSafeEqual`) between `req.cookies['csrf_token']` and `req.headers['x-csrf-token']`.
4. Explicit `Authorization: Bearer` and `X-Internal-Service-Key` callers are exempt.

## 3. CORS Policy (`main.ts`)

- Credentials are enabled (`credentials: true`) with an explicit `corsOrigins` allowlist (`*` is stripped).
- Arbitrary `http://localhost:*` / `http://127.0.0.1:*` origin acceptance is disabled in `NODE_ENV=production`.

## 4. Password Hashing & Password Reset

- Passwords are hashed with `bcrypt` (12 salt rounds).
- Password reset tokens are 256-bit random tokens hashed with SHA-256 before persistence in `users.reset_password_token`; raw reset tokens are never written to logs.

## 5. Session Lifecycle (`frontend/src/context/AuthContext.tsx`)

- On mount, `AuthProvider` validates the active session via `GET /api/v1/auth/me` (no JWT stored in `localStorage`).
- On `logout()`, the frontend calls `POST /api/v1/auth/logout` to clear `access_token` and `csrf_token` cookies and clears in-memory user state.

# Secret Management Policy — LowCodeAutomationTestingPlatform

## 1. Secret Requirements & Generation

All sensitive keys must be injected via environment variables or a secret manager (e.g., AWS Secrets Manager, Azure Key Vault, HashiCorp Vault). Never commit real secrets to source control.

Generate cryptographically random secrets (>= 256-bit / 32+ chars):

```bash
openssl rand -hex 32
```

Required production secrets:
- `JWT_SECRET` / `JWT_SECRET_KEY` (32+ chars, non-placeholder)
- `APP_ENCRYPTION_KEY` / `CREDENTIALS_MASTER_KEY` (32+ chars, non-placeholder) — used by `CryptoVaultService` (`AES-256-GCM`)
- `INTERNAL_SERVICE_KEY` (32+ chars, non-placeholder) — used by `InternalAuthGuard`
- `DATABASE_URL` — PostgreSQL connection string with TLS (`DATABASE_SSL=true`)

## 2. Startup Validation (`env.validation.ts`)

`ConfigModule.forRoot({ validate: validateEnvironment })` in both `AppModule` and `WorkerModule` enforces:
- Rejection of missing, short (< 32 chars), or placeholder secrets (`CHANGE_ME_*`, legacy defaults) when `NODE_ENV=production`.
- Rejection of `ALLOW_LOCALHOST_AUTOMATION=true` in production.
- Rejection of `DB_SYNCHRONIZE=true` in production.
- Non-production dev/test environments use ephemeral per-process CSPRNG fallback keys in `configuration.ts` if env vars are omitted, rather than static hardcoded strings.

## 3. Repository Protections

- `.gitignore` ignores `.env` and `.env.*` (except `.env.example`).
- `.env.example` contains only `CHANGE_ME_*` placeholders.
- `.devcontainer/docker-compose.yml` reads secrets from `../.env` via `env_file` with zero embedded secret literals.
- Frontend bundle only exposes `NEXT_PUBLIC_*` non-secret configuration.

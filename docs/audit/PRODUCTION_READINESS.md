# Production Readiness Checklist — LowCodeAutomationTestingPlatform

## 1. Security Requirements
- [ ] **Fix all Critical/High audit findings** (AUD-001 through AUD-012).
- [ ] **Secrets Management:** Ensure `JWT_SECRET`, `APP_ENCRYPTION_KEY`, and `INTERNAL_SERVICE_KEY` are injected from a secret manager (e.g., AWS Secrets Manager, Azure Key Vault, or K8s Secrets) — never use `.devcontainer/docker-compose.yml` values.
- [ ] **TLS / HTTPS:** Terminate TLS at reverse proxy/load balancer; ensure `NODE_ENV=production` so cookies set `Secure: true` and `env.validation.ts` enforces strong secrets.
- [ ] **SSRF & Network Egress:** Enforce both application-level `UrlSecurityService` and container/network-level egress firewall rules blocking RFC1918, loopback, and cloud metadata (`169.254.169.254`).

## 2. Database & Migrations
- [ ] **Generate TypeORM Migrations:** Replace `DB_SYNCHRONIZE=true` with versioned TypeORM migrations (`typeorm migration:generate` / `migration:run`).
- [ ] **Backups:** Configure automated PostgreSQL point-in-time recovery (PITR) and Redis RDB/AOF persistence.

## 3. Infrastructure & Deployment
- [ ] **Complete Production Dockerfiles:** Update `backend/Dockerfile` and `frontend/Dockerfile` with multi-stage builds, `npm ci`, `npm run build`, non-root user, and healthchecks.
- [ ] **Separate Worker Scaling:** Deploy API (`EMBED_WORKER=false`) and Playwright Workers (`node dist/worker`) as separate containers/pods with appropriate CPU/memory limits (2GB+ RAM / shm per Playwright worker).
- [ ] **Artifact Storage:** Mount shared persistent volume or S3-compatible object storage for `STORAGE_DIR` when API and workers run in separate containers.

## 4. Monitoring & Observability
- [ ] **Healthchecks:** `/health` endpoint checks DB, Redis, and Playwright availability.
- [ ] **Log Aggregation & Metrics:** Ship structured JSON logs and monitor BullMQ queue depth (`waiting`, `active`, `failed`).

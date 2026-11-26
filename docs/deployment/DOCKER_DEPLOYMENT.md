# Production Docker Deployment — LowCodeAutomationTestingPlatform

## 1. Architecture & Network Isolation

`docker-compose.prod.yml` separates workloads into five services across three Docker networks:
- `postgres` & `redis`: Attached only to `backend_net` (`internal: true`), never exposed to host ports.
- `api`: Runs `node dist/main.js` with `EMBED_WORKER=false`, `RUN_MIGRATIONS=true`, and `DB_SYNCHRONIZE=false`.
- `worker`: Isolated Playwright worker running `node dist/worker.js` with `shm_size: 2gb`, `cap_drop: [ALL]`, `no-new-privileges:true`, and non-root `pwuser`.
- `frontend`: Minimal `node:20-alpine` Next.js production server running as non-root `nextjs` user.

## 2. Host/Cloud Egress Firewall Guidance for `worker_egress_net`

Because Playwright workers require outbound internet access for public target sites while remaining isolated from internal infrastructure:
- Block egress from `worker_egress_net` to `169.254.169.254/32` (cloud metadata), RFC1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and host loopback via `iptables` / `nftables` / cloud security groups.
- Application-level `UrlSecurity` (`url-security.ts`) enforces scheme, IPv4/IPv6, DNS A/AAAA, and redirect checks on top of network controls.

## 3. Running Production Stack

```bash
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml up -d --build
```

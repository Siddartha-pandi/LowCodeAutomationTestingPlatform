# Dev Container & WSL2 Performance Optimization — LowCodeAutomationTestingPlatform

## 1. Root Causes Identified & Fixed

1. **Unconditional Frontend Polling (`frontend/package.json` & `next.config.mjs`):**
   - `frontend/package.json` previously hardcoded `WATCHPACK_POLLING=true` in the default `dev` script, overriding `WATCHPACK_POLLING=false` in `.devcontainer/docker-compose.yml` and `.env.example` and causing continuous CPU/disk polling.
   - **Fix:** `npm run dev` now uses native OS filesystem events (`inotify`) by default, while `npm run dev:poll` explicitly enables `WATCHPACK_POLLING=true` for Windows DrvFs (`/mnt/c/...`) mounts where `inotify` events are not forwarded.
   - `next.config.mjs` explicitly ignores `node_modules`, `.next`, `dist`, `storage`, and `.git`.

2. **Backend HMR Polling & Watch Exclusions (`backend/webpack-hmr.config.js`):**
   - Gated `poll: 1000` behind `WEBPACK_POLLING=true` and excluded `dist`, `storage`, `coverage`, and `.git` so Playwright screenshot/trace writes never trigger backend reloads.

3. **Backend SWC Builder:**
   - `backend/nest-cli.json` uses `@swc/cli` (`nest start -b swc -w`), keeping TypeScript incremental recompilation sub-second.

## 2. Windows + WSL2 Best Practices

- Keep the repository inside the **WSL2 Linux filesystem** (`~/projects/...`), not `/mnt/c/...`, so `inotify` works natively and `npm install` / Next.js compilation runs 5–10x faster.
- Use `EMBED_WORKER=true` in single-container dev to avoid duplicate process overhead while retaining isolated `BrowserContext` per execution.
- If working from a `/mnt/c/` bind mount where file change events do not propagate into Linux containers, start the frontend with `npm --prefix frontend run dev:poll` (or set `WATCHPACK_POLLING=true`).

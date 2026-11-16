# Unified NestJS Backend & Playwright Automation Engine

## Overview
This directory contains the unified NestJS backend and Playwright automation engine for the **LowCodeAutomationTestingPlatform**.

It replaces the legacy multi-backend architecture (FastAPI + Celery + automation-service) with a single, highly performant, type-safe TypeScript codebase.

---

## Key Features
- **Enterprise Modular NestJS**: Clean separation of controllers, services, repositories, entities, guards, and DTOs.
- **Process Separation**: Separate entrypoints for the HTTP API server (`src/main.ts`) and the background browser execution worker (`src/worker.ts`).
- **Playwright Native Engine**: 100% deterministic browser automation with zero external CLI or subprocess dependencies.
- **PostgreSQL 16 Relational Schema**: 21 mapped TypeORM entities with `synchronize: false` and strict constraint preservation.
- **AES-256-GCM Vault**: Encrypted credential storage with binary-compatible layout for seamless reading of legacy records.
- **BullMQ Queue Management**: Robust, isolated queueing for browser runs, test suite batches, and maintenance jobs.
- **Real-Time WebSocket Streaming**: Bi-directional live monitoring gateway (`/ws/executions/:id`) powered by Redis Pub/Sub.
- **Strict Zero-AI Guarantee**: Zero LLMs, zero non-deterministic models, zero external AI APIs.

---

## Scripts
```bash
# Install dependencies
npm install --legacy-peer-deps

# Build TypeScript
npm run build

# Start HTTP API on port 8000
npm run start:api

# Start Playwright BullMQ Worker
npm run start:worker

# Run Unit and Entity Tests
npm test
```

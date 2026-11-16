# MIGRATION MAPPING: PYTHON FASTAPI TO UNIFIED NESTJS BACKEND

**Project:** LowCodeAutomationTestingPlatform (`AutomationTestingWithAgentBrowser`)  
**Phase:** 1 — Complete Source Code Audit & Migration Mapping  
**Date:** November 2026  
**Status:** Audit & Mapping Complete — Ready for Execution  

---

## 1. Architecture Consolidation Strategy

The existing multi-repo/two-backend architecture is being migrated into **ONE unified NestJS backend** located at `backend/` with two distinct entrypoints:
1. **API Process** (`backend/src/main.ts`):
   - Starts HTTP server on port 8000 (matching existing FastAPI port to preserve frontend compatibility).
   - Serves all REST APIs (`/api/v1/*`), legacy aliases (`/api/auth/*`, `/api/workspaces`, `/health`), WebSocket gateway (`/ws/executions/:id`), and Swagger documentation (`/api/docs`).
   - Connects to PostgreSQL using TypeORM with `synchronize: false` (schema ownership remains strictly managed via versioned migrations).
   - Produces BullMQ execution jobs.
   - Does **NOT** register BullMQ consumers.
2. **Worker Process** (`backend/src/worker.ts`):
   - Standalone Node.js process launched via `node dist/worker.js` (or `npm run start:worker`).
   - Registers BullMQ consumers on `browser-execution`, `test-suite-execution`, and `maintenance` queues.
   - Manages Playwright browser lifecycles (Chromium, Firefox, WebKit) in isolated sessions.
   - Checks cancellation signals during execution.
   - Writes step logs, execution status, and artifacts directly to PostgreSQL.
   - Publishes real-time execution events to Redis Pub/Sub for WebSocket fanout.
   - Does **NOT** start an HTTP listener.

---

## 2. Deduplication Matrix (FastAPI vs. NestJS Automation Service)

| Functional Domain | Existing Python Implementation | Existing NestJS Implementation | Analysis & Migration Decision |
|---|---|---|---|
| **Browser Engine** | `backend/app/browser/agent_browser.py` (CLI wrapper invoking `agent-browser` subprocess) | `automation-service/src/modules/browser/browser-manager.service.ts` (Native Playwright) | **Consolidate to NestJS Playwright**. Delete CLI subprocess wrapper; Playwright provides native in-process context control, tracing, and video. |
| **Browser Contexts** | `backend/app/browser/session_manager.py` (Process-level CLI sessions) | `automation-service/src/modules/browser/context-manager.service.ts` (Playwright contexts) | **Consolidate to NestJS**. Playwright contexts provide isolated cookies, localStorage, permissions, and tracing per execution. |
| **SSRF & Network Protection**| `backend/app/security/network_policy.py` (Python regex checks) | `automation-service/src/modules/browser/page-manager.service.ts` (Playwright route abortion) | **Consolidate to NestJS**. Playwright `page.route('**/*')` blocks AWS/GCP cloud metadata (`169.254.169.254`) and unauthorized domains at wire level. |
| **Selector Resolution** | `backend/app/engine/selectors/` (`selector_fallback.py`, `selector_types.py`, `selector_validator.py`) | `automation-service/src/modules/selectors/locator-resolver.service.ts` | **Consolidate to NestJS**. Preserve deterministic priority hierarchy: `test_id` -> `role` -> `label` -> `placeholder` -> `text` -> `css/xpath`. Strict ambiguity check preserved. |
| **Browser Actions** | `backend/app/browser/command_executor.py` | `automation-service/src/modules/actions/action-executor.service.ts` | **Consolidate to NestJS**. Playwright actions cover `navigate`, `click`, `double_click`, `right_click`, `hover`, `fill`, `type`, `clear`, `select`, `check`, `uncheck`, `scroll`, `wait`, `screenshot`, `press_key`, `reload`. |
| **Assertions** | `backend/app/engine/testing/assertion_engine.py` | `automation-service/src/modules/assertions/assertion-executor.service.ts` | **Consolidate to NestJS**. Evaluates `element_visible`, `element_hidden`, `element_enabled`, `element_disabled`, `text_equals`, `text_contains`, `url_equals`, `url_contains`, `title_equals`, `element_count`, `attribute_equals`. |
| **Flow Graph Execution** | `backend/app/engine/flows/flow_executor.py` | `automation-service/src/modules/flows/flow-executor.service.ts` | **Consolidate to NestJS**. Evaluates DAG graph nodes, edge dependencies, condition evaluation, and `{{variable}}` string interpolation. |
| **Queue Management** | Celery 5.4 (`celery_app.py`, `tasks.py`) | BullMQ 5.25 (`queue.service.ts`, `queue.module.ts`) | **Consolidate to BullMQ**. Remove Celery and Celery Beat. All job dispatching and scheduled crons migrate to BullMQ and `@nestjs/schedule`. |
| **Event Publishing** | `backend/app/engine/events/event_bus.py` (Redis Pub/Sub) | `automation-service/src/modules/monitoring/event-publisher.service.ts` (Redis Pub/Sub) | **Consolidate to NestJS**. Worker publishes events with sequence numbers; NestJS WebSocket Gateway subscribes and streams to frontend. |
| **Artifacts & Screenshots** | `backend/app/reports/artifact_manager.py` | `automation-service/src/modules/screenshots/artifact-manager.service.ts` | **Consolidate to NestJS**. Save files with SHA-256 checksums and record metadata in PostgreSQL `artifacts` table. |
| **Internal HTTP Client** | `backend/app/services/automation_client.py` | `automation-service/src/modules/execution/execution.controller.ts` | **Delete internal HTTP integration**. In unified backend, execution service enqueues directly to BullMQ in-process. |

---

## 3. Comprehensive Feature Migration Mapping

### 3.1 Authentication & Authorization
| Existing Source File | Existing Functionality | Target NestJS Module | Required Dependencies | Migration Status | Verification Test |
|---|---|---|---|---|---|
| `backend/app/security/password.py` | bcrypt password hashing and verification | `backend/src/modules/auth/` (`password.service.ts`) | `bcrypt`, `@types/bcrypt` | Planned | Unit test: `hashPassword`, `verifyPassword`, verify legacy password hashes match |
| `backend/app/security/jwt.py` | JWT creation, verification, claims decoding | `backend/src/modules/auth/` (`jwt.service.ts`, `jwt.strategy.ts`) | `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt` | Planned | Unit test: token generation, expiry, signature rejection, payload claims |
| `backend/app/security/rbac.py` | Role-based permission checks, `require_permission` decorator | `backend/src/modules/auth/guards/` (`rbac.guard.ts`, `permissions.decorator.ts`) | `@nestjs/core`, `@nestjs/common` | Planned | Integration test: endpoints guarded by `require_permission` reject unauthorized roles |
| `backend/app/api/v1/auth.py` | `/api/v1/auth/login`, `/register`, `/me`, `/logout` | `backend/src/modules/auth/` (`auth.controller.ts`, `auth.service.ts`) | TypeORM, `@nestjs/jwt` | Planned | Integration test: register user, login, retrieve `/auth/me`, verify cookie handling |
| `backend/main.py` | `/api/auth/register`, `/api/auth/login` | `backend/src/modules/auth/` (`legacy-auth.controller.ts`) | TypeORM, `@nestjs/jwt` | Planned | Integration test: verify exact backward-compatibility with legacy payloads |

### 3.2 Users & Roles
| Existing Source File | Existing Functionality | Target NestJS Module | Required Dependencies | Migration Status | Verification Test |
|---|---|---|---|---|---|
| `backend/app/models/user.py` | `User`, `Role`, `UserRole` SQLAlchemy entities | `backend/src/database/entities/` (`user.entity.ts`, `role.entity.ts`) | `typeorm` | Planned | Entity unit test: column mapping, relation mapping, UUID generation |
| `backend/app/api/v1/users.py` | CRUD operations for users, role assignment | `backend/src/modules/users/` (`users.controller.ts`, `users.service.ts`) | TypeORM | Planned | Integration test: user CRUD, role assignment, superuser checks |
| `backend/app/api/v1/roles.py` | List predefined & custom RBAC roles | `backend/src/modules/roles/` (`roles.controller.ts`, `roles.service.ts`) | TypeORM | Planned | Integration test: list roles, verify permissions JSONB mapping |

### 3.3 Projects, Environments & Credentials Vault
| Existing Source File | Existing Functionality | Target NestJS Module | Required Dependencies | Migration Status | Verification Test |
|---|---|---|---|---|---|
| `backend/app/models/project.py` | `Project`, `ProjectMember`, `Environment`, `Credential`, `TestDataset` entities | `backend/src/database/entities/` (`project.entity.ts`, `environment.entity.ts`, etc.) | `typeorm` | Planned | Entity mapping test: foreign keys, JSONB fields, cascading rules |
| `backend/app/api/v1/projects.py` | Project workspace management, member collaboration (`resolve_project_id`, `user_has_project_access`) | `backend/src/modules/projects/` (`projects.controller.ts`, `projects.service.ts`, `project-access.guard.ts`) | TypeORM | Planned | Integration test: multi-tenant access control, member invite/remove |
| `backend/app/api/v1/environments.py` | Environment CRUD, `base_url`, `allowed_domains`, `variables` | `backend/src/modules/environments/` (`environments.controller.ts`, `environments.service.ts`) | TypeORM | Planned | Integration test: create environment, resolve domain allowlist |
| `backend/app/security/secret_manager.py` | AES-256-GCM encryption/decryption of credential secrets | `backend/src/modules/credentials/` (`crypto-vault.service.ts`) | `crypto` (Node.js built-in) | Planned | Unit test: encrypt/decrypt with AES-256-GCM, verify compatibility with Python encrypted payloads |
| `backend/app/api/v1/credentials.py` | Credential vault storage with secret masking on read | `backend/src/modules/credentials/` (`credentials.controller.ts`, `credentials.service.ts`) | TypeORM, `crypto` | Planned | Integration test: store secret, retrieve masked secret, verify decryption |

### 3.4 Flows & Workflows
| Existing Source File | Existing Functionality | Target NestJS Module | Required Dependencies | Migration Status | Verification Test |
|---|---|---|---|---|---|
| `backend/app/models/automation.py` | `AutomationDefinition`, `DefinitionVersion`, `Schedule` entities | `backend/src/database/entities/` (`automation-definition.entity.ts`, `definition-version.entity.ts`) | `typeorm` | Planned | Entity mapping test: JSONB graph definitions, version numbering |
| `backend/app/schemas/flows.py` | Flow DTOs, DAG validation schemas | `backend/src/modules/flows/dto/` | `class-validator`, `class-transformer` | Planned | DTO validation test: reject cyclic DAG, reject invalid node types |
| `backend/app/api/v1/flows.py` | Flow CRUD, version publishing, DAG checksums, execution trigger | `backend/src/modules/flows/` (`flows.controller.ts`, `flows.service.ts`) | TypeORM, BullMQ | Planned | Integration test: create flow, publish version, trigger execution |
| `backend/app/engine/flows/flow_schema.py` | DAG graph schemas, node connections, step configs | `backend/src/contracts/` (`execution.contract.ts`) | `zod` / `class-validator` | Planned | Contract validation test |

### 3.5 Test Cases, Test Suites & Datasets
| Existing Source File | Existing Functionality | Target NestJS Module | Required Dependencies | Migration Status | Verification Test |
|---|---|---|---|---|---|
| `backend/app/engine/testing/test_schema.py` | Test case schema, setup/steps/teardown | `backend/src/modules/test-cases/dto/` | `class-validator` | Planned | Schema validation test |
| `backend/app/api/v1/tests.py` | Test case CRUD, dataset CRUD, test execution, legacy seeding | `backend/src/modules/test-cases/` (`test-cases.controller.ts`, `test-cases.service.ts`) | TypeORM, BullMQ | Planned | Integration test: create test case, execute with dataset, seed legacy |
| `backend/app/api/v1/test_suites.py` | Test suite creation, test assignment, batch suite execution | `backend/src/modules/test-suites/` (`test-suites.controller.ts`, `test-suites.service.ts`) | TypeORM, BullMQ | Planned | Integration test: create suite, add test cases, launch suite run |

### 3.6 Executions, Reports & Artifacts
| Existing Source File | Existing Functionality | Target NestJS Module | Required Dependencies | Migration Status | Verification Test |
|---|---|---|---|---|---|
| `backend/app/models/execution.py` | `Execution`, `ExecutionStep`, `ExecutionLog`, `Artifact`, `DOMSnapshot` | `backend/src/database/entities/` (`execution.entity.ts`, `execution-step.entity.ts`, etc.) | `typeorm` | Planned | Entity mapping test: relations, step ordering, JSONB details |
| `backend/app/api/v1/executions.py` | List runs, execution detail, cancellation, log retrieval, live viewport | `backend/src/modules/executions/` (`executions.controller.ts`, `executions.service.ts`) | TypeORM, BullMQ, Redis | Planned | Integration test: query executions, cancel active run, stream logs |
| `backend/app/api/v1/reports.py` | Execution summary, HTML report viewer, CSV export | `backend/src/modules/reports/` (`reports.controller.ts`, `reports.service.ts`) | TypeORM, `fast-csv` or native CSV | Planned | Integration test: generate summary metrics, export CSV, render HTML report |
| `backend/app/api/v1/artifacts.py` | Artifact metadata, secure file download, image viewing, SHA-256 verification | `backend/src/modules/artifacts/` (`artifacts.controller.ts`, `artifacts.service.ts`) | TypeORM, `fs/promises`, `crypto` | Planned | Integration test: download screenshot, verify hash, prevent path traversal |

### 3.7 Interactive Browser, Recorder & DOM Intelligence
| Existing Source File | Existing Functionality | Target NestJS Module | Required Dependencies | Migration Status | Verification Test |
|---|---|---|---|---|---|
| `backend/app/api/v1/browser.py` | Interactive browser launch, navigate, action, screenshot, viewport, close | `backend/src/modules/browser/` (`browser.controller.ts`, `interactive-session.service.ts`) | Playwright | Planned | Integration test: launch session, navigate, capture viewport, close session |
| `backend/app/api/v1/recorder.py` | Start recording, inspect elements, record actions, save flow/test, stop | `backend/src/modules/sessions/` (`recorder.controller.ts`, `recorder.service.ts`) | Playwright | Planned | Integration test: start recorder, record click, save test case |
| `backend/app/intelligence/dom_extractor.py` | Deterministic extraction of ARIA, test IDs, bounding boxes, attributes | `backend/src/modules/selectors/` (`dom-extractor.service.ts`) | Playwright | Planned | Unit test: extract elements on demo HTML page, verify attributes |
| `backend/app/api/v1/dom.py` | `/dom/extract`, `/dom/explore` endpoints | `backend/src/modules/selectors/` (`dom.controller.ts`) | Playwright | Planned | Integration test: extract DOM from live page session |
| `backend/app/api/v1/elements.py` | Element profile CRUD, locator history | `backend/src/modules/selectors/` (`element-profiles.controller.ts`, `element-profiles.service.ts`) | TypeORM | Planned | Integration test: profile CRUD, add fallback locator |
| `backend/app/api/v1/healing.py` | Deterministic self-healing events, human approvals | `backend/src/modules/change-detection/` (`healing.controller.ts`, `healing.service.ts`) | TypeORM | Planned | Integration test: log healing event, request approval, respond |

### 3.8 Schedules & Audit
| Existing Source File | Existing Functionality | Target NestJS Module | Required Dependencies | Migration Status | Verification Test |
|---|---|---|---|---|---|
| `backend/app/api/v1/schedules.py` | Schedule CRUD, immediate evaluation | `backend/src/modules/scheduling/` (`schedules.controller.ts`, `schedules.service.ts`) | TypeORM, BullMQ | Planned | Integration test: create schedule, trigger manual evaluation |
| `backend/app/worker/tasks.py:schedule_checker_task` | Cron evaluation with `croniter` | `backend/src/modules/scheduling/` (`schedule-scheduler.service.ts`) | `cron-parser`, `@nestjs/schedule` | Planned | Unit test: cron evaluation matching timezone, next run dispatch |
| `backend/app/security/retention.py` | Retention purge of old logs, dom snapshots, screenshots | `backend/src/modules/audit/` (`retention-cleanup.service.ts`) | TypeORM, `fs/promises` | Planned | Integration test: purge records older than N days |
| `backend/app/api/v1/audit.py` | Audit log listing, CSV/JSON export, manual retention purge | `backend/src/modules/audit/` (`audit.controller.ts`, `audit.service.ts`) | TypeORM | Planned | Integration test: record audit event, list events, export CSV |

### 3.9 WebSocket Real-Time Monitoring
| Existing Source File | Existing Functionality | Target NestJS Module | Required Dependencies | Migration Status | Verification Test |
|---|---|---|---|---|---|
| `backend/app/api/v1/ws_monitor.py` | Live WebSocket stream `/ws/executions/{id}` with JWT auth, replay buffer, Redis Pub/Sub subscription | `backend/src/modules/monitoring/` (`monitoring.gateway.ts`, `monitoring-subscriber.service.ts`) | `@nestjs/websockets`, `@nestjs/platform-ws` or `ws`, `ioredis` | Planned | Integration test: connect WebSocket with token, trigger execution event, verify event delivery |

### 3.10 Background Processing & Worker Runtime
| Existing Source File | Existing Functionality | Target NestJS Module | Required Dependencies | Migration Status | Verification Test |
|---|---|---|---|---|---|
| `backend/app/worker/celery_app.py` | Celery broker configuration, Beat scheduler | `backend/src/queue/` (`queue.module.ts`, `bullmq-config.service.ts`) | `bullmq`, `@nestjs/bullmq`, `ioredis` | Planned | Unit test: BullMQ queue initialization, Redis connection |
| `backend/app/worker/tasks.py:execute_flow_task` | Flow execution background job with DB recording | `backend/src/workers/` (`execution.worker.ts`) | `bullmq`, Playwright, TypeORM | Planned | Integration test: enqueue job, worker executes Playwright steps, persists to DB |
| `backend/app/worker/tasks.py:execute_test_case_task` | Test case execution job | `backend/src/workers/` (`execution.worker.ts`) | `bullmq`, Playwright, TypeORM | Planned | Integration test: test case execution with assertions |
| `backend/app/worker/tasks.py:execute_test_suite_task` | Test suite execution job | `backend/src/workers/` (`suite.worker.ts`) | `bullmq`, TypeORM | Planned | Integration test: suite batch execution |

---

## 4. Target Unified Backend Module Layout

```text
backend/
├── src/
│   ├── common/
│   │   ├── decorators/       # @CurrentUser, @RequirePermissions, @ProjectScope
│   │   ├── filters/          # GlobalExceptionFilter
│   │   ├── guards/           # JwtAuthGuard, RbacGuard, ProjectAccessGuard
│   │   ├── interceptors/     # LoggingInterceptor, TransformInterceptor
│   │   └── pipes/            # ValidationPipe
│   │
│   ├── config/               # Environment config & validation (Joi / Zod)
│   ├── contracts/            # Execution contracts & event contracts
│   │
│   ├── database/
│   │   ├── database.module.ts
│   │   ├── entities/         # 21 TypeORM entities mapping PostgreSQL tables
│   │   └── migrations/       # TypeORM migrations (post-Alembic baseline)
│   │
│   ├── queue/                # BullMQ queue definitions & Redis connection
│   │
│   ├── modules/
│   │   ├── auth/             # Login, register, me, logout, bcrypt, JWT
│   │   ├── users/            # User CRUD & roles assignment
│   │   ├── roles/            # Role definitions & permissions
│   │   ├── projects/         # Workspaces & project members
│   │   ├── environments/     # Environments, allowed domains, variables
│   │   ├── credentials/      # AES-256-GCM encrypted credential vault
│   │   ├── flows/            # Flow definitions, DAG validator, versions
│   │   ├── test-cases/       # Test cases & test datasets
│   │   ├── test-suites/      # Test suites & batch execution
│   │   ├── executions/       # Executions CRUD, status, cancellation, logs
│   │   ├── browser/          # BrowserManager, ContextManager, PageManager, InteractiveSessions
│   │   ├── sessions/         # Recorder sessions
│   │   ├── actions/          # Playwright ActionExecutor
│   │   ├── selectors/        # LocatorResolver, DOMExtractor, ElementProfiles
│   │   ├── assertions/       # AssertionExecutor
│   │   ├── change-detection/ # ChangeDetector, Healing, Approvals
│   │   ├── monitoring/       # WebSocket Gateway, EventPublisher, Redis subscriber
│   │   ├── reports/          # Report summaries, HTML generator, CSV exports
│   │   ├── artifacts/        # Artifact manager, download, view, verify
│   │   ├── audit/            # Audit logger, export, retention purge
│   │   └── scheduling/       # Cron schedule evaluation & dispatcher
│   │
│   ├── workers/              # BullMQ consumers (execution, suite, maintenance)
│   ├── app.module.ts         # API Module (HTTP + WS + Queue Producers, NO consumers)
│   ├── worker.module.ts      # Worker Module (BullMQ consumers + Playwright + DB, NO HTTP)
│   ├── main.ts               # API bootstrap entrypoint (Port 8000)
│   └── worker.ts             # Worker bootstrap entrypoint
│
├── test/
├── package.json
└── tsconfig.json
```

---

## 5. Verification & Acceptance Strategy for Phase 1

1. **Inventory Completeness**:
   - Every single FastAPI endpoint (106 endpoints) is accounted for.
   - All 21 PostgreSQL tables and 2 Alembic migrations are mapped.
   - All 91 Pydantic schemas have corresponding DTO targets.
   - All 5 Celery background/scheduled tasks have corresponding BullMQ job processors.
2. **Architecture Compliance**:
   - Zero AI / No LLM policy is strictly maintained.
   - Playwright is established as the sole browser automation engine.
   - API runtime (`main.ts`) and worker runtime (`worker.ts`) separation is explicitly designed.
   - Dual-backend duplicate components are resolved to canonical NestJS implementations.
3. **Frontend Contract Preservation**:
   - Port 8000 is maintained as the primary HTTP port for the unified backend to ensure `NEXT_PUBLIC_API_URL` works seamlessly without disruptive frontend configuration changes.
   - Legacy endpoint contracts (`/api/auth/login`, `/api/auth/register`, `/api/workspaces`, `/health`) are preserved alongside versioned `/api/v1/*` contracts.

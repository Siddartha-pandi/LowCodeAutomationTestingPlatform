# Unified Project Structure

```text
LowCodeAutomationTestingPlatform/
│
├── frontend/                              # Next.js 16 + React 19 + TypeScript + Tailwind CSS Frontend
│   ├── src/
│   │   ├── api.ts                         # Strongly typed API client connecting to port 8000
│   │   ├── app/                           # Next.js App Router (Dashboard, Executions, Flows, Tests, Admin)
│   │   ├── components/                    # UI component library & interactive visual DAG builder
│   │   └── context/                       # Auth and Project workspace state
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                               # Unified NestJS Backend & Playwright Automation Codebase
│   ├── src/
│   │   ├── common/                        # Cross-cutting concerns
│   │   │   ├── adapters/                  # AppWsAdapter (supports /ws/executions/:id pattern)
│   │   │   ├── decorators/                # @CurrentUser, @Public, @RequirePermissions
│   │   │   ├── filters/                   # GlobalExceptionFilter (FastAPI + NestJS dual error format)
│   │   │   ├── guards/                    # JwtAuthGuard, RbacGuard, InternalAuthGuard
│   │   │   └── interceptors/              # LoggingInterceptor
│   │   │
│   │   ├── config/                        # Global typed configuration & Zod environment validation
│   │   │   ├── configuration.ts
│   │   │   └── env.validation.ts
│   │   │
│   │   ├── contracts/                     # Shared TypeScript schemas (Execution contracts, Events)
│   │   │   ├── execution.contract.ts
│   │   │   └── events.contract.ts
│   │   │
│   │   ├── database/                      # Database module & 21 TypeORM entities
│   │   │   ├── database.module.ts
│   │   │   └── entities/                  # Exact PostgreSQL table mappings (synchronize: false)
│   │   │       ├── role.entity.ts
│   │   │       ├── user.entity.ts
│   │   │       ├── user-role.entity.ts
│   │   │       ├── project.entity.ts
│   │   │       ├── project-member.entity.ts
│   │   │       ├── environment.entity.ts
│   │   │       ├── credential.entity.ts
│   │   │       ├── test-dataset.entity.ts
│   │   │       ├── automation-definition.entity.ts
│   │   │       ├── definition-version.entity.ts
│   │   │       ├── schedule.entity.ts
│   │   │       ├── execution.entity.ts
│   │   │       ├── execution-step.entity.ts
│   │   │       ├── execution-log.entity.ts
│   │   │       ├── artifact.entity.ts
│   │   │       ├── dom-snapshot.entity.ts
│   │   │       ├── element-profile.entity.ts
│   │   │       ├── locator-history.entity.ts
│   │   │       ├── healing-event.entity.ts
│   │   │       ├── approval.entity.ts
│   │   │       └── audit-log.entity.ts
│   │   │
│   │   ├── modules/                       # Domain feature modules
│   │   │   ├── auth/                      # JWT auth, password hashing, session guards
│   │   │   ├── users/                     # User management & account status
│   │   │   ├── roles/                     # RBAC roles & permissions
│   │   │   ├── projects/                  # Workspace management & team access
│   │   │   ├── environments/              # Environment configs & encrypted variables
│   │   │   ├── credentials/               # AES-256-GCM secure credential vault
│   │   │   ├── flows/                     # Visual DAG workflows, checksums, execution
│   │   │   ├── test-cases/                # Deterministic test cases & datasets
│   │   │   ├── test-suites/               # Batch regression suites
│   │   │   ├── executions/                # Execution history, step tracking, logs
│   │   │   ├── browser/                   # Interactive sessions, Playwright page manager
│   │   │   ├── actions/                   # Playwright action executor (clicks, inputs)
│   │   │   ├── assertions/                # 13 deterministic assertions
│   │   │   ├── selectors/                 # Deterministic locator fallback resolver
│   │   │   ├── change-detection/          # Elements catalog & self-healing approvals
│   │   │   ├── monitoring/                # Event publisher & WebSocket gateway
│   │   │   ├── reports/                   # Consolidated JSON & executive HTML reports
│   │   │   ├── artifacts/                 # SHA-256 verified binary artifact storage
│   │   │   ├── audit/                     # Audit trail logging & retention policy
│   │   │   └── scheduling/                # Cron schedules & automated runner
│   │   │
│   │   ├── queue/                         # BullMQ queue service & Redis connection
│   │   │   ├── queue.module.ts
│   │   │   └── queue.service.ts
│   │   │
│   │   ├── workers/                       # Dedicated background worker processes
│   │   │   ├── execution.worker.ts        # Playwright browser-execution consumer
│   │   │   └── suite.worker.ts            # Test-suite-execution batch runner
│   │   │
│   │   ├── app.module.ts                  # Root API module (HTTP + WebSocket)
│   │   ├── worker.module.ts               # Standalone Worker module (BullMQ only)
│   │   ├── main.ts                        # HTTP API Server entry point (port 8000)
│   │   └── worker.ts                      # Standalone Worker entry point
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── nest-cli.json
│
├── alembic/                               # Preserved historical Alembic migration files
│   ├── env.py
│   └── versions/                          # Preserved migration revisions (26e1d42bde30, 41b2c589a102)
│
├── backend-python/                        # Archived legacy Python backend (Byte-for-byte reference)
│
├── docker/                                # Production Docker container definitions
│   ├── Dockerfile.backend                 # Multi-stage Playwright + NestJS image
│   └── Dockerfile.frontend                # Next.js production build image
│
├── docs/                                  # Platform architectural & migration documentation
│   ├── architecture/
│   │   ├── SYSTEM_ARCHITECTURE.md
│   │   └── PROJECT_STRUCTURE.md
│   ├── development/
│   │   └── LOCAL_SETUP.md
│   ├── deployment/
│   │   └── DOCKER_DEPLOYMENT.md
│   └── migration/
│       ├── MIGRATION_INVENTORY.md
│       ├── MIGRATION_MAPPING.md
│       ├── DATABASE_MIGRATION.md
│       └── API_COMPATIBILITY.md
│
├── .github/
│   └── workflows/
│       └── ci.yml                         # Automated CI pipeline for Backend & Frontend
│
├── docker-compose.yml                     # 5-service unified production orchestration
├── .env.example                           # Unified environment template
├── Makefile                               # Developer productivity shortcuts
└── README.md                              # Main platform README
```

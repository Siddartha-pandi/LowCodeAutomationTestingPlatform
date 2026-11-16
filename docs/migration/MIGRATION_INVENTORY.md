# MIGRATION INVENTORY: COMPLETE SOURCE CODE AUDIT

**Project:** LowCodeAutomationTestingPlatform (`AutomationTestingWithAgentBrowser`)  
**Phase:** 1 — Complete Source Code Audit & Baseline Inventory  
**Date:** November 2026  
**Status:** Audit Complete  

---

## 1. Executive Summary & Existing System Architecture

The existing repository operates a **two-backend architecture**:
1. **Python FastAPI Backend** (`backend/`):
   - Handles REST endpoints, authentication (JWT + bcrypt), authorization (RBAC), multi-tenant project/workspace access control, environments, credentials vault (AES-256-GCM), flow definitions, test case definitions, test suites, schedules, reports, artifacts, audit logging, interactive browser CLI adapter (`agent-browser`), DOM inspection, recorder sessions, and Celery background workers (`celery_worker` + `celery_beat`).
   - Persists data to PostgreSQL 16 via SQLAlchemy ORM and Alembic migrations.
2. **Node.js NestJS Automation Service** (`automation-service/`):
   - Handles browser execution jobs queued via BullMQ and Redis.
   - Implements native Playwright automation (Chromium, Firefox, WebKit), browser context isolation, SSRF security routing, locator resolution, action execution, assertion verification, flow graph DAG execution, change detection, screenshot/trace artifact generation, and Redis Pub/Sub monitoring events.
3. **Next.js Frontend** (`frontend/`):
   - Next.js 14 / React 18 / Tailwind CSS client interacting with `NEXT_PUBLIC_API_URL` (currently port 8000).

---

## 2. FastAPI API Endpoints Inventory

Total Unique Endpoints Discovered: **106 HTTP & WebSocket Endpoints**

### 2.1 Root & Legacy Endpoints (`backend/main.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `GET` | `/health` | `backend.main.health` | Public | System health check (`{"status": "ok", "engine": "postgresql"}`) |
| `POST` | `/api/auth/register` | `backend.main.legacy_register` | Public | Legacy user registration (accepts `AuthRequest`, returns `AuthResponse`, sets `access_token` cookie) |
| `POST` | `/api/auth/login` | `backend.main.legacy_login` | Public | Legacy user login (accepts `AuthRequest`, returns `AuthResponse`, sets `access_token` cookie) |
| `GET` | `/api/workspaces` | `backend.main.list_workspaces` | Authenticated | Lists workspaces owned by current user |

### 2.2 Authentication & Profile (`backend/app/api/v1/auth.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | `backend.app.api.v1.auth.register` | Public | Enterprise registration (`UserRegisterRequest` -> `TokenResponse`) |
| `POST` | `/api/v1/auth/login` | `backend.app.api.v1.auth.login` | Public | Enterprise login (`UserLoginRequest` -> `TokenResponse`) |
| `GET` | `/api/v1/auth/me` | `backend.app.api.v1.auth.get_current_user_profile` | Authenticated | Retrieves profile of authenticated caller (`UserResponse`) |
| `POST` | `/api/v1/auth/logout` | `backend.app.api.v1.auth.logout` | Authenticated | Clears `access_token` cookie and invalidates session |

### 2.3 Users Management (`backend/app/api/v1/users.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `GET` | `/api/v1/users` | `backend.app.api.v1.users.list_users` | `users:manage` | List all users across the system |
| `GET` | `/api/v1/users/{user_id}` | `backend.app.api.v1.users.get_user` | `users:manage` | Get user details by UUID |
| `PUT` | `/api/v1/users/{user_id}` | `backend.app.api.v1.users.update_user` | `users:manage` | Update user status, name, or role |
| `DELETE` | `/api/v1/users/{user_id}` | `backend.app.api.v1.users.delete_user` | `users:manage` | Soft or hard delete user account |
| `POST` | `/api/v1/users/{user_id}/roles` | `backend.app.api.v1.users.assign_role` | `roles:manage` | Assign RBAC role to user |
| `DELETE` | `/api/v1/users/{user_id}/roles/{role_name}` | `backend.app.api.v1.users.remove_role` | `roles:manage` | Revoke RBAC role from user |

### 2.4 Roles & Permissions (`backend/app/api/v1/roles.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `GET` | `/api/v1/roles` | `backend.app.api.v1.roles.list_roles` | Authenticated | List all predefined and custom RBAC roles |

### 2.5 Projects & Workspaces (`backend/app/api/v1/projects.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `GET` | `/api/v1/projects` | `backend.app.api.v1.projects.list_projects` | Authenticated | List projects owned by or shared with current user |
| `POST` | `/api/v1/projects` | `backend.app.api.v1.projects.create_project` | `projects:manage` | Create new project workspace |
| `GET` | `/api/v1/projects/{project_id}` | `backend.app.api.v1.projects.get_project` | Project Member | Retrieve project details |
| `PUT` | `/api/v1/projects/{project_id}` | `backend.app.api.v1.projects.update_project` | `projects:manage` | Update project metadata |
| `DELETE` | `/api/v1/projects/{project_id}` | `backend.app.api.v1.projects.delete_project` | `projects:manage` | Delete project workspace |
| `GET` | `/api/v1/projects/{project_id}/members` | `backend.app.api.v1.projects.list_project_members` | Project Member | List members belonging to project |
| `POST` | `/api/v1/projects/{project_id}/members` | `backend.app.api.v1.projects.add_project_member` | `projects:manage` | Add user to project with specific role (`viewer`, `developer`, `admin`) |
| `DELETE` | `/api/v1/projects/{project_id}/members/{user_id}` | `backend.app.api.v1.projects.remove_project_member` | `projects:manage` | Remove member from project |

### 2.6 Environments (`backend/app/api/v1/environments.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `GET` | `/api/v1/environments` | `backend.app.api.v1.environments.list_environments` | Project Member | List environments (optionally filtered by `project_id`) |
| `POST` | `/api/v1/environments` | `backend.app.api.v1.environments.create_environment` | `environments:manage` | Create environment (`name`, `base_url`, `allowed_domains`, `variables`) |
| `GET` | `/api/v1/environments/{environment_id}` | `backend.app.api.v1.environments.get_environment` | Project Member | Get environment by ID |
| `PUT` | `/api/v1/environments/{environment_id}` | `backend.app.api.v1.environments.update_environment` | `environments:manage` | Update environment settings |
| `DELETE` | `/api/v1/environments/{environment_id}` | `backend.app.api.v1.environments.delete_environment` | `environments:manage` | Delete environment |

### 2.7 Credentials Vault (`backend/app/api/v1/credentials.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `GET` | `/api/v1/credentials` | `backend.app.api.v1.credentials.list_credentials` | Project Member | List encrypted credentials (secrets masked) |
| `POST` | `/api/v1/credentials` | `backend.app.api.v1.credentials.create_credential` | `credentials:manage` | Store credential (encrypted with AES-256-GCM) |
| `GET` | `/api/v1/credentials/{credential_id}` | `backend.app.api.v1.credentials.get_credential` | Project Member | Get credential metadata (secret masked) |
| `PUT` | `/api/v1/credentials/{credential_id}` | `backend.app.api.v1.credentials.update_credential` | `credentials:manage` | Update credential secret or metadata |
| `DELETE` | `/api/v1/credentials/{credential_id}` | `backend.app.api.v1.credentials.delete_credential` | `credentials:manage` | Delete credential |

### 2.8 Flows & Workflows (`backend/app/api/v1/flows.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `GET` | `/api/v1/flows` | `backend.app.api.v1.flows.list_flows` | `flows:read` | List flow automation definitions |
| `POST` | `/api/v1/flows` | `backend.app.api.v1.flows.create_flow` | `flows:create_edit` | Create new flow with graph definition |
| `GET` | `/api/v1/flows/templates` | `backend.app.api.v1.flows.list_flow_templates` | Authenticated | List predefined flow templates |
| `POST` | `/api/v1/flows/validate` | `backend.app.api.v1.flows.validate_flow_definition` | Authenticated | Validate DAG graph definition integrity and cycles |
| `GET` | `/api/v1/flows/{flow_id}` | `backend.app.api.v1.flows.get_flow` | `flows:read` | Retrieve flow details and active version |
| `PUT` | `/api/v1/flows/{flow_id}` | `backend.app.api.v1.flows.update_flow` | `flows:create_edit` | Update flow definition and save revision |
| `DELETE` | `/api/v1/flows/{flow_id}` | `backend.app.api.v1.flows.delete_flow` | `flows:create_edit` | Delete flow definition |
| `POST` | `/api/v1/flows/{flow_id}/publish` | `backend.app.api.v1.flows.publish_flow_version` | `flows:publish` | Freeze current definition into immutable version |
| `POST` | `/api/v1/flows/{flow_id}/execute` | `backend.app.api.v1.flows.execute_flow_endpoint` | `flows:execute` | Launch flow execution run |

### 2.9 Test Cases & Test Datasets (`backend/app/api/v1/tests.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `GET` | `/api/v1/tests` | `backend.app.api.v1.tests.list_test_cases` | `tests:read` | List test cases (filtered by `project_id`) |
| `POST` | `/api/v1/tests` | `backend.app.api.v1.tests.create_test_case` | `tests:create_edit` | Create test case definition |
| `GET` | `/api/v1/tests/datasets` | `backend.app.api.v1.tests.list_test_datasets` | `tests:read` | List parameterized test datasets |
| `POST` | `/api/v1/tests/datasets` | `backend.app.api.v1.tests.create_test_dataset` | `tests:create_edit` | Create parameterized test dataset |
| `GET` | `/api/v1/tests/datasets/{dataset_id}` | `backend.app.api.v1.tests.get_test_dataset` | `tests:read` | Get dataset details |
| `PUT` | `/api/v1/tests/datasets/{dataset_id}` | `backend.app.api.v1.tests.update_test_dataset` | `tests:create_edit` | Update dataset rows/headers |
| `DELETE` | `/api/v1/tests/datasets/{dataset_id}` | `backend.app.api.v1.tests.delete_test_dataset` | `tests:create_edit` | Delete dataset |
| `POST` | `/api/v1/tests/seed-legacy` | `backend.app.api.v1.tests.seed_legacy_tests_endpoint` | `tests:create_edit` | Seed canonical enterprise tests |
| `GET` | `/api/v1/tests/{test_id}` | `backend.app.api.v1.tests.get_test_case` | `tests:read` | Get test case by ID |
| `PUT` | `/api/v1/tests/{test_id}` | `backend.app.api.v1.tests.update_test_case` | `tests:create_edit` | Update test case definition |
| `DELETE` | `/api/v1/tests/{test_id}` | `backend.app.api.v1.tests.delete_test_case` | `tests:create_edit` | Delete test case |
| `POST` | `/api/v1/tests/{test_id}/publish` | `backend.app.api.v1.tests.publish_test_case` | `tests:publish` | Publish immutable test case version |
| `POST` | `/api/v1/tests/{test_id}/execute` | `backend.app.api.v1.tests.execute_test_case_endpoint` | `tests:execute` | Execute test case with optional dataset row |

### 2.10 Test Suites (`backend/app/api/v1/test_suites.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `GET` | `/api/v1/test-suites` | `backend.app.api.v1.test_suites.list_test_suites` | `tests:read` | List test suites |
| `POST` | `/api/v1/test-suites` | `backend.app.api.v1.test_suites.create_test_suite` | `tests:create_edit` | Create test suite |
| `GET` | `/api/v1/test-suites/{suite_id}` | `backend.app.api.v1.test_suites.get_test_suite` | `tests:read` | Get test suite by ID |
| `PUT` | `/api/v1/test-suites/{suite_id}` | `backend.app.api.v1.test_suites.update_test_suite` | `tests:create_edit` | Update suite tests |
| `DELETE` | `/api/v1/test-suites/{suite_id}` | `backend.app.api.v1.test_suites.delete_test_suite` | `tests:create_edit` | Delete test suite |
| `POST` | `/api/v1/test-suites/{suite_id}/execute` | `backend.app.api.v1.test_suites.execute_test_suite_endpoint` | `tests:execute` | Launch batch execution for all tests in suite |

### 2.11 Schedules (`backend/app/api/v1/schedules.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `GET` | `/api/v1/schedules` | `backend.app.api.v1.schedules.list_schedules` | `schedules:manage` | List scheduled executions |
| `POST` | `/api/v1/schedules` | `backend.app.api.v1.schedules.create_schedule` | `schedules:manage` | Create cron-based schedule (`cron_expression`, `timezone`) |
| `GET` | `/api/v1/schedules/{schedule_id}` | `backend.app.api.v1.schedules.get_schedule` | `schedules:manage` | Get schedule details |
| `PATCH` | `/api/v1/schedules/{schedule_id}` | `backend.app.api.v1.schedules.update_schedule` | `schedules:manage` | Enable, disable, or update schedule |
| `DELETE` | `/api/v1/schedules/{schedule_id}` | `backend.app.api.v1.schedules.delete_schedule` | `schedules:manage` | Delete schedule |
| `POST` | `/api/v1/schedules/evaluate` | `backend.app.api.v1.schedules.evaluate_schedules_now` | `schedules:manage` | Manually trigger schedule evaluation |

### 2.12 Interactive Browser Engine (`backend/app/api/v1/browser.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `GET` | `/api/v1/browser/status` | `backend.app.api.v1.browser.get_browser_status` | Authenticated | Check browser engine CLI / Playwright status |
| `POST` | `/api/v1/browser/test-connection` | `backend.app.api.v1.browser.test_browser_connection` | Authenticated | Test browser binary connectivity |
| `POST` | `/api/v1/browser/launch` | `backend.app.api.v1.browser.launch_session` | Authenticated | Launch interactive browser session |
| `POST` | `/api/v1/browser/navigate` | `backend.app.api.v1.browser.navigate_session` | Session Owner | Navigate active session to URL |
| `POST` | `/api/v1/browser/action` | `backend.app.api.v1.browser.execute_action` | Session Owner | Execute single browser action (click, fill, etc.) |
| `POST` | `/api/v1/browser/screenshot` | `backend.app.api.v1.browser.capture_screenshot` | Session Owner | Capture JPEG/PNG screenshot |
| `GET` | `/api/v1/browser/viewport/{session_id}` | `backend.app.api.v1.browser.get_session_viewport` | Session Owner | Fetch live base64 viewport frame |
| `POST` | `/api/v1/browser/validate-selector` | `backend.app.api.v1.browser.validate_selector_syntax` | Authenticated | Validate selector syntax and strategy |
| `POST` | `/api/v1/browser/test-selector` | `backend.app.api.v1.browser.test_selector_in_session` | Session Owner | Test selector against active page DOM |
| `POST` | `/api/v1/browser/close` | `backend.app.api.v1.browser.close_session` | Session Owner | Close active interactive browser session |

### 2.13 Browser Recorder (`backend/app/api/v1/recorder.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `POST` | `/api/v1/recorder/start` | `backend.app.api.v1.recorder.start_recorder` | `tests:create_edit` | Start recording session at target URL |
| `GET` | `/api/v1/recorder/status` | `backend.app.api.v1.recorder.get_recorder_status` | Session Owner | Get recording progress and action list |
| `POST` | `/api/v1/recorder/action` | `backend.app.api.v1.recorder.record_action` | Session Owner | Record user action (click, input, navigate) |
| `GET` | `/api/v1/recorder/inspect/{session_id}` | `backend.app.api.v1.recorder.inspect_recorder_page` | Session Owner | Inspect interactive elements for recorder |
| `POST` | `/api/v1/recorder/save` | `backend.app.api.v1.recorder.save_recording` | `tests:create_edit` | Save recorded actions as test case or flow |
| `POST` | `/api/v1/recorder/stop` | `backend.app.api.v1.recorder.stop_recorder` | Session Owner | Stop recording and close browser session |

### 2.14 DOM & Intelligence (`backend/app/api/v1/dom.py`, `elements.py`, `healing.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `POST` | `/api/v1/dom/extract` | `backend.app.api.v1.dom.extract_dom` | Authenticated | Deterministic extraction of page elements |
| `POST` | `/api/v1/dom/explore` | `backend.app.api.v1.dom.explore_dom` | Authenticated | Explore page DOM structure and interactive elements |
| `GET` | `/api/v1/elements` | `backend.app.api.v1.elements.list_element_profiles` | `flows:read` | List stored element profiles |
| `POST` | `/api/v1/elements` | `backend.app.api.v1.elements.create_element_profile` | `flows:create_edit` | Register new element profile |
| `GET` | `/api/v1/elements/{profile_id}` | `backend.app.api.v1.elements.get_element_profile` | `flows:read` | Get element profile details and history |
| `PUT` | `/api/v1/elements/{profile_id}` | `backend.app.api.v1.elements.update_element_profile` | `flows:create_edit` | Update element profile locators |
| `DELETE` | `/api/v1/elements/{profile_id}` | `backend.app.api.v1.elements.delete_element_profile` | `flows:create_edit` | Delete element profile |
| `POST` | `/api/v1/elements/{profile_id}/locators` | `backend.app.api.v1.elements.add_locator_to_profile` | `flows:create_edit` | Add fallback locator to profile |
| `GET` | `/api/v1/healing/events` | `backend.app.api.v1.healing.list_healing_events` | `reports:read` | List deterministic self-healing events |
| `GET` | `/api/v1/healing/approvals` | `backend.app.api.v1.healing.list_pending_approvals` | `healing:approve` | List pending human approvals |
| `POST` | `/api/v1/healing/approvals/{approval_id}/respond` | `backend.app.api.v1.healing.respond_to_approval` | `healing:approve` | Approve or reject suggested selector change |
| `POST` | `/api/v1/healing/resolve` | `backend.app.api.v1.healing.resolve_element` | Authenticated | Deterministic locator resolution with fallback |

### 2.15 Executions, Reports & Artifacts (`backend/app/api/v1/executions.py`, `reports.py`, `artifacts.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `GET` | `/api/v1/executions` | `backend.app.api.v1.executions.list_executions` | `reports:read` | List execution runs (status, project filter) |
| `GET` | `/api/v1/executions/{execution_id}` | `backend.app.api.v1.executions.get_execution_detail` | `reports:read` | Get execution steps, timing, and logs |
| `POST` | `/api/v1/executions/{execution_id}/cancel` | `backend.app.api.v1.executions.cancel_execution` | `executions:cancel` | Cancel running or queued execution |
| `DELETE` | `/api/v1/executions/{execution_id}` | `backend.app.api.v1.executions.delete_execution` | `executions:manage` | Delete execution record and artifacts |
| `GET` | `/api/v1/executions/{execution_id}/report` | `backend.app.api.v1.executions.get_execution_report` | `reports:read` | Summary report JSON for execution |
| `GET` | `/api/v1/executions/{execution_id}/report/html` | `backend.app.api.v1.executions.get_execution_html_report` | `reports:read` | Rendered standalone HTML execution report |
| `GET` | `/api/v1/executions/{execution_id}/logs` | `backend.app.api.v1.executions.get_execution_logs` | `reports:read` | Paginated execution log lines |
| `GET` | `/api/v1/executions/{execution_id}/logs/download` | `backend.app.api.v1.executions.download_execution_logs` | `reports:read` | Download logs as .txt or .json |
| `GET` | `/api/v1/executions/{execution_id}/viewport` | `backend.app.api.v1.executions.get_execution_live_viewport` | `reports:read` | Live viewport frame of active execution |
| `GET` | `/api/v1/reports/summary` | `backend.app.api.v1.reports.get_reports_summary` | `reports:read` | Project-wide metrics (pass rate, duration) |
| `GET` | `/api/v1/reports/export-csv` | `backend.app.api.v1.reports.export_reports_csv` | `reports:read` | Export execution metrics as CSV |
| `GET` | `/api/v1/reports/executions/{execution_id}` | `backend.app.api.v1.reports.get_report_by_execution` | `reports:read` | Detailed report summary |
| `GET` | `/api/v1/reports/executions/{execution_id}/html` | `backend.app.api.v1.reports.get_report_html_by_execution` | `reports:read` | HTML report view |
| `GET` | `/api/v1/artifacts/{artifact_id}` | `backend.app.api.v1.artifacts.get_artifact_metadata` | `reports:read` | Get artifact record (screenshot, trace, log) |
| `GET` | `/api/v1/artifacts/{artifact_id}/view` | `backend.app.api.v1.artifacts.view_artifact` | `reports:read` | View artifact inline (image/png, image/jpeg) |
| `GET` | `/api/v1/artifacts/{artifact_id}/download` | `backend.app.api.v1.artifacts.download_artifact` | `reports:read` | Download artifact file (attachment) |
| `GET` | `/api/v1/artifacts/{artifact_id}/verify` | `backend.app.api.v1.artifacts.verify_artifact` | `reports:read` | Verify artifact SHA-256 integrity hash |

### 2.16 Audit & Security (`backend/app/api/v1/audit.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `GET` | `/api/v1/audit` | `backend.app.api.v1.audit.list_audit_logs` | `audit:read` | List structured audit events |
| `GET` | `/api/v1/audit/export` | `backend.app.api.v1.audit.export_audit_logs` | `audit:read` | Export audit trail as CSV or JSON |
| `POST` | `/api/v1/audit/retention/purge` | `backend.app.api.v1.audit.trigger_retention_purge` | `audit:manage` | Manually purge expired logs and artifacts |

### 2.17 WebSocket Live Monitoring (`backend/app/api/v1/ws_monitor.py`)
| Method | Path | Handler | Auth / Permission | Summary & Contract |
|---|---|---|---|---|
| `WS` | `/ws/executions/{execution_id}` | `backend.app.api.v1.ws_monitor.execution_live_monitor_ws` | JWT Query / Cookie / Bearer | Real-time stream of execution events, steps, console logs, and viewport frames |
| `WS` | `/api/v1/ws/executions/{execution_id}` | `backend.app.api.v1.ws_monitor.execution_live_monitor_ws` | JWT Query / Cookie / Bearer | Mounted alias for consistent API prefix |

---

## 3. Database Schema Inventory (PostgreSQL Tables & Alembic Migrations)

### 3.1 Alembic Migration History
1. **Revision `26e1d42bde30`** (`create_initial_enterprise_tables.py`):
   - Created extension `pgcrypto`.
   - Created 19 core tables: `roles`, `users`, `user_roles`, `projects`, `environments`, `credentials`, `automation_definitions`, `definition_versions`, `schedules`, `executions`, `execution_steps`, `execution_logs`, `artifacts`, `dom_snapshots`, `element_profiles`, `locator_history`, `healing_events`, `approvals`, `audit_logs`.
2. **Revision `41b2c589a102`** (`add_project_members_and_test_datasets.py`):
   - Created 2 multi-tenant collaboration tables: `project_members`, `test_datasets`.
   - Total tables in production schema: **21 tables**.

### 3.2 Complete PostgreSQL Tables Specification
| # | Table Name | Primary Key | Foreign Keys | Key Columns | Indexes & Constraints |
|---|---|---|---|---|---|
| 1 | `roles` | `id` (UUID) | None | `name`, `description`, `permissions` (JSONB) | Unique(`name`) |
| 2 | `users` | `id` (UUID) | None | `email`, `password_hash`, `full_name`, `is_active`, `is_superuser` | Unique(`email`), Index(`email`) |
| 3 | `user_roles` | `(user_id, role_id)` | `users.id` (CASCADE), `roles.id` (CASCADE) | `assigned_at` | Composite PK |
| 4 | `projects` | `id` (UUID) | `users.id` (SET NULL) | `name`, `description`, `owner_id` | Index(`name`) |
| 5 | `project_members` | `id` (UUID) | `projects.id` (CASCADE), `users.id` (CASCADE) | `role` (`viewer`, `developer`, `admin`) | Unique(`project_id`, `user_id`), Index(`project_id`), Index(`user_id`) |
| 6 | `environments` | `id` (UUID) | `projects.id` (CASCADE) | `name`, `base_url`, `allowed_domains` (JSONB), `variables` (JSONB) | Index(`project_id`), Index(`name`) |
| 7 | `credentials` | `id` (UUID) | `projects.id` (CASCADE) | `name`, `credential_type`, `username`, `encrypted_secret`, `key_id`, `domain_scope` | Index(`project_id`), Index(`name`) |
| 8 | `test_datasets` | `id` (UUID) | `projects.id` (CASCADE), `users.id` (SET NULL) | `name`, `format`, `headers` (JSONB), `rows` (JSONB), `created_by` | Index(`project_id`), Index(`name`) |
| 9 | `automation_definitions` | `id` (UUID) | `projects.id` (CASCADE) | `name`, `description`, `definition_type` (`flow`/`test`), `active_version_id` | Index(`project_id`), Index(`name`) |
| 10 | `definition_versions` | `id` (UUID) | `automation_definitions.id` (CASCADE), `users.id` (SET NULL) | `version_number`, `definition` (JSONB), `checksum`, `created_by` | Index(`definition_id`), Index(`checksum`) |
| 11 | `schedules` | `id` (UUID) | `automation_definitions.id` (CASCADE), `environments.id` (SET NULL) | `cron_expression`, `timezone`, `enabled`, `last_run_at`, `next_run_at` | Index(`definition_id`), Index(`enabled`) |
| 12 | `executions` | `id` (UUID) | `projects.id` (CASCADE), `automation_definitions.id` (CASCADE), `environments.id` (SET NULL), `users.id` (SET NULL) | `status`, `started_at`, `finished_at`, `duration_ms`, `summary` (JSONB), `session_id` | Index(`project_id`), Index(`status`), Index(`created_at`) |
| 13 | `execution_steps` | `id` (UUID) | `executions.id` (CASCADE) | `step_order`, `node_id`, `name`, `action_type`, `status`, `duration_ms`, `error_message`, `screenshot_path` | Index(`execution_id`), Index(`status`) |
| 14 | `execution_logs` | `id` (UUID) | `executions.id` (CASCADE) | `timestamp`, `level`, `message`, `step_id`, `source` | Index(`execution_id`), Index(`level`) |
| 15 | `artifacts` | `id` (UUID) | `executions.id` (CASCADE) | `name`, `artifact_type`, `file_path`, `file_size_bytes`, `sha256_checksum`, `mime_type` | Index(`execution_id`), Index(`artifact_type`) |
| 16 | `dom_snapshots` | `id` (UUID) | `executions.id` (CASCADE) | `url`, `route_path`, `title`, `element_count`, `elements_data` (JSONB) | Index(`execution_id`) |
| 17 | `element_profiles` | `id` (UUID) | `projects.id` (CASCADE) | `logical_id`, `description`, `element_type`, `locators` (JSONB), `confidence_threshold` | Index(`project_id`), Unique(`project_id`, `logical_id`) |
| 18 | `locator_history` | `id` (UUID) | `element_profiles.id` (CASCADE) | `strategy`, `value`, `success_rate`, `attempts_count`, `last_used_at` | Index(`element_profile_id`) |
| 19 | `healing_events` | `id` (UUID) | `executions.id` (CASCADE), `element_profiles.id` (CASCADE) | `failed_locator`, `healed_locator`, `confidence_score`, `decision`, `diff_analysis` (JSONB) | Index(`execution_id`), Index(`decision`) |
| 20 | `approvals` | `id` (UUID) | `healing_events.id` (CASCADE), `users.id` (SET NULL) | `status` (`pending`, `approved`, `rejected`), `reviewer_notes`, `resolved_at` | Index(`status`) |
| 21 | `audit_logs` | `id` (UUID) | `users.id` (SET NULL) | `action`, `resource_type`, `resource_id`, `client_ip`, `user_agent`, `details` (JSONB), `timestamp` | Index(`action`), Index(`timestamp`), Index(`user_id`) |

---

## 4. Pydantic Schemas Inventory (91 Schemas)

1. **Authentication & User**:
   - `AuthRequest`, `AuthResponse`, `UserLoginRequest`, `UserRegisterRequest`, `TokenResponse`, `UserResponse`, `RoleResponse`, `UserUpdateRequest`, `UserRoleAssignRequest`.
2. **Projects, Environments & Credentials**:
   - `WorkspaceCreate`, `ProjectCreateRequest`, `ProjectUpdateRequest`, `ProjectResponse`, `ProjectMemberCreate`, `ProjectMemberResponse`, `EnvironmentCreateRequest`, `EnvironmentUpdateRequest`, `EnvironmentResponse`, `CredentialCreateRequest`, `CredentialUpdateRequest`, `CredentialResponse`.
3. **Flows & Definitions**:
   - `WorkflowCreate`, `RunResponse`, `FlowCreateRequest`, `FlowUpdateRequest`, `FlowResponse`, `FlowValidationRequest`, `FlowValidationResponse`, `PublishVersionResponse`, `ExecuteFlowRequest`, `FlowGraphDefinition`, `FlowNodeSchema`, `FlowEdgeSchema`.
4. **Testing & Datasets**:
   - `TestCaseCreateRequest`, `TestCaseUpdateRequest`, `TestCaseResponse`, `ExecuteTestRequest`, `SeedLegacyTestsRequest`, `TestDatasetCreate`, `TestDatasetUpdate`, `TestDatasetResponse`, `TestSuiteCreateRequest`, `TestSuiteUpdateRequest`, `TestSuiteResponse`, `ExecuteTestSuiteRequest`.
5. **Executions & Reports**:
   - `ExecutionDetailResponse`, `ExecutionStepResponse`, `ExecutionLogResponse`, `ExecutionSummaryResponse`, `ReportSummaryResponse`, `CancelExecutionResponse`.
6. **Browser & Recorder**:
   - `LaunchSessionRequest`, `NavigateSessionRequest`, `BrowserActionRequest`, `ScreenshotRequest`, `ValidateSelectorRequest`, `TestSelectorRequest`, `CloseSessionRequest`, `StartRecorderPayload`, `RecordActionPayload`, `StopRecorderPayload`, `SaveRecordingPayload`.
7. **DOM & Intelligence**:
   - `DOMExtractRequest`, `DOMExtractResponse`, `DOMExploreRequest`, `ElementProfileCreate`, `ElementProfileUpdate`, `ElementProfileResponse`, `AddLocatorRequest`, `HealingEventResponse`, `ApprovalResponse`, `ApprovalActionRequest`, `ResolveElementRequest`, `ResolveElementResponse`.
8. **Schedules & Audit**:
   - `ScheduleCreateRequest`, `ScheduleUpdateRequest`, `ScheduleResponse`, `AuditLogResponse`, `AuditLogExportResponse`, `RetentionPurgeRequest`, `RetentionPurgeResponse`.

---

## 5. Background & Scheduled Tasks Inventory

### 5.1 Celery Tasks (`backend/app/worker/tasks.py`)
| Task Name | Function | Signature | Purpose & Flow |
|---|---|---|---|
| `worker.execute_flow` | `execute_flow_task` | `(execution_id_str: str, initial_variables: dict \| None = None)` | Executes visual DAG flow graph. Loads DB execution, parses graph, runs steps in isolated browser session, writes step logs/status to DB. |
| `worker.execute_test_case` | `execute_test_case_task` | `(execution_id_str: str, test_data_row: dict \| None = None)` | Executes test case with optional parameterized dataset values. |
| `worker.execute_test_suite` | `execute_test_suite_task` | `(execution_id_str: str)` | Iterates through suite test cases sequentially or in parallel, spawns individual execution runs. |
| `worker.schedule_checker` | `schedule_checker_task` | `()` | Periodic beat task. Queries active schedules, evaluates cron expression against current time, spawns executions. |
| `worker.cleanup_retention` | `cleanup_retention_task` | `(retention_days: int = 30)` | Purges expired logs, artifacts, and screenshots based on data retention policy. |

### 5.2 Celery Beat Periodic Schedule (`backend/app/worker/celery_app.py`)
- `evaluate-scheduled-automations-every-minute`: Runs `worker.schedule_checker` every 60 seconds.
- `daily-artifact-retention-cleanup`: Runs `worker.cleanup_retention` with `(30,)` days retention every 24 hours.

---

## 6. Existing NestJS Automation Service Inventory (`automation-service/`)

### 6.1 Modules & Structure
| Module | Location | Responsibilities |
|---|---|---|
| `AppModule` | `src/app.module.ts` | Imports all modules, currently declares `ExecutionWorker` provider |
| `BrowserModule` | `src/modules/browser/` | `BrowserManagerService`, `ContextManagerService`, `PageManagerService` |
| `SelectorsModule` | `src/modules/selectors/` | `LocatorResolverService` (strictness, priority resolution, fallbacks) |
| `ActionsModule` | `src/modules/actions/` | `ActionExecutorService` (Playwright native click, fill, type, hover, etc.) |
| `AssertionsModule` | `src/modules/assertions/` | `AssertionExecutorService` (visibility, text, enabled, checked, url, title) |
| `ChangeDetectionModule` | `src/modules/change-detection/`| `ChangeDetectorService` (DOM hash diffing, mutation detection) |
| `ScreenshotsModule` | `src/modules/screenshots/` | `ArtifactManagerService` (saving screenshots, traces, videos to storage) |
| `MonitoringModule` | `src/modules/monitoring/` | `EventPublisherService` (publishing execution events to Redis Pub/Sub) |
| `FlowsModule` | `src/modules/flows/` | `FlowExecutorService` (DAG graph traversal, variable interpolation, condition evaluation) |
| `QueueModule` | `src/modules/queue/` | `QueueService` (BullMQ `browser-execution` queue client) |
| `ExecutionModule` | `src/modules/execution/` | `ExecutionController`, `ExecutionService` (submitting & cancelling execution jobs) |
| `Workers` | `src/workers/` | `ExecutionWorker` (BullMQ consumer on `browser-execution`) |

### 6.2 Contracts & DTOs
- `execution.contract.ts`: `ExecuteJobDtoSchema`, `ExecuteJobDto`, `FlowGraphSchema`, `FlowNodeSchema`, `ExecutionJobResult`.
- `events.contract.ts`: `ExecutionEventType` (`STATUS_CHANGE`, `STEP_START`, `STEP_END`, `LOG`, `SCREENSHOT`, `CONSOLE_LOG`), `ExecutionEvent`.

---

## 7. Frontend Integration Inventory (`frontend/src/`)

### 7.1 API Client (`frontend/src/api.ts`)
The frontend wraps all backend communication inside `frontend/src/api.ts`:
- `authApi`: `login`, `register`, `me`.
- `flowsApi`: `list`, `get`, `getTemplates`, `create`, `update`, `publish`, `validate`, `execute`, `delete`.
- `testsApi`: `list`, `get`, `create`, `update`, `publish`, `delete`, `execute`, `seedLegacy`, `listDatasets`, `createDataset`, `updateDataset`, `deleteDataset`.
- `testSuitesApi`: `list`, `get`, `create`, `update`, `delete`, `execute`.
- `executionsApi`: `list`, `get`, `cancel`, `delete`, `getReport`, `getLogs`, `getHtmlReportUrl`, `getLogsDownloadUrl`, `getViewportUrl`.
- `intelligenceApi`: `extractDom`, `exploreDom`, `listElements`, `createElement`, `updateElement`, `deleteElement`, `getElement`, `listHealingEvents`, `listApprovals`, `respondApproval`.
- `projectsApi`: `list`, `get`, `create`, `update`, `delete`, `listMembers`, `addMember`, `removeMember`.
- `environmentsApi`: `list`, `get`, `create`, `update`, `delete`.
- `credentialsApi`: `list`, `get`, `create`, `update`, `delete`.
- `browserApi`: `getStatus`, `testConnection`, `launch`, `navigate`, `action`, `screenshot`, `getViewport`, `validateSelector`, `testSelector`, `close`.
- `recorderApi`: `start`, `status`, `recordAction`, `stop`, `inspect`, `save`.
- `schedulesApi`: `list`, `create`, `update`, `delete`.
- `reportsApi`: `summary`, `exportCsvUrl`.
- `adminApi`: `listUsers`, `updateUser`, `deleteUser`, `listRoles`, `listAuditLogs`, `exportAuditLogsUrl`, `purgeRetention`.

### 7.2 UI Components & Views
- `frontend/src/components/auth/EnterpriseLoginForm.tsx`
- `frontend/src/components/dashboard/DashboardOverview.tsx`
- `frontend/src/components/flows/` (`AllFlowsPage`, `CreateFlowPage`, `VisualFlowBuilder`, `FlowTemplatesPage`, `SchedulesPage`)
- `frontend/src/components/testing/` (`TestCasesPage`, `VisualTestBuilder`, `TestSuitesPage`, `TestDataPage`, `TestReportsPage`)
- `frontend/src/components/executions/` (`RunningExecutionsPage`, `ExecutionHistoryPage`, `ExecutionDetailsPage`, `ExecutionLogsPage`, `ExecutionReportViewer`, `ScreenshotsGalleryPage`)
- `frontend/src/components/browser/` (`LiveBrowserPage`, `LiveBrowserExplorer`, `BrowserRecorderPage`, `DOMExplorerPage`, `ElementProfilesPage`, `ElementRecognitionPage`, `SelfHealingPage`)
- `frontend/src/components/config/` (`ProjectsPage`, `EnvironmentsPage`, `CredentialsPage`, `BrowserSettingsPage`, `ConfigurationView`)
- `frontend/src/components/admin/` (`AdministrationView`, `UsersManagementPage`, `RolesPermissionsPage`, `AuditLogsPage`, `UserProfilePage`)

---

## 8. Docker & Infrastructure Inventory

### 8.1 Existing Services (`docker-compose.yml`)
1. `postgres`: `postgres:16-alpine`, port 5432, volume `postgres_data`.
2. `redis`: `redis:7-alpine`, port 6379.
3. `backend`: FastAPI Python REST server on port 8000.
4. `celery_worker`: Celery background worker for flow execution and browser subprocess isolation.
5. `celery_beat`: Celery beat periodic scheduler.
6. `automation_api`: NestJS automation service HTTP endpoints on port 3001.
7. `automation_worker`: NestJS dedicated Playwright worker (BullMQ consumer).
8. `frontend`: Next.js frontend UI on port 3000.

### 8.2 Environment Variables Inventory
| Variable | Used In | Default / Example Value | Sensitive | Purpose |
|---|---|---|---|---|
| `DATABASE_URL` | Backend, Automation, Celery | `postgresql://postgres:postgres@postgres:5432/automation_platform_db` | Yes | Database connection string |
| `POSTGRES_USER` | Docker, Postgres | `postgres` | No | PostgreSQL user |
| `POSTGRES_PASSWORD` | Docker, Postgres | `postgres` | Yes | PostgreSQL password |
| `POSTGRES_DB` | Docker, Postgres | `automation_platform_db` | No | Database name |
| `REDIS_HOST` | Automation, Backend | `redis` / `127.0.0.1` | No | Redis hostname |
| `REDIS_PORT` | Automation, Backend | `6379` | No | Redis port |
| `REDIS_PASSWORD` | Automation | (optional) | Yes | Redis auth |
| `CELERY_BROKER_URL` | Python Backend, Celery | `redis://redis:6379/0` | No | Celery broker URL (to be replaced with BullMQ) |
| `CELERY_RESULT_BACKEND`| Python Backend, Celery | `redis://redis:6379/0` | No | Celery results (to be replaced with BullMQ) |
| `JWT_SECRET` | Backend | (64-char random string) | Yes | HMAC key for signing JWTs |
| `TOKEN_EXPIRY_MINUTES` | Backend | `480` | No | Token lifetime |
| `APP_ENCRYPTION_KEY` | Backend | (64-hex AES key) | Yes | AES-256-GCM vault master key |
| `CREDENTIALS_MASTER_KEY`| Backend | (alias for APP_ENCRYPTION_KEY) | Yes | Credential encryption key |
| `CORS_ORIGINS` | Backend | `http://localhost:3000,http://127.0.0.1:3000` | No | Allowed CORS origins |
| `STORAGE_DIR` | Backend, Automation | `/app/reports` | No | Directory for traces, reports, screenshots |
| `DEFAULT_TIMEZONE` | Backend | `Asia/Kolkata` | No | Default schedule timezone |
| `ALLOWED_DOMAINS` | Backend | `localhost,127.0.0.1,*.company.internal` | No | Default SSRF domain allowlist |
| `AUTOMATION_ENGINE` | Backend | `playwright` | No | Browser engine selector |
| `AUTOMATION_SERVICE_URL`| Backend | `http://automation_api:3001` | No | Internal HTTP URL (obsolete in unified backend) |
| `INTERNAL_SERVICE_KEY` | Backend, Automation | (32-char key) | Yes | Shared secret for internal calls |
| `WORKER_CONCURRENCY` | Automation, Celery | `2` / `4` | No | Concurrency limit for browser workers |
| `BROWSER_TIMEOUT_MS` | Automation | `30000` | No | Default Playwright timeout |
| `AUTOMATION_SERVICE_PORT`| Automation | `3001` | No | NestJS automation service port |
| `NEXT_PUBLIC_API_URL` | Frontend | `http://localhost:8000` | No | Base API URL for frontend fetch |
| `ZERO_AI_POLICY_ENFORCED`| Backend, Scripts | `true` | No | Enforces Zero-AI compliance policy |

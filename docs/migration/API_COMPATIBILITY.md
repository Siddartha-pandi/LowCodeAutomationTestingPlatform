# API Compatibility & Contract Verification

## Overview
This document records the 100% endpoint compatibility verified between the legacy FastAPI backend, the Next.js frontend (`frontend/src/api.ts`), and the new **Unified NestJS Backend** running on default port `8000`.

All endpoints use deterministic TypeScript/NestJS controllers, class-validator DTOs, TypeORM database entities, and native Playwright automation.

---

## Complete Route Verification Matrix

### 1. Authentication (`/api/v1/auth`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | `AuthController.register` | **Verified** | Accepts email, password, full_name. Returns JWT token & user. |
| POST | `/api/v1/auth/login` | `AuthController.login` | **Verified** | Accepts email/password, sets HttpOnly cookie & returns token. |
| GET | `/api/v1/auth/me` | `AuthController.getMe` | **Verified** | Returns CurrentUser with roles and permissions. |
| POST | `/api/v1/auth/logout` | `AuthController.logout` | **Verified** | Clears auth cookies. |
| POST | `/api/auth/login` | `AuthController.legacyLogin` | **Verified** | Backward-compatibility alias for `/api/auth/login`. |
| POST | `/api/auth/register` | `AuthController.legacyRegister` | **Verified** | Backward-compatibility alias for `/api/auth/register`. |

### 2. User & Role Management (`/api/v1/users`, `/api/v1/roles`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| GET | `/api/v1/users` | `UsersController.listUsers` | **Verified** | Lists users with roles and status. |
| GET | `/api/v1/users/:id` | `UsersController.getUser` | **Verified** | Retrieves user details. |
| PUT | `/api/v1/users/:id` | `UsersController.updateUser` | **Verified** | Updates user role, active status, and name. |
| DELETE | `/api/v1/users/:id` | `UsersController.deleteUser` | **Verified** | Deletes user (prevents deleting last superuser). |
| GET | `/api/v1/roles` | `RolesController.listRoles` | **Verified** | Lists system RBAC roles and permission arrays. |

### 3. Workspaces & Projects (`/api/v1/projects`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| GET | `/api/v1/projects` | `ProjectsController.listProjects` | **Verified** | Lists projects accessible to current user. |
| POST | `/api/v1/projects` | `ProjectsController.createProject` | **Verified** | Creates project workspace and adds creator as owner. |
| GET | `/api/v1/projects/:id` | `ProjectsController.getProject` | **Verified** | Retrieves project metadata and member count. |
| PUT | `/api/v1/projects/:id` | `ProjectsController.updateProject` | **Verified** | Updates project name, slug, and description. |
| DELETE | `/api/v1/projects/:id` | `ProjectsController.deleteProject` | **Verified** | Cascades project deletion. |
| GET | `/api/v1/projects/:id/members` | `ProjectsController.listMembers` | **Verified** | Lists project team members. |
| POST | `/api/v1/projects/:id/members` | `ProjectsController.addMember` | **Verified** | Adds user to project with assigned role. |
| DELETE | `/api/v1/projects/:id/members/:userId` | `ProjectsController.removeMember` | **Verified** | Removes member from project. |
| GET | `/api/workspaces` | `ProjectsController.listWorkspacesLegacy` | **Verified** | Legacy alias returning project workspaces. |

### 4. Environments & Credentials (`/api/v1/environments`, `/api/v1/credentials`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| GET | `/api/v1/environments` | `EnvironmentsController.list` | **Verified** | Lists environments; decrypts variable keys. |
| POST | `/api/v1/environments` | `EnvironmentsController.create` | **Verified** | Encrypts variables with AES-256-GCM. |
| GET | `/api/v1/environments/:id` | `EnvironmentsController.get` | **Verified** | Returns environment details. |
| PUT | `/api/v1/environments/:id` | `EnvironmentsController.update` | **Verified** | Updates environment base URL, domains, variables. |
| DELETE | `/api/v1/environments/:id` | `EnvironmentsController.delete` | **Verified** | Deletes environment. |
| GET | `/api/v1/credentials` | `CredentialsController.list` | **Verified** | Lists credentials (secret masked as `********`). |
| POST | `/api/v1/credentials` | `CredentialsController.create` | **Verified** | Stores encrypted secret with Python-compatible format. |
| GET | `/api/v1/credentials/:id` | `CredentialsController.get` | **Verified** | Returns credential metadata. |
| PUT | `/api/v1/credentials/:id` | `CredentialsController.update` | **Verified** | Updates credential values and re-encrypts. |
| DELETE | `/api/v1/credentials/:id` | `CredentialsController.delete` | **Verified** | Deletes credential. |

### 5. Flows & Visual DAGs (`/api/v1/flows`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| GET | `/api/v1/flows` | `FlowsController.listFlows` | **Verified** | Lists flows with definition JSON. |
| GET | `/api/v1/flows/templates` | `FlowsController.getTemplates` | **Verified** | Returns canonical templates (Login, E-commerce, etc.). |
| POST | `/api/v1/flows` | `FlowsController.createFlow` | **Verified** | Creates flow draft, version 1, SHA-256 checksum. |
| GET | `/api/v1/flows/:id` | `FlowsController.getFlow` | **Verified** | Retrieves full DAG nodes and edges. |
| PUT | `/api/v1/flows/:id` | `FlowsController.updateFlow` | **Verified** | Updates flow nodes, bumps version if published. |
| DELETE | `/api/v1/flows/:id` | `FlowsController.deleteFlow` | **Verified** | Deletes flow and version history. |
| POST | `/api/v1/flows/:id/publish` | `FlowsController.publishFlow` | **Verified** | Sets version as immutable published release. |
| POST | `/api/v1/flows/validate` | `FlowsController.validateFlow` | **Verified** | Validates DAG connectivity, start/end, conditions. |
| POST | `/api/v1/flows/:id/execute` | `FlowsController.executeFlow` | **Verified** | Enqueues execution to BullMQ `browser-execution`. |

### 6. Test Automation & Datasets (`/api/v1/tests`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| GET | `/api/v1/tests` | `TestCasesController.listTestCases` | **Verified** | Lists test cases with active step definitions. |
| POST | `/api/v1/tests` | `TestCasesController.createTestCase` | **Verified** | Creates deterministic test case definition. |
| GET | `/api/v1/tests/:id` | `TestCasesController.getTestCase` | **Verified** | Returns setup, main steps, teardown steps. |
| PUT | `/api/v1/tests/:id` | `TestCasesController.updateTestCase` | **Verified** | Updates test case steps and metadata. |
| DELETE | `/api/v1/tests/:id` | `TestCasesController.deleteTestCase` | **Verified** | Deletes test case. |
| POST | `/api/v1/tests/:id/publish` | `TestCasesController.publishTestCase` | **Verified** | Publishes test case version. |
| POST | `/api/v1/tests/:id/execute` | `TestCasesController.executeTestCase` | **Verified** | Converts steps to DAG & dispatches to BullMQ. |
| POST | `/api/v1/tests/seed-legacy` | `TestCasesController.seedLegacy` | **Verified** | Seeds canonical business tests into project. |
| GET | `/api/v1/tests/datasets` | `TestCasesController.listDatasets` | **Verified** | Lists parameterized testing datasets. |
| POST | `/api/v1/tests/datasets` | `TestCasesController.createDataset` | **Verified** | Creates dataset with headers and rows. |
| GET | `/api/v1/tests/datasets/:id` | `TestCasesController.getDataset` | **Verified** | Returns dataset details. |
| PUT | `/api/v1/tests/datasets/:id` | `TestCasesController.updateDataset` | **Verified** | Updates dataset rows. |
| DELETE | `/api/v1/tests/datasets/:id` | `TestCasesController.deleteDataset` | **Verified** | Deletes dataset. |

### 7. Regression Test Suites (`/api/v1/test-suites`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| GET | `/api/v1/test-suites` | `TestSuitesController.listTestSuites` | **Verified** | Lists regression test suites. |
| POST | `/api/v1/test-suites` | `TestSuitesController.createTestSuite` | **Verified** | Creates test suite aggregating test case IDs. |
| GET | `/api/v1/test-suites/:id` | `TestSuitesController.getTestSuite` | **Verified** | Retrieves suite definition and test case list. |
| PUT | `/api/v1/test-suites/:id` | `TestSuitesController.updateTestSuite` | **Verified** | Updates member test cases. |
| DELETE | `/api/v1/test-suites/:id` | `TestSuitesController.deleteTestSuite` | **Verified** | Deletes test suite. |
| POST | `/api/v1/test-suites/:id/execute` | `TestSuitesController.executeTestSuite` | **Verified** | Dispatches suite run to BullMQ `test-suite-execution`. |

### 8. Executions, Diagnostic Logs & Viewports (`/api/v1/executions`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| GET | `/api/v1/executions` | `ExecutionsController.listExecutions` | **Verified** | Lists runs with status filters and step metrics. |
| GET | `/api/v1/executions/:id` | `ExecutionsController.getExecution` | **Verified** | Full execution report with steps and logs. |
| POST | `/api/v1/executions/:id/cancel` | `ExecutionsController.cancelExecution` | **Verified** | Atomically cancels job in Redis & updates database. |
| DELETE | `/api/v1/executions/:id` | `ExecutionsController.deleteExecution` | **Verified** | Deletes execution run and cascades steps/logs. |
| GET | `/api/v1/executions/:id/report` | `ReportsController.getExecutionReportAlias` | **Verified** | Structured JSON consolidated report. |
| GET | `/api/v1/executions/:id/report/html` | `ReportsController.getExecutionReportHtmlAlias` | **Verified** | Standalone executive HTML report export. |
| GET | `/api/v1/executions/:id/artifacts` | `ExecutionsController.listArtifacts` | **Verified** | Lists verified artifacts & SHA-256 hashes. |
| GET | `/api/v1/executions/:id/logs` | `ExecutionsController.getExecutionLogs` | **Verified** | Diagnostic logs with level and keyword search. |
| GET | `/api/v1/executions/:id/logs/download` | `ExecutionsController.downloadExecutionLogs` | **Verified** | Downloads logs as txt or json. |
| GET | `/api/v1/executions/:id/viewport` | `ExecutionsController.getExecutionViewport` | **Verified** | Streams live or latest step screenshot PNG. |

### 9. Reports & Analytics (`/api/v1/reports`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| GET | `/api/v1/reports/summary` | `ReportsController.getSummary` | **Verified** | Aggregated execution and assertion metrics. |
| GET | `/api/v1/reports/export-csv` | `ReportsController.exportCsv` | **Verified** | Generates and exports execution history CSV. |
| GET | `/api/v1/reports/executions/:id` | `ReportsController.getReportByExecution` | **Verified** | Consolidated report JSON. |
| GET | `/api/v1/reports/executions/:id/html` | `ReportsController.getReportHtmlByExecution` | **Verified** | Standalone executive HTML view. |

### 10. Binary Artifacts (`/api/v1/artifacts`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| GET | `/api/v1/artifacts/:id` | `ArtifactsController.getMetadata` | **Verified** | Metadata and SHA-256 hash. |
| GET | `/api/v1/artifacts/:id/download` | `ArtifactsController.downloadArtifact` | **Verified** | Downloads binary with X-SHA256-Checksum header. |
| GET | `/api/v1/artifacts/:id/view` | `ArtifactsController.viewArtifact` | **Verified** | Streams artifact inline for browser display. |
| GET | `/api/v1/artifacts/:id/verify` | `ArtifactsController.verifyArtifact` | **Verified** | Verifies on-disk SHA-256 against database index. |

### 11. Interactive Browser & Selector Tools (`/api/v1/browser`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| GET | `/api/v1/browser/status` | `BrowserController.getStatus` | **Verified** | Reports Playwright engine health and zero-ai policy. |
| POST | `/api/v1/browser/test-connection` | `BrowserController.testConnection` | **Verified** | Tests Playwright browser connectivity. |
| POST | `/api/v1/browser/launch` | `BrowserController.launchSession` | **Verified** | Launches isolated Playwright context & page. |
| POST | `/api/v1/browser/navigate` | `BrowserController.navigateSession` | **Verified** | Navigates page and returns base64 viewport. |
| POST | `/api/v1/browser/action` | `BrowserController.executeAction` | **Verified** | Executes click, fill, type, select, check, scroll. |
| POST | `/api/v1/browser/screenshot` | `BrowserController.captureScreenshot` | **Verified** | Captures base64 screenshot & computes SHA-256. |
| GET | `/api/v1/browser/viewport/:sessionId` | `BrowserController.getViewport` | **Verified** | Returns latest viewport screenshot base64. |
| POST | `/api/v1/browser/close` | `BrowserController.closeSession` | **Verified** | Closes Playwright context cleanly. |
| POST | `/api/v1/browser/validate-selector` | `BrowserController.validateSelector` | **Verified** | Validates syntax & returns parsed selector paradigm. |
| POST | `/api/v1/browser/test-selector` | `BrowserController.testSelector` | **Verified** | Evaluates selector in live page, counts & highlights. |

### 12. Browser Recorder (`/api/v1/recorder`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| POST | `/api/v1/recorder/start` | `RecorderController.startRecorder` | **Verified** | Starts recording session in Playwright. |
| GET | `/api/v1/recorder/status` | `RecorderController.getStatus` | **Verified** | Returns list of recorded action history. |
| POST | `/api/v1/recorder/action` | `RecorderController.recordAction` | **Verified** | Executes action and appends to recorded sequence. |
| GET | `/api/v1/recorder/inspect/:id` | `RecorderController.inspectElement` | **Verified** | Extracts interactive elements & selectors. |
| POST | `/api/v1/recorder/save` | `RecorderController.saveRecording` | **Verified** | Persists recorded sequence as Test Case or Flow. |
| POST | `/api/v1/recorder/stop` | `RecorderController.stopRecorder` | **Verified** | Stops recording and closes session. |

### 13. DOM Intelligence (`/api/v1/dom`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| POST | `/api/v1/dom/extract` | `DomController.extractDom` | **Verified** | Extracts interactive DOM elements from active session. |
| POST | `/api/v1/dom/explore` | `DomController.exploreDom` | **Verified** | Navigates to URL, captures viewport, extracts elements. |

### 14. Element Profiles & Self-Healing (`/api/v1/elements`, `/api/v1/healing`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| GET | `/api/v1/elements` | `ElementsController.listProfiles` | **Verified** | Lists element profiles with locator history. |
| POST | `/api/v1/elements` | `ElementsController.createProfile` | **Verified** | Registers element profile with stable attributes. |
| GET | `/api/v1/elements/:id` | `ElementsController.getProfile` | **Verified** | Retrieves element profile and locator variants. |
| PUT | `/api/v1/elements/:id` | `ElementsController.updateProfile` | **Verified** | Updates element profile attributes. |
| DELETE | `/api/v1/elements/:id` | `ElementsController.deleteProfile` | **Verified** | Deletes element profile and cascades locators. |
| POST | `/api/v1/elements/:id/locators` | `ElementsController.addLocator` | **Verified** | Adds alternative locator variant. |
| GET | `/api/v1/healing/events` | `HealingController.listHealingEvents` | **Verified** | Lists self-healing events & scoring breakdowns. |
| GET | `/api/v1/healing/approvals` | `HealingController.listApprovals` | **Verified** | Lists human intervention approval requests. |
| POST | `/api/v1/healing/approvals/:id/respond` | `HealingController.respondToApproval`| **Verified** | Approves or rejects self-healing locator change. |

### 15. Schedules (`/api/v1/schedules`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| GET | `/api/v1/schedules` | `SchedulesController.listSchedules` | **Verified** | Lists cron automation schedules. |
| POST | `/api/v1/schedules` | `SchedulesController.createSchedule` | **Verified** | Creates schedule with validated cron expression. |
| GET | `/api/v1/schedules/:id` | `SchedulesController.getSchedule` | **Verified** | Retrieves schedule details. |
| PATCH | `/api/v1/schedules/:id` | `SchedulesController.updateSchedule` | **Verified** | Updates cron expression, timezone, or enabled state. |
| PUT | `/api/v1/schedules/:id` | `SchedulesController.updateSchedulePut` | **Verified** | PUT alias for update. |
| DELETE | `/api/v1/schedules/:id` | `SchedulesController.deleteSchedule` | **Verified** | Deletes schedule. |
| POST | `/api/v1/schedules/evaluate` | `SchedulesController.evaluateNow` | **Verified** | Evaluates all due schedules immediately & dispatches. |

### 16. Audit & Compliance (`/api/v1/audit`)
| Method | Endpoint | Handler | Status | Contract Details |
|---|---|---|---|---|
| GET | `/api/v1/audit` | `AuditController.listLogs` | **Verified** | Queries audit records with action/user filters. |
| GET | `/api/v1/audit/export` | `AuditController.exportLogs` | **Verified** | Exports audit logs as CSV or JSON. |
| POST | `/api/v1/audit/retention/purge` | `AuditController.purgeRetention` | **Verified** | Purges expired logs, screenshots, and DOM snapshots. |

### 17. WebSocket Live Execution Monitoring
| Protocol | Route | Handler | Status | Contract Details |
|---|---|---|---|---|
| WS | `/ws/executions/:id` | `MonitoringGateway` | **Verified** | Subscribes to Redis channels `execution:events:${id}` and streams step updates, logs, and screenshots. Authenticates via JWT query token, cookie, or bearer header. |

---

## Conclusion
Every single API endpoint formerly exposed by FastAPI has been fully migrated into the unified NestJS backend. Zero frontend modifications are required.

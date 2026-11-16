# REST API Reference Specification

## Overview
The **Unified NestJS Backend** exposes a standardized, high-performance RESTful API running on port `8000` (configurable via `APP_PORT`).

Interactive Swagger / OpenAPI UI is accessible at:
```
http://localhost:8000/api/docs
```

## Global Authentication & Headers
- **Bearer Token**: `Authorization: Bearer <jwt_token>`
- **Cookie Authentication**: Automatic parsing of `access_token` HttpOnly cookie.
- **Content-Type**: `application/json` (except multipart file uploads at `/api/v1/artifacts/upload`).

---

## 1. Authentication (`/api/v1/auth`)

### `POST /api/v1/auth/register` (also `/api/auth/register`)
Register a new platform user.
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!",
    "full_name": "Jane Doe"
  }
  ```
- **Response `201`**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Jane Doe",
      "is_active": true,
      "roles": ["viewer"]
    }
  }
  ```

### `POST /api/v1/auth/login` (also `/api/auth/login`)
Authenticate user credentials and obtain JWT token / cookie.
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Response `200`**:
  Sets `access_token` cookie and returns token and user payload.

### `GET /api/v1/auth/me`
Retrieve profile, roles, and permissions of the currently authenticated user.
- **Response `200`**:
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Jane Doe",
    "is_active": true,
    "is_superuser": false,
    "roles": ["tester"],
    "permissions": ["test:read", "test:execute"]
  }
  ```

### `POST /api/v1/auth/logout`
Invalidates authentication session and clears client cookies.

---

## 2. Workspaces & Projects (`/api/v1/projects`)

### `GET /api/v1/projects` (also `/api/workspaces`, `/api/v1/workspaces`)
List all projects accessible to the authenticated user.

### `POST /api/v1/projects`
Create a new project workspace.
- **Body**:
  ```json
  {
    "name": "E-Commerce Checkout Suite",
    "description": "End-to-end regression testing for storefront"
  }
  ```

### `GET /api/v1/projects/:id`
Get project details and metadata.

### `PUT /api/v1/projects/:id`
Update project title and description.

### `DELETE /api/v1/projects/:id`
Permanently delete project workspace and associated resources (Owner or Superadmin only).

### `GET /api/v1/projects/:id/members`
List project collaborators and assigned workspace roles (`admin`, `editor`, `viewer`).

### `POST /api/v1/projects/:id/members`
Add a user to a project with a specific role.

### `DELETE /api/v1/projects/:id/members/:userId`
Remove a user from project workspace access.

---

## 3. Environments & Cryptographic Vault (`/api/v1/environments`, `/api/v1/credentials`)

### `GET /api/v1/environments`
List test environments. Variable keys are returned with encrypted values secured.

### `POST /api/v1/environments`
Create an environment with AES-256-GCM encrypted variables.
- **Body**:
  ```json
  {
    "project_id": "uuid",
    "name": "Staging",
    "base_url": "https://staging.example.com",
    "variables": {
      "API_KEY": "secret-value"
    }
  }
  ```

### `GET /api/v1/credentials`
List project credentials (secret strings masked as `********`).

### `POST /api/v1/credentials`
Store encrypted credential (e.g. basic auth, tokens, certificates).

---

## 4. Flows & Directed Acyclic Graphs (`/api/v1/flows`)

### `GET /api/v1/flows?project_id=:projectId`
List all automated test flows for a project.

### `POST /api/v1/flows`
Create a test flow with versioned graph definition.
- **Body**:
  ```json
  {
    "project_id": "uuid",
    "name": "User Registration & Onboarding",
    "definition": {
      "nodes": [
        { "id": "n1", "type": "navigate", "data": { "url": "/register" } },
        { "id": "n2", "type": "fill", "data": { "selector": "#email", "value": "test@test.com" } }
      ],
      "edges": [
        { "source": "n1", "target": "n2" }
      ]
    }
  }
  ```

### `GET /api/v1/flows/:id`
Retrieve flow definition and latest version.

### `PUT /api/v1/flows/:id`
Update flow definition (automatically calculates deterministic SHA-256 checksum and creates a new immutable version if modified).

### `POST /api/v1/flows/:id/execute`
Enqueue flow execution into BullMQ worker queue.

---

## 5. Test Cases & Test Suites (`/api/v1/tests`, `/api/v1/test-suites`)

### `GET /api/v1/tests` (also `/api/v1/test-cases`)
List test cases with filters (`project_id`, `tag`, `status`).

### `POST /api/v1/tests`
Create a structured test case.

### `POST /api/v1/tests/:id/execute`
Trigger immediate execution of a test case.

### `GET /api/v1/test-suites`
List test suites.

### `POST /api/v1/test-suites`
Create a test suite grouping multiple flows/tests.

### `POST /api/v1/test-suites/:id/execute`
Enqueue all tests in the suite for parallel or sequential execution across browser workers.

---

## 6. Executions & Live Status (`/api/v1/executions`)

### `GET /api/v1/executions?project_id=:projectId`
List execution history with status, pass rates, durations, and triggers.

### `GET /api/v1/executions/:id`
Get real-time execution status and summary metrics.

### `GET /api/v1/executions/:id/steps`
Retrieve step-by-step action breakdown, durations, inputs, outputs, and errors.

### `GET /api/v1/executions/:id/logs`
Retrieve execution logs streamed during execution.

### `POST /api/v1/executions/:id/cancel`
Signal running browser worker to abort execution gracefully.

### `DELETE /api/v1/executions/:id`
Delete execution run and its associated artifacts.

---

## 7. Reports & Artifacts (`/api/v1/reports`, `/api/v1/artifacts`)

### `GET /api/v1/reports/execution/:id`
Returns consolidated JSON execution report with step metrics and error traces.

### `GET /api/v1/reports/execution/:id/html`
Download or preview complete self-contained HTML execution audit report.

### `GET /api/v1/artifacts/:id`
Get artifact metadata (file size, mime type, SHA-256).

### `GET /api/v1/artifacts/:id/download`
Download stored artifact (screenshot, Playwright trace, video, HAR) with path traversal security enforcement.

---

## 8. Element Profiling & Deterministic Healing (`/api/v1/elements`, `/api/v1/healing`)

### `GET /api/v1/elements?project_id=:projectId`
List registered element profiles and historical locator stability scores.

### `GET /api/v1/healing/events?execution_id=:executionId`
List self-healing events triggered during execution.

### `POST /api/v1/healing/:id/approve`
Approve a deterministic locator candidate to update the baseline selector.

---

## 9. Scheduling & Cron Triggers (`/api/v1/schedules`)

### `GET /api/v1/schedules?project_id=:projectId`
List active scheduled execution triggers.

### `POST /api/v1/schedules`
Create cron schedule:
- **Body**:
  ```json
  {
    "project_id": "uuid",
    "definition_id": "uuid",
    "cron_expression": "0 2 * * *",
    "timezone": "UTC"
  }
  ```

---

## 10. WebSockets & Real-Time Monitoring
- `/ws/monitoring`: Global event streaming for test starts, step updates, completions.
- `/ws/executions/:id`: Live console logs, screenshots, and progress updates for a specific execution.

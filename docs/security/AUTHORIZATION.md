# Authorization & Multi-Tenant Isolation — LowCodeAutomationTestingPlatform

## 1. Identity Standardization

`JwtStrategy.validate()` attaches `{ id, email, fullName, isActive, isSuperuser, roles, permissions }` to `request.user`.
All controllers consistently pass `user.id` and `user.isSuperuser` (zero remaining `user.userId` references).

## 2. Project-Level Multi-Tenant Isolation (`ProjectsService`)

- `ProjectsService.verifyProjectAccess(projectId, userId, isSuperuser)` verifies project ownership or `project_members` membership, returning `false` immediately if `userId` is empty/missing.
- `ProjectsService.verifyProjectAdmin()` restricts adding/removing project members to project owners, `'admin'` project members, or superusers.
- Enforced across all project-scoped resources:
  - Projects & Environments (`ProjectsController`, `EnvironmentsController`)
  - Flows, Test Cases, Test Suites, Datasets (`FlowsController`, `TestCasesController`, `TestSuitesController`), including verifying `environment_id` belongs to the same project on execution
  - Executions, Logs, Artifacts, Reports (`ExecutionsController`, `ArtifactsController`, `ReportsController`)
  - Credentials (`CredentialsController`)
  - Schedules (`SchedulesController`)
  - Interactive Browser Sessions, Recorder, DOM Explorer (`BrowserController`, `RecorderController`, `DomController`)
  - Element Profiles & Self-Healing (`ElementsController`, `HealingController`)
  - WebSocket execution monitoring (`MonitoringGateway`)

## 3. RBAC Enforcement (`RbacGuard` + `@RequirePermissions`)

- `UsersController`: `users:manage`, `roles:manage`
- `AuditController`: `users:manage` across list, export, and retention purge
- `SchedulesController.evaluateNow`: `users:manage`
- `HealingController.respondToApproval`: `healing:approve`

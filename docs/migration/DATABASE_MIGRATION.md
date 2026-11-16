# DATABASE MIGRATION STRATEGY & SCHEMA MAPPING

**Project:** LowCodeAutomationTestingPlatform (`AutomationTestingWithAgentBrowser`)  
**Phase:** 3 — Database Migration & Entity Mapping  
**Date:** November 2026  
**Status:** Entities Fully Mapped & Verified  

---

## 1. Database Access Strategy & ORM Selection

### Selected Strategy: TypeORM with `synchronize: false`
- **Engine:** PostgreSQL 16 (strict PostgreSQL requirement; SQLite is strictly prohibited).
- **Access Framework:** TypeORM with `@nestjs/typeorm`.
- **Schema Ownership:** `synchronize: false` is permanently enforced. The database schema is **never** auto-synchronized, ensuring zero risk of table truncation, dropping, or data corruption in staging or production.
- **Migration History:** Existing Alembic migrations (`26e1d42bde30` and `41b2c589a102`) remain preserved as the historical baseline. Future migrations are authored using TypeORM versioned migrations without altering existing table structures.

---

## 2. Table-by-Table Schema Mapping

All 21 production PostgreSQL tables are mapped 1-to-1 to TypeORM entities in `backend/src/database/entities/`.

| # | PostgreSQL Table | TypeORM Entity | Primary Key | Foreign Key Relations | Key Columns & Constraints |
|---|---|---|---|---|---|
| 1 | `roles` | `RoleEntity` | `id` (UUID) | None | `name` (unique, indexed), `description`, `permissions` (JSONB) |
| 2 | `users` | `UserEntity` | `id` (UUID) | `ManyToMany` -> `RoleEntity` via `user_roles` | `email` (unique, indexed), `password_hash`, `full_name`, `is_active`, `is_superuser`, `created_at`, `updated_at` |
| 3 | `user_roles` | `UserRoleEntity` | `(user_id, role_id)` | `users.id` (CASCADE), `roles.id` (CASCADE) | Composite PK, `assigned_at` |
| 4 | `projects` | `ProjectEntity` | `id` (UUID) | `users.id` (SET NULL) | `name` (indexed), `description`, `owner_id`, `created_at`, `updated_at` |
| 5 | `project_members` | `ProjectMemberEntity` | `id` (UUID) | `projects.id` (CASCADE), `users.id` (CASCADE) | Unique(`project_id`, `user_id`), `role` (`viewer`, `developer`, `admin`) |
| 6 | `environments` | `EnvironmentEntity` | `id` (UUID) | `projects.id` (CASCADE) | `name`, `base_url`, `allowed_domains` (JSONB), `variables_encrypted` (Text) |
| 7 | `credentials` | `CredentialEntity` | `id` (UUID) | `projects.id` (CASCADE) | `name`, `credential_type`, `username`, `secret_encrypted` (AES-256-GCM ciphertext), `domain_scope` |
| 8 | `test_datasets` | `TestDatasetEntity` | `id` (UUID) | `projects.id` (CASCADE), `users.id` (SET NULL) | `name`, `format`, `headers` (JSONB), `rows` (JSONB), `created_by` |
| 9 | `automation_definitions`| `AutomationDefinitionEntity`| `id` (UUID) | `projects.id` (CASCADE), `users.id` (SET NULL) | `type` (`flow`/`test`), `name`, `description`, `status`, `current_version_id` |
| 10 | `definition_versions` | `DefinitionVersionEntity` | `id` (UUID) | `automation_definitions.id` (CASCADE), `users.id` (SET NULL) | `version_num`, `definition_json` (JSONB), `checksum_sha256`, `is_published`, `published_at` |
| 11 | `schedules` | `ScheduleEntity` | `id` (UUID) | `automation_definitions.id` (CASCADE), `environments.id` (SET NULL) | `cron_expression`, `timezone`, `is_enabled`, `last_run_at`, `next_run_at` |
| 12 | `executions` | `ExecutionEntity` | `id` (UUID) | `projects.id`, `automation_definitions.id`, `definition_versions.id`, `environments.id`, `users.id` | `status`, `session_id`, `trigger_type`, `started_at`, `completed_at`, `duration_ms`, `summary` (JSONB) |
| 13 | `execution_steps` | `ExecutionStepEntity` | `id` (UUID) | `executions.id` (CASCADE) | `step_index`, `node_id`, `step_type`, `action`, `status`, `input_data` (JSONB), `result_data` (JSONB), `error_message`, `duration_ms`, `screenshot_path` |
| 14 | `execution_logs` | `ExecutionLogEntity` | `id` (UUID) | `executions.id` (CASCADE) | `step_id`, `level`, `message`, `is_redacted`, `timestamp` |
| 15 | `artifacts` | `ArtifactEntity` | `id` (UUID) | `executions.id` (CASCADE) | `artifact_type`, `file_path`, `file_size_bytes`, `mime_type`, `sha256_hash` |
| 16 | `dom_snapshots` | `DOMSnapshotEntity` | `id` (UUID) | `executions.id` (CASCADE) | `page_url`, `snapshot_path`, `element_count` |
| 17 | `element_profiles` | `ElementProfileEntity` | `id` (UUID) | `projects.id` (CASCADE) | Unique(`project_id`, `logical_id`), `description`, `element_type`, `page_context`, `stable_attributes` (JSONB), `structural_fingerprint` (JSONB) |
| 18 | `locator_history` | `LocatorHistoryEntity` | `id` (UUID) | `element_profiles.id` (CASCADE) | `locator_type`, `locator_value`, `success_count`, `last_verified_at` |
| 19 | `healing_events` | `HealingEventEntity` | `id` (UUID) | `executions.id` (CASCADE), `element_profiles.id` (CASCADE) | `original_locator`, `healed_locator`, `confidence_score`, `scoring_breakdown` (JSONB), `decision`, `is_approved`, `timestamp` |
| 20 | `approvals` | `ApprovalEntity` | `id` (UUID) | `healing_events.id` (CASCADE), `users.id` (SET NULL) | `status` (`pending`, `approved`, `rejected`), `comment`, `responded_at` |
| 21 | `audit_logs` | `AuditLogEntity` | `id` (UUID) | `users.id` (SET NULL) | `action`, `resource_type`, `resource_id`, `client_ip`, `details` (JSONB), `timestamp` |

---

## 3. Data Integrity & Safety Guarantees

1. **Exact Column Naming:**
   Column names in TypeORM entities strictly match existing PostgreSQL column names (e.g., `current_version_id`, `version_num`, `definition_json`, `checksum_sha256`, `is_enabled`, `variables_encrypted`, `secret_encrypted`, `sha256_hash`).
2. **UUID Generation:**
   Primary keys use standard PostgreSQL `gen_random_uuid()` (or `uuid_generate_v4()`), matching Alembic's `pgcrypto` setup.
3. **Timezone Handling:**
   All datetime columns are mapped to `timestamptz` (Timestamp with Time Zone) to ensure consistent UTC serialization and ISO 8601 formatting.
4. **Zero Schema Modification:**
   Running tests and applications with `synchronize: false` ensures that existing records, tables, foreign keys, and indexes in PostgreSQL are never mutated or dropped.

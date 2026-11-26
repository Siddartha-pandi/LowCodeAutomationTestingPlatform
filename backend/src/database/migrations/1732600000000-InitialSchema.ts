import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1732600000000 implements MigrationInterface {
  name = 'InitialSchema1732600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(64) NOT NULL,
        "description" text,
        "permissions" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" varchar(320) NOT NULL,
        "password_hash" varchar(256) NOT NULL,
        "full_name" varchar(160),
        "is_active" boolean NOT NULL DEFAULT true,
        "is_superuser" boolean NOT NULL DEFAULT false,
        "reset_password_token" varchar(256),
        "reset_password_expires" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_roles" (
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        "assigned_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(160) NOT NULL,
        "description" text,
        "owner_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_projects_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_projects_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" varchar(32) NOT NULL DEFAULT 'viewer',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_members_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_project_user_member" UNIQUE ("project_id", "user_id"),
        CONSTRAINT "FK_project_members_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "environments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "name" varchar(80) NOT NULL,
        "base_url" varchar(512),
        "allowed_domains" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "variables_encrypted" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_environments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_environments_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "credentials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "credential_type" varchar(32) NOT NULL,
        "username" varchar(256),
        "secret_encrypted" text NOT NULL,
        "domain_scope" varchar(256),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_credentials_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_credentials_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "test_datasets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "name" varchar(160) NOT NULL,
        "description" text,
        "format" varchar(32) NOT NULL DEFAULT 'json',
        "headers" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "rows" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_test_datasets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_test_datasets_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_test_datasets_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "automation_definitions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "type" varchar(32) NOT NULL DEFAULT 'flow',
        "name" varchar(200) NOT NULL,
        "description" text,
        "status" varchar(32) NOT NULL DEFAULT 'draft',
        "current_version_id" uuid,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_automation_definitions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_automation_definitions_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_automation_definitions_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "definition_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "definition_id" uuid NOT NULL,
        "version_num" int NOT NULL,
        "definition_json" jsonb NOT NULL,
        "checksum_sha256" varchar(64) NOT NULL,
        "is_published" boolean NOT NULL DEFAULT false,
        "published_by" uuid,
        "published_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_definition_versions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_definition_versions_def" FOREIGN KEY ("definition_id") REFERENCES "automation_definitions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_definition_versions_pub" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "schedules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "definition_id" uuid NOT NULL,
        "environment_id" uuid,
        "cron_expression" varchar(64) NOT NULL,
        "timezone" varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
        "is_enabled" boolean NOT NULL DEFAULT true,
        "last_run_at" timestamptz,
        "next_run_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_schedules_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_schedules_def" FOREIGN KEY ("definition_id") REFERENCES "automation_definitions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_schedules_env" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "executions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "definition_id" uuid NOT NULL,
        "definition_version_id" uuid,
        "environment_id" uuid,
        "trigger_type" varchar(32) NOT NULL DEFAULT 'manual',
        "triggered_by" uuid,
        "status" varchar(32) NOT NULL DEFAULT 'queued',
        "session_id" varchar(64),
        "started_at" timestamptz,
        "completed_at" timestamptz,
        "duration_ms" double precision NOT NULL DEFAULT 0,
        "summary" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_executions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_executions_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_executions_def" FOREIGN KEY ("definition_id") REFERENCES "automation_definitions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_executions_ver" FOREIGN KEY ("definition_version_id") REFERENCES "definition_versions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_executions_env" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_executions_user" FOREIGN KEY ("triggered_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "execution_steps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "execution_id" uuid NOT NULL,
        "step_index" int NOT NULL,
        "node_id" varchar(64) NOT NULL,
        "step_type" varchar(64) NOT NULL DEFAULT 'action',
        "action" varchar(64),
        "status" varchar(32) NOT NULL DEFAULT 'pending',
        "input_data" jsonb,
        "result_data" jsonb,
        "error_message" text,
        "duration_ms" double precision NOT NULL DEFAULT 0,
        "screenshot_path" varchar(512),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_execution_steps_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_execution_steps_exec" FOREIGN KEY ("execution_id") REFERENCES "executions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "execution_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "execution_id" uuid NOT NULL,
        "step_id" uuid,
        "level" varchar(16) NOT NULL DEFAULT 'info',
        "message" text NOT NULL,
        "is_redacted" boolean NOT NULL DEFAULT false,
        "timestamp" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_execution_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_execution_logs_exec" FOREIGN KEY ("execution_id") REFERENCES "executions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "artifacts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "execution_id" uuid NOT NULL,
        "artifact_type" varchar(32) NOT NULL,
        "file_path" varchar(512) NOT NULL,
        "file_size_bytes" bigint NOT NULL DEFAULT 0,
        "mime_type" varchar(64),
        "sha256_hash" varchar(64),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_artifacts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_artifacts_exec" FOREIGN KEY ("execution_id") REFERENCES "executions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dom_snapshots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "execution_id" uuid NOT NULL,
        "page_url" varchar(1024) NOT NULL,
        "snapshot_path" varchar(512) NOT NULL,
        "element_count" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dom_snapshots_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dom_snapshots_exec" FOREIGN KEY ("execution_id") REFERENCES "executions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "element_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "project_id" uuid NOT NULL,
        "logical_id" varchar(120) NOT NULL,
        "description" varchar(256),
        "element_type" varchar(64) NOT NULL,
        "page_context" varchar(120),
        "original_text" varchar(256),
        "stable_attributes" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "structural_fingerprint" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_element_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_project_logical_id" UNIQUE ("project_id", "logical_id"),
        CONSTRAINT "FK_element_profiles_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "locator_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "element_profile_id" uuid NOT NULL,
        "locator_type" varchar(32) NOT NULL,
        "locator_value" varchar(512) NOT NULL,
        "success_count" int NOT NULL DEFAULT 0,
        "last_verified_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_locator_history_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_locator_history_profile" FOREIGN KEY ("element_profile_id") REFERENCES "element_profiles"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "healing_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "execution_id" uuid NOT NULL,
        "element_profile_id" uuid NOT NULL,
        "original_locator" varchar(512) NOT NULL,
        "healed_locator" varchar(512) NOT NULL,
        "confidence_score" double precision NOT NULL,
        "scoring_breakdown" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "decision" varchar(32) NOT NULL,
        "is_approved" boolean NOT NULL DEFAULT false,
        "timestamp" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_healing_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_healing_events_exec" FOREIGN KEY ("execution_id") REFERENCES "executions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_healing_events_profile" FOREIGN KEY ("element_profile_id") REFERENCES "element_profiles"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "approvals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "healing_event_id" uuid NOT NULL,
        "requested_by" uuid,
        "approved_by" uuid,
        "status" varchar(32) NOT NULL DEFAULT 'pending',
        "comment" text,
        "responded_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_approvals_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_approvals_event" FOREIGN KEY ("healing_event_id") REFERENCES "healing_events"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_approvals_req" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_approvals_app" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "action" varchar(80) NOT NULL,
        "resource_type" varchar(64) NOT NULL,
        "resource_id" varchar(64),
        "client_ip" varchar(64),
        "details" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "timestamp" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Query-supporting indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_executions_project_created" ON "executions" ("project_id", "created_at" DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_executions_status" ON "executions" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_execution_steps_exec_idx" ON "execution_steps" ("execution_id", "step_index")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_execution_logs_exec_ts" ON "execution_logs" ("execution_id", "timestamp")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_artifacts_exec" ON "artifacts" ("execution_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_schedules_enabled_next" ON "schedules" ("is_enabled", "next_run_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_audit_logs_ts" ON "audit_logs" ("timestamp" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "approvals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "healing_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "locator_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "element_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dom_snapshots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "artifacts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "execution_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "execution_steps"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "executions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "schedules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "definition_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "automation_definitions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "test_datasets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "credentials"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "environments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
  }
}

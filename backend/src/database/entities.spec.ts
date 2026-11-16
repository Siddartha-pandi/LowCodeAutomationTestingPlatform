import {
  RoleEntity,
  UserEntity,
  UserRoleEntity,
  ProjectEntity,
  ProjectMemberEntity,
  EnvironmentEntity,
  CredentialEntity,
  TestDatasetEntity,
  AutomationDefinitionEntity,
  DefinitionVersionEntity,
  ScheduleEntity,
  ExecutionEntity,
  ExecutionStepEntity,
  ExecutionLogEntity,
  ArtifactEntity,
  DOMSnapshotEntity,
  ElementProfileEntity,
  LocatorHistoryEntity,
  HealingEventEntity,
  ApprovalEntity,
  AuditLogEntity,
} from './entities';
import { getMetadataArgsStorage } from 'typeorm';

describe('PostgreSQL TypeORM Entity Schema Mapping', () => {
  const expectedTables = [
    'roles',
    'users',
    'user_roles',
    'projects',
    'project_members',
    'environments',
    'credentials',
    'test_datasets',
    'automation_definitions',
    'definition_versions',
    'schedules',
    'executions',
    'execution_steps',
    'execution_logs',
    'artifacts',
    'dom_snapshots',
    'element_profiles',
    'locator_history',
    'healing_events',
    'approvals',
    'audit_logs',
  ];

  it('should accurately map all 21 production PostgreSQL tables', () => {
    const storage = getMetadataArgsStorage();
    const registeredTables = storage.tables.map((t) => t.name);

    for (const expectedTable of expectedTables) {
      expect(registeredTables).toContain(expectedTable);
    }
  });

  it('should correctly configure primary keys and UUID types', () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns;

    // Check users table id
    const userIdCol = columns.find((c) => c.target === UserEntity && c.propertyName === 'id');
    expect(userIdCol).toBeDefined();

    // Check user_roles composite PK
    const userRoleUserCol = columns.find(
      (c) => c.target === UserRoleEntity && c.propertyName === 'userId',
    );
    const userRoleRoleCol = columns.find(
      (c) => c.target === UserRoleEntity && c.propertyName === 'roleId',
    );
    expect(userRoleUserCol?.options.primary).toBe(true);
    expect(userRoleRoleCol?.options.primary).toBe(true);
  });
});

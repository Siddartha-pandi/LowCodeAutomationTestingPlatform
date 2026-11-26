import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ExecutionsService } from '../executions/executions.service';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { ReportsService } from '../reports/reports.service';
import { CredentialsService } from '../credentials/credentials.service';
import { SchedulesService } from '../scheduling/schedules.service';
import { TestCasesService } from '../test-cases/test-cases.service';
import { RbacGuard } from '../../common/guards/rbac.guard';

describe('Authorization & Multi-Tenant Isolation', () => {
  const ownerId = 'user-owner-1';
  const attackerId = 'user-attacker-2';
  const superId = 'user-super-99';
  const projA = { id: '11111111-1111-1111-1111-111111111111', name: 'Project A', ownerId };
  const projB = { id: '22222222-2222-2222-2222-222222222222', name: 'Project B', ownerId: attackerId };

  function createProjectsService() {
    const projectRepo = {
      find: jest.fn(async ({ where }: any) => {
        if (!where) return [projA, projB];
        return [projA, projB].filter((p) => p.ownerId === where.ownerId);
      }),
      findOne: jest.fn(async ({ where }: any) => {
        if (!where) return projA;
        return [projA, projB].find((p) => p.id === where.id || p.name === where.name) || null;
      }),
      create: jest.fn((d) => d),
      save: jest.fn(async (d) => d),
      remove: jest.fn(),
    };
    const memberRepo = {
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      create: jest.fn((d) => d),
      save: jest.fn(async (d) => d),
      remove: jest.fn(),
    };
    const userRepo = { findOne: jest.fn() };
    return { service: new ProjectsService(projectRepo as any, memberRepo as any, userRepo as any), memberRepo };
  }

  it('allows user accessing own project and blocks accessing another user project', async () => {
    const { service } = createProjectsService();
    const own = await service.getProject(projA.id, ownerId, false);
    expect(own.id).toBe(projA.id);

    await expect(service.getProject(projA.id, attackerId, false)).rejects.toThrow(NotFoundException);
    await expect(service.verifyProjectAccess(projA.id, attackerId, false)).rejects.toThrow(ForbiddenException);
  });

  it('blocks missing userId (undefined) and allows superuser access', async () => {
    const { service } = createProjectsService();
    expect(await service.userHasAccess(projA.id, '', false)).toBe(false);
    expect(await service.listProjects(undefined as any, false)).toEqual([]);

    const superProj = await service.getProject(projA.id, superId, true);
    expect(superProj.id).toBe(projA.id);
  });

  it('blocks non-admin project members from adding/removing members', async () => {
    const { service, memberRepo } = createProjectsService();
    memberRepo.findOne.mockResolvedValue({ id: 'm1', projectId: projA.id, userId: attackerId, role: 'viewer' });
    await expect(
      service.addMember(projA.id, { user_id: 'u3', role: 'viewer' } as any, attackerId, false),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks accessing another project test case, execution, artifact, report, credential, and schedule', async () => {
    const { service: projectsService } = createProjectsService();

    // 1. Test Case
    const defRepo = { findOne: jest.fn().mockResolvedValue({ id: 'tc-1', type: 'test', projectId: projA.id }) };
    const testCasesService = new TestCasesService(
      defRepo as any, {} as any, {} as any, {} as any, {} as any, projectsService, {} as any,
    );
    await expect(testCasesService.getTestCase('tc-1', attackerId, false)).rejects.toThrow(ForbiddenException);

    // 2. Execution
    const execRepo = { findOne: jest.fn().mockResolvedValue({ id: 'exec-1', projectId: projA.id, steps: [], logs: [] }) };
    const executionsService = new ExecutionsService(
      execRepo as any, {} as any, {} as any, {} as any, projectsService, {} as any, {} as any,
    );
    await expect(executionsService.getExecution('exec-1', attackerId, false)).rejects.toThrow(ForbiddenException);

    // 3. Artifact
    const artRepo = { findOne: jest.fn().mockResolvedValue({ id: 'art-1', executionId: 'exec-1', filePath: 'storage/a.png' }) };
    const artifactsService = new ArtifactsService(
      artRepo as any, execRepo as any, projectsService, { get: () => 'storage' } as any,
    );
    await expect(artifactsService.getArtifactMetadata('art-1', attackerId, false)).rejects.toThrow(ForbiddenException);

    // 4. Report
    const reportsService = new ReportsService({ createQueryBuilder: jest.fn() } as any, projectsService);
    await expect(reportsService.getSummary(projA.id, attackerId, false)).rejects.toThrow(ForbiddenException);

    // 5. Credential
    const credRepo = { findOne: jest.fn().mockResolvedValue({ id: 'cred-1', projectId: projA.id }) };
    const credsService = new CredentialsService(credRepo as any, projectsService, {} as any);
    await expect(credsService.getCredential('cred-1', attackerId, false)).rejects.toThrow(ForbiddenException);

    // 6. Schedule
    const schedRepo = { findOne: jest.fn().mockResolvedValue({ id: 'sched-1', definitionId: 'tc-1' }) };
    const schedService = new SchedulesService(
      schedRepo as any, defRepo as any, {} as any, {} as any, {} as any, {} as any, projectsService,
    );
    await expect(schedService.getSchedule('sched-1', attackerId, false)).rejects.toThrow(ForbiddenException);
  });

  it('rejects unauthorized RBAC role access via RbacGuard', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['users:manage']) } as any;
    const guard = new RbacGuard(reflector);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: attackerId, isSuperuser: false, permissions: ['flows:execute'] } }),
      }),
    } as any;
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});

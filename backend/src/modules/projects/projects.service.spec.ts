import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectEntity } from '../../database/entities/project.entity';
import { ProjectMemberEntity } from '../../database/entities/project-member.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ProjectsService (Isolation & Permissions)', () => {
  let service: ProjectsService;
  let projectRepo: any;
  let memberRepo: any;
  let userRepo: any;

  const mockProject: Partial<ProjectEntity> = {
    id: 'proj-123',
    name: 'Test Project',
    description: 'Test Description',
    ownerId: 'user-owner',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    projectRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'proj-123', createdAt: new Date(), updatedAt: new Date() })),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
      remove: jest.fn(),
    };

    memberRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'mem-123', joinedAt: new Date() })),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
      remove: jest.fn(),
    };

    userRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(ProjectEntity), useValue: projectRepo },
        { provide: getRepositoryToken(ProjectMemberEntity), useValue: memberRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should create a project and automatically assign owner as admin member', async () => {
    const result = await service.createProject(
      { name: 'Alpha Project', description: 'Desc' },
      'user-owner',
    );

    expect(result.name).toBe('Alpha Project');
    expect(projectRepo.create).toHaveBeenCalledWith({
      name: 'Alpha Project',
      description: 'Desc',
      ownerId: 'user-owner',
    });
    expect(memberRepo.create).toHaveBeenCalledWith({
      projectId: 'proj-123',
      userId: 'user-owner',
      role: 'admin',
    });
  });

  it('should isolate projects so unauthorized users cannot access non-member projects', async () => {
    // Project owned by user-owner
    projectRepo.findOne.mockResolvedValue(mockProject);
    // user-intruder is not a member
    memberRepo.findOne.mockResolvedValue(null);

    await expect(
      service.getProject('proj-123', 'user-intruder', false),
    ).rejects.toThrow(NotFoundException);
  });

  it('should allow project members to access the project', async () => {
    projectRepo.findOne.mockResolvedValue(mockProject);
    memberRepo.findOne.mockResolvedValue({
      id: 'mem-456',
      projectId: 'proj-123',
      userId: 'user-member',
      role: 'viewer',
    });

    const result = await service.getProject('proj-123', 'user-member', false);
    expect(result.id).toBe('proj-123');
    expect(result.name).toBe('Test Project');
  });

  it('should allow superusers to access any project regardless of membership', async () => {
    projectRepo.findOne.mockResolvedValue(mockProject);

    const result = await service.getProject('proj-123', 'user-admin', true);
    expect(result.id).toBe('proj-123');
    expect(result.name).toBe('Test Project');
  });

  it('should forbid non-owner non-superuser from deleting a project', async () => {
    projectRepo.findOne.mockResolvedValue(mockProject);
    memberRepo.findOne.mockResolvedValue({
      id: 'mem-456',
      projectId: 'proj-123',
      userId: 'user-member',
      role: 'editor',
    });

    await expect(
      service.deleteProject('proj-123', 'user-member', false),
    ).rejects.toThrow(ForbiddenException);
  });
});

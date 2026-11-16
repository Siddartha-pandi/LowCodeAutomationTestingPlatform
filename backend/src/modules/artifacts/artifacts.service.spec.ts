import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ArtifactsService } from './artifacts.service';
import { ArtifactEntity } from '../../database/entities/artifact.entity';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { ProjectsService } from '../projects/projects.service';

describe('ArtifactsService (Security & Path Traversal)', () => {
  let service: ArtifactsService;
  let artifactRepo: any;
  let executionRepo: any;
  let projectsService: any;
  const testStorageDir = path.resolve('test-storage-temp');

  beforeAll(() => {
    if (!fs.existsSync(testStorageDir)) {
      fs.mkdirSync(testStorageDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    artifactRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };
    executionRepo = {
      findOne: jest.fn(),
    };
    projectsService = {
      getProject: jest.fn(),
      verifyProjectAccess: jest.fn().mockResolvedValue({ id: 'proj-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtifactsService,
        { provide: getRepositoryToken(ArtifactEntity), useValue: artifactRepo },
        { provide: getRepositoryToken(ExecutionEntity), useValue: executionRepo },
        { provide: ProjectsService, useValue: projectsService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'app.storage.dir') return testStorageDir;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ArtifactsService>(ArtifactsService);
  });

  it('should throw NotFoundException if artifact does not exist', async () => {
    artifactRepo.findOne.mockResolvedValue(null);

    await expect(
      service.getArtifactMetadata('non-existent', 'user-1', false),
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject path traversal attempts attempting to access files outside storage', async () => {
    artifactRepo.findOne.mockResolvedValue({
      id: 'art-malicious',
      executionId: 'exec-1',
      filePath: '../secret.txt',
      fileSizeBytes: 100,
      mimeType: 'text/plain',
      sha256Hash: 'dummy',
    });
    executionRepo.findOne.mockResolvedValue({
      id: 'exec-1',
      projectId: 'proj-1',
    });
    projectsService.getProject.mockResolvedValue({ id: 'proj-1' });

    await expect(
      service.getSafeArtifactFile('art-malicious', 'user-1', false),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should safely serve an artifact that exists within the storage directory', async () => {
    const validFile = path.join(testStorageDir, 'screenshot-123.png');
    fs.writeFileSync(validFile, 'fake-image-bytes');

    artifactRepo.findOne.mockResolvedValue({
      id: 'art-valid',
      executionId: 'exec-1',
      filePath: validFile,
      fileSizeBytes: 16,
      mimeType: 'image/png',
      sha256Hash: 'dummy',
    });
    executionRepo.findOne.mockResolvedValue({
      id: 'exec-1',
      projectId: 'proj-1',
    });
    projectsService.getProject.mockResolvedValue({ id: 'proj-1' });

    const result = await service.getSafeArtifactFile('art-valid', 'user-1', false);
    expect(result.filename).toBe('screenshot-123.png');
    expect(result.mimeType).toBe('image/png');
    expect(result.filePath).toBe(path.resolve(validFile));
  });
});

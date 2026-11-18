import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ExecutionEntity } from '../../database/entities/execution.entity';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([
      {
        id: 'exec-1',
        projectId: 'proj-1',
        definitionId: 'def-1',
        triggerType: 'manual',
        status: 'passed',
        durationMs: 1200,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        id: 'exec-2',
        projectId: 'proj-1',
        definitionId: 'def-1',
        triggerType: 'scheduled',
        status: 'failed',
        durationMs: 800,
        createdAt: new Date('2026-01-02T00:00:00Z'),
      },
    ]),
  };

  const mockRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(ExecutionEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should calculate execution summary correctly', async () => {
    const summary = await service.getSummary('proj-1');
    expect(summary.total_executions).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.pass_rate).toBe(50);
    expect(summary.average_duration_ms).toBe(1000);
  });

  it('should export csv with correct headers and rows', async () => {
    const csv = await service.exportCsv('proj-1');
    expect(csv.filename).toContain('executions-report-');
    expect(csv.content).toContain('Execution ID,Project ID');
    expect(csv.content).toContain('exec-1,proj-1');
  });
});

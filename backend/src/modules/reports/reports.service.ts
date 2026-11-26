import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ExecutionEntity)
    private readonly executionRepo: Repository<ExecutionEntity>,
    private readonly projectsService: ProjectsService,
  ) {}

  async getSummary(projectId?: string, userId?: string, isSuperuser = false) {
    const qb = this.executionRepo.createQueryBuilder('exec');
    if (projectId) {
      if (userId) {
        await this.projectsService.verifyProjectAccess(projectId, userId, isSuperuser);
      }
      qb.where('exec.projectId = :projectId', { projectId });
    } else if (userId && !isSuperuser) {
      const projects = await this.projectsService.listProjects(userId, false);
      if (projects.length === 0) {
        return {
          total_executions: 0,
          passed: 0,
          failed: 0,
          running: 0,
          pass_rate: 0,
          average_duration_ms: 0,
          recent_executions: [],
        };
      }
      qb.where('exec.projectId IN (:...projectIds)', { projectIds: projects.map((p) => p.id) });
    }

    const executions = await qb
      .select([
        'exec.id',
        'exec.status',
        'exec.durationMs',
        'exec.createdAt',
      ])
      .orderBy('exec.createdAt', 'DESC')
      .take(1000)
      .getMany();

    const total = executions.length;
    const passed = executions.filter((e) => e.status === 'passed').length;
    const failed = executions.filter((e) => e.status === 'failed').length;
    const running = executions.filter((e) => ['running', 'queued'].includes(e.status)).length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    const totalDuration = executions.reduce((acc, curr) => acc + (curr.durationMs || 0), 0);
    const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;

    return {
      total_executions: total,
      passed,
      failed,
      running,
      pass_rate: passRate,
      average_duration_ms: avgDuration,
      recent_executions: executions.slice(0, 10).map((e) => ({
        id: e.id,
        status: e.status,
        duration_ms: e.durationMs,
        created_at: e.createdAt,
      })),
    };
  }

  async exportCsv(projectId?: string, userId?: string, isSuperuser = false): Promise<{ filename: string; content: string }> {
    const qb = this.executionRepo.createQueryBuilder('exec');
    if (projectId) {
      if (userId) {
        await this.projectsService.verifyProjectAccess(projectId, userId, isSuperuser);
      }
      qb.where('exec.projectId = :projectId', { projectId });
    } else if (userId && !isSuperuser) {
      const projects = await this.projectsService.listProjects(userId, false);
      if (projects.length === 0) {
        return {
          filename: `executions-report-${Date.now()}.csv`,
          content: 'Execution ID,Project ID,Definition ID,Trigger,Status,Duration (ms),Timestamp',
        };
      }
      qb.where('exec.projectId IN (:...projectIds)', { projectIds: projects.map((p) => p.id) });
    }

    const executions = await qb
      .select([
        'exec.id',
        'exec.projectId',
        'exec.definitionId',
        'exec.triggerType',
        'exec.status',
        'exec.durationMs',
        'exec.createdAt',
      ])
      .orderBy('exec.createdAt', 'DESC')
      .take(2000)
      .getMany();

    const headers = ['Execution ID', 'Project ID', 'Definition ID', 'Trigger', 'Status', 'Duration (ms)', 'Timestamp'];
    const rows = executions.map((e) => [
      e.id,
      e.projectId,
      e.definitionId,
      e.triggerType,
      e.status,
      e.durationMs || 0,
      e.createdAt ? new Date(e.createdAt).toISOString() : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return {
      filename: `executions-report-${Date.now()}.csv`,
      content: csvContent,
    };
  }
}

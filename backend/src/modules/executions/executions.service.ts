import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { ExecutionStepEntity } from '../../database/entities/execution-step.entity';
import { ExecutionLogEntity } from '../../database/entities/execution-log.entity';
import { ArtifactEntity } from '../../database/entities/artifact.entity';
import { ProjectsService } from '../projects/projects.service';
import { QueueService } from '../../queue/queue.service';
import { BrowserManagerService } from '../browser/browser-manager.service';
import {
  DownloadLogsQueryDto,
  ListExecutionsQueryDto,
  ListLogsQueryDto,
} from './dto/execution.dto';
import { ExecuteJobDto, ExecuteJobDtoSchema } from '../../contracts/execution.contract';

@Injectable()
export class ExecutionsService {
  private readonly logger = new Logger(ExecutionsService.name);

  constructor(
    @InjectRepository(ExecutionEntity)
    private readonly executionRepository: Repository<ExecutionEntity>,
    @InjectRepository(ExecutionStepEntity)
    private readonly stepRepository: Repository<ExecutionStepEntity>,
    @InjectRepository(ExecutionLogEntity)
    private readonly logRepository: Repository<ExecutionLogEntity>,
    @InjectRepository(ArtifactEntity)
    private readonly artifactRepository: Repository<ArtifactEntity>,
    private readonly projectsService: ProjectsService,
    private readonly queueService: QueueService,
    private readonly browserManager: BrowserManagerService,
  ) {}

  // ---------------------------------------------------------------------------
  // Execution List & Detail
  // ---------------------------------------------------------------------------

  async listExecutions(
    queryDto: ListExecutionsQueryDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any[]> {
    const qb = this.executionRepository
      .createQueryBuilder('exec')
      .leftJoinAndSelect('exec.steps', 'steps')
      .leftJoinAndSelect('exec.logs', 'logs');

    if (!isSuperuser) {
      const userProjects = await this.projectsService.listProjects(userId, false);
      if (userProjects.length === 0) return [];
      const projectIds = userProjects.map((p) => p.id);
      qb.andWhere('exec.projectId IN (:...projectIds)', { projectIds });
    }

    if (queryDto.project_id) {
      const project = await this.projectsService.resolveProject(queryDto.project_id, userId, isSuperuser);
      if (!project) return [];
      qb.andWhere('exec.projectId = :pId', { pId: project.id });
    }

    if (queryDto.definition_id) {
      qb.andWhere('exec.definitionId = :defId', { defId: queryDto.definition_id });
    }

    if (queryDto.status) {
      qb.andWhere('exec.status = :status', { status: queryDto.status });
    }

    qb.orderBy('exec.createdAt', 'DESC')
      .skip(queryDto.offset || 0)
      .take(queryDto.limit || 50);

    const executions = await qb.getMany();
    return executions.map((e) => this.formatExecutionDetail(e));
  }

  async getExecution(id: string, userId: string, isSuperuser = false): Promise<any> {
    const execution = await this.executionRepository.findOne({
      where: { id },
      relations: ['steps', 'logs'],
      order: {
        steps: { stepIndex: 'ASC' },
        logs: { timestamp: 'ASC' },
      },
    });

    if (!execution) {
      throw new NotFoundException(`Execution '${id}' not found`);
    }

    if (execution.projectId) {
      await this.projectsService.verifyProjectAccess(execution.projectId, userId, isSuperuser);
    }

    return this.formatExecutionDetail(execution);
  }

  // ---------------------------------------------------------------------------
  // Cancellation
  // ---------------------------------------------------------------------------

  async cancelExecution(id: string, userId: string, isSuperuser = false): Promise<any> {
    const execution = await this.executionRepository.findOne({
      where: { id },
      relations: ['steps', 'logs'],
    });

    if (!execution) {
      throw new NotFoundException(`Execution '${id}' not found`);
    }

    if (execution.projectId) {
      await this.projectsService.verifyProjectAccess(execution.projectId, userId, isSuperuser);
    }

    if (['passed', 'failed', 'cancelled'].includes(execution.status)) {
      throw new BadRequestException(
        `Cannot cancel execution with terminal status '${execution.status}'`,
      );
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    await this.executionRepository.save(execution);

    // Cancel in BullMQ queue
    await this.queueService.cancelJob(execution.id);

    return this.formatExecutionDetail(execution);
  }

  async deleteExecution(id: string, userId: string, isSuperuser = false): Promise<void> {
    const execution = await this.executionRepository.findOne({ where: { id } });
    if (!execution) {
      throw new NotFoundException(`Execution '${id}' not found`);
    }

    if (execution.projectId) {
      await this.projectsService.verifyProjectAccess(execution.projectId, userId, isSuperuser);
    }

    await this.executionRepository.remove(execution);
  }

  // ---------------------------------------------------------------------------
  // Artifacts
  // ---------------------------------------------------------------------------

  async listArtifacts(executionId: string, userId: string, isSuperuser = false): Promise<any[]> {
    const execution = await this.executionRepository.findOne({ where: { id: executionId } });
    if (!execution) {
      throw new NotFoundException(`Execution '${executionId}' not found`);
    }

    if (execution.projectId) {
      await this.projectsService.verifyProjectAccess(execution.projectId, userId, isSuperuser);
    }

    const artifacts = await this.artifactRepository.find({
      where: { executionId },
      order: { createdAt: 'DESC' },
    });

    return artifacts.map((a) => ({
      id: a.id,
      execution_id: a.executionId,
      artifact_type: a.artifactType,
      file_size_bytes: a.fileSizeBytes,
      mime_type: a.mimeType,
      sha256_hash: a.sha256Hash,
      file_path: a.filePath,
      created_at: a.createdAt,
    }));
  }

  // ---------------------------------------------------------------------------
  // Diagnostic Logs
  // ---------------------------------------------------------------------------

  async getExecutionLogs(
    executionId: string,
    queryDto: ListLogsQueryDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const execution = await this.executionRepository.findOne({ where: { id: executionId } });
    if (!execution) {
      throw new NotFoundException(`Execution '${executionId}' not found`);
    }

    if (execution.projectId) {
      await this.projectsService.verifyProjectAccess(execution.projectId, userId, isSuperuser);
    }

    const qb = this.logRepository
      .createQueryBuilder('log')
      .where('log.executionId = :executionId', { executionId });

    if (queryDto.level) {
      qb.andWhere('log.level = :level', { level: queryDto.level });
    }
    if (queryDto.search) {
      qb.andWhere('log.message ILIKE :search', { search: `%${queryDto.search}%` });
    }
    if (queryDto.step_id) {
      qb.andWhere('log.stepId = :stepId', { stepId: queryDto.step_id });
    }

    const total = await qb.getCount();
    const logs = await qb
      .orderBy('log.timestamp', 'ASC')
      .skip(queryDto.offset || 0)
      .take(queryDto.limit || 200)
      .getMany();

    return {
      execution_id: executionId,
      total,
      limit: queryDto.limit || 200,
      offset: queryDto.offset || 0,
      logs: logs.map((l) => ({
        id: l.id,
        step_id: l.stepId,
        level: l.level,
        message: l.message,
        is_redacted: l.isRedacted,
        timestamp: l.timestamp,
      })),
    };
  }

  async downloadExecutionLogs(
    executionId: string,
    queryDto: DownloadLogsQueryDto,
    userId: string,
    isSuperuser = false,
  ): Promise<{ content: string; contentType: string; filename: string }> {
    const execution = await this.executionRepository.findOne({ where: { id: executionId } });
    if (!execution) {
      throw new NotFoundException(`Execution '${executionId}' not found`);
    }

    if (execution.projectId) {
      await this.projectsService.verifyProjectAccess(execution.projectId, userId, isSuperuser);
    }

    const qb = this.logRepository
      .createQueryBuilder('log')
      .where('log.executionId = :executionId', { executionId });

    if (queryDto.level) {
      qb.andWhere('log.level = :level', { level: queryDto.level });
    }

    const logs = await qb.orderBy('log.timestamp', 'ASC').getMany();

    if (queryDto.format === 'json') {
      const payload = logs.map((l) => ({
        id: l.id,
        step_id: l.stepId,
        level: l.level,
        message: l.message,
        timestamp: l.timestamp,
      }));
      return {
        content: JSON.stringify(payload, null, 2),
        contentType: 'application/json',
        filename: `execution_${executionId}_logs.json`,
      };
    }

    const lines = logs.map((l) => {
      const ts = l.timestamp ? new Date(l.timestamp).toISOString() : 'UNKNOWN';
      return `[${ts}] [${l.level.padEnd(7)}] ${l.message}`;
    });
    const textContent = lines.length > 0 ? lines.join('\n') : 'No execution logs recorded.';

    return {
      content: textContent,
      contentType: 'text/plain; charset=utf-8',
      filename: `execution_${executionId}_logs.txt`,
    };
  }

  // ---------------------------------------------------------------------------
  // Live Viewport Snapshot
  // ---------------------------------------------------------------------------

  async getExecutionViewportPath(
    executionId: string,
    userId: string,
    isSuperuser = false,
  ): Promise<string> {
    const execution = await this.executionRepository.findOne({ where: { id: executionId } });
    if (!execution) {
      throw new NotFoundException(`Execution '${executionId}' not found`);
    }

    if (execution.projectId) {
      await this.projectsService.verifyProjectAccess(execution.projectId, userId, isSuperuser);
    }

    // 1. Check latest step screenshot
    const latestStep = await this.stepRepository.findOne({
      where: { executionId },
      order: { stepIndex: 'DESC' },
    });
    if (latestStep?.screenshotPath && fs.existsSync(latestStep.screenshotPath)) {
      return latestStep.screenshotPath;
    }

    // 2. Check latest screenshot artifact
    const latestArtifact = await this.artifactRepository.findOne({
      where: { executionId, artifactType: 'screenshot' },
      order: { createdAt: 'DESC' },
    });
    if (latestArtifact?.filePath && fs.existsSync(latestArtifact.filePath)) {
      return latestArtifact.filePath;
    }

    throw new NotFoundException('No viewport screenshot available for this execution');
  }

  // ---------------------------------------------------------------------------
  // Internal API compatibility
  // ---------------------------------------------------------------------------

  async submitExecution(payload: unknown) {
    const parseResult = ExecuteJobDtoSchema.safeParse(payload);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: 'Invalid execution job payload schema',
        errors: parseResult.error.errors,
      });
    }

    const validPayload: ExecuteJobDto = parseResult.data;
    const job = await this.queueService.addExecutionJob(validPayload);

    return {
      status: 'queued',
      job_id: job.id,
      execution_id: validPayload.execution_id,
      correlation_id: validPayload.correlation_id || null,
      queued_at: new Date().toISOString(),
    };
  }

  async getHealthStatus() {
    const browsersReady = await this.browserManager.checkBrowsersHealth();
    const queueMetrics = await this.queueService.getQueueMetrics();

    return {
      status: 'healthy',
      service: 'unified-backend',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      browsers: browsersReady,
      queue: queueMetrics,
    };
  }

  private formatExecutionDetail(e: ExecutionEntity) {
    return {
      id: e.id,
      project_id: e.projectId,
      definition_id: e.definitionId,
      definition_version_id: e.definitionVersionId,
      environment_id: e.environmentId,
      trigger_type: e.triggerType,
      triggered_by: e.triggeredBy,
      status: e.status,
      started_at: e.startedAt,
      completed_at: e.completedAt,
      session_id: e.sessionId,
      summary: e.summary || {},
      created_at: e.createdAt,
      updated_at: (e as any).updatedAt || e.createdAt,
      steps: (e.steps || []).map((s) => ({
        id: s.id,
        step_index: s.stepIndex,
        step_type: s.stepType,
        action: s.action,
        status: s.status,
        duration_ms: s.durationMs,
        error_message: s.errorMessage,
        screenshot_path: s.screenshotPath,
        created_at: s.createdAt,
      })),
      logs: (e.logs || []).map((l) => ({
        id: l.id,
        step_id: l.stepId,
        level: l.level,
        message: l.message,
        is_redacted: l.isRedacted,
        timestamp: l.timestamp,
      })),
    };
  }
}

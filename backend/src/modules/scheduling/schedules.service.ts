import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { CronExpressionParser } from 'cron-parser';
import { ScheduleEntity } from '../../database/entities/schedule.entity';
import { AutomationDefinitionEntity } from '../../database/entities/automation-definition.entity';
import { DefinitionVersionEntity } from '../../database/entities/definition-version.entity';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { EnvironmentEntity } from '../../database/entities/environment.entity';
import { QueueService } from '../../queue/queue.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/schedule.dto';
import { testCaseToGraphDefinition } from '../test-cases/test-cases.service';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(ScheduleEntity)
    private readonly scheduleRepository: Repository<ScheduleEntity>,
    @InjectRepository(AutomationDefinitionEntity)
    private readonly definitionRepository: Repository<AutomationDefinitionEntity>,
    @InjectRepository(DefinitionVersionEntity)
    private readonly versionRepository: Repository<DefinitionVersionEntity>,
    @InjectRepository(ExecutionEntity)
    private readonly executionRepository: Repository<ExecutionEntity>,
    @InjectRepository(EnvironmentEntity)
    private readonly environmentRepository: Repository<EnvironmentEntity>,
    private readonly queueService: QueueService,
  ) {}

  async createSchedule(dto: CreateScheduleDto, userId: string): Promise<any> {
    this.validateCron(dto.cron_expression, dto.timezone);

    const definition = await this.definitionRepository.findOne({
      where: { id: dto.definition_id },
    });
    if (!definition) {
      throw new NotFoundException(`Automation definition '${dto.definition_id}' not found`);
    }

    const nextRun = this.computeNextRun(dto.cron_expression, dto.timezone);

    const schedule = this.scheduleRepository.create({
      definitionId: dto.definition_id,
      environmentId: dto.environment_id,
      cronExpression: dto.cron_expression,
      timezone: dto.timezone || 'UTC',
      isEnabled: dto.is_enabled ?? true,
      nextRunAt: nextRun,
    });

    const saved = await this.scheduleRepository.save(schedule);
    return this.formatSchedule(saved);
  }

  async listSchedules(definitionId?: string): Promise<any[]> {
    const where: any = {};
    if (definitionId) {
      where.definitionId = definitionId;
    }
    const schedules = await this.scheduleRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return schedules.map((s) => this.formatSchedule(s));
  }

  async getSchedule(id: string): Promise<any> {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException(`Schedule '${id}' not found`);
    return this.formatSchedule(schedule);
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto): Promise<any> {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException(`Schedule '${id}' not found`);

    if (dto.cron_expression !== undefined) {
      const tz = dto.timezone || schedule.timezone;
      this.validateCron(dto.cron_expression, tz);
      schedule.cronExpression = dto.cron_expression;
      schedule.nextRunAt = this.computeNextRun(dto.cron_expression, tz);
    }

    if (dto.timezone !== undefined) {
      schedule.timezone = dto.timezone;
      if (!dto.cron_expression) {
        schedule.nextRunAt = this.computeNextRun(schedule.cronExpression, dto.timezone);
      }
    }

    if (dto.is_enabled !== undefined) {
      schedule.isEnabled = dto.is_enabled;
    }

    const saved = await this.scheduleRepository.save(schedule);
    return this.formatSchedule(saved);
  }

  async deleteSchedule(id: string): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });
    if (!schedule) throw new NotFoundException(`Schedule '${id}' not found`);
    await this.scheduleRepository.remove(schedule);
  }

  async evaluateSchedulesNow(): Promise<any> {
    const now = new Date();
    const dueSchedules = await this.scheduleRepository.find({
      where: [
        { isEnabled: true, nextRunAt: LessThanOrEqual(now) },
      ],
    });

    let triggeredCount = 0;

    for (const schedule of dueSchedules) {
      try {
        const definition = await this.definitionRepository.findOne({
          where: { id: schedule.definitionId },
        });
        if (!definition) continue;

        let activeVersion: DefinitionVersionEntity | null = null;
        if (definition.currentVersionId) {
          activeVersion = await this.versionRepository.findOne({
            where: { id: definition.currentVersionId },
          });
        }
        if (!activeVersion) {
          activeVersion = await this.versionRepository.findOne({
            where: { definitionId: definition.id },
            order: { versionNum: 'DESC' },
          });
        }
        if (!activeVersion) continue;

        let graphDef = activeVersion.definitionJson;
        if (definition.type === 'test') {
          graphDef = testCaseToGraphDefinition(activeVersion.definitionJson);
        }

        // Allowed domains
        let allowedDomains = ['*'];
        if (schedule.environmentId) {
          const env = await this.environmentRepository.findOne({
            where: { id: schedule.environmentId },
          });
          if (env?.allowedDomains?.length) {
            allowedDomains = env.allowedDomains;
          }
        }

        // 1. Create execution record
        const execution = this.executionRepository.create({
          projectId: definition.projectId,
          definitionId: definition.id,
          definitionVersionId: activeVersion.id,
          environmentId: schedule.environmentId,
          triggerType: 'scheduled',
          triggeredBy: null,
          status: 'queued',
          summary: {
            schedule_id: schedule.id,
            cron: schedule.cronExpression,
          },
        });
        const savedExecution = await this.executionRepository.save(execution);

        // 2. Dispatch to BullMQ queue
        await this.queueService.addExecutionJob({
          execution_id: savedExecution.id,
          project_id: definition.projectId,
          environment_id: schedule.environmentId,
          user_id: 'system',
          flow_id: definition.id,
          test_case_id: definition.type === 'test' ? definition.id : undefined,
          browser_config: {
            browser_type: 'chromium',
            headless: true,
            viewport: { width: 1280, height: 800 },
            record_video: false,
            record_trace: true,
            timeout_ms: 30000,
          },
          allowed_domains: allowedDomains,
          variables: {},
          graph_definition: graphDef,
          correlation_id: `sched-${schedule.id}-${savedExecution.id}`,
        });

        // 3. Update schedule last_run and next_run
        schedule.lastRunAt = now;
        schedule.nextRunAt = this.computeNextRun(schedule.cronExpression, schedule.timezone);
        await this.scheduleRepository.save(schedule);

        triggeredCount++;
        this.logger.log(
          `Dispatched scheduled execution ${savedExecution.id} for definition '${definition.name}' (${definition.id})`,
        );
      } catch (err: any) {
        this.logger.error(
          `Failed to evaluate schedule ${schedule.id}: ${err.message}`,
          err.stack,
        );
      }
    }

    return {
      status: 'success',
      evaluated_count: dueSchedules.length,
      executions_triggered: triggeredCount,
      evaluated_at: now.toISOString(),
    };
  }

  private validateCron(expression: string, tz = 'UTC'): void {
    try {
      CronExpressionParser.parse(expression, { tz });
    } catch (err: any) {
      throw new BadRequestException(`Invalid cron expression '${expression}': ${err.message}`);
    }
  }

  private computeNextRun(expression: string, tz = 'UTC'): Date {
    try {
      const interval = CronExpressionParser.parse(expression, { tz });
      return interval.next().toDate();
    } catch {
      const d = new Date();
      d.setHours(d.getHours() + 1);
      return d;
    }
  }

  private formatSchedule(s: ScheduleEntity) {
    return {
      id: s.id,
      definition_id: s.definitionId,
      environment_id: s.environmentId,
      cron_expression: s.cronExpression,
      timezone: s.timezone,
      is_enabled: s.isEnabled,
      last_run_at: s.lastRunAt,
      next_run_at: s.nextRunAt,
      created_at: s.createdAt,
    };
  }
}

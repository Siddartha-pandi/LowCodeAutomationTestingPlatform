import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worker, Job } from 'bullmq';
import { ExecutionEntity } from '../database/entities/execution.entity';
import { AutomationDefinitionEntity } from '../database/entities/automation-definition.entity';
import { DefinitionVersionEntity } from '../database/entities/definition-version.entity';
import { QueueService } from '../queue/queue.service';
import { testCaseToGraphDefinition } from '../modules/test-cases/test-cases.service';

export interface SuiteJobPayload {
  suite_execution_id: string;
  project_id: string;
  environment_id?: string;
  user_id: string;
  test_case_ids: string[];
  stop_on_failure: boolean;
  variables: Record<string, any>;
}

@Injectable()
export class SuiteWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SuiteWorker.name);
  private worker: Worker;

  constructor(
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
    @InjectRepository(ExecutionEntity)
    private readonly executionRepo: Repository<ExecutionEntity>,
    @InjectRepository(AutomationDefinitionEntity)
    private readonly definitionRepo: Repository<AutomationDefinitionEntity>,
    @InjectRepository(DefinitionVersionEntity)
    private readonly versionRepo: Repository<DefinitionVersionEntity>,
  ) {}

  onModuleInit() {
    const redis = this.configService.get('app.redis');

    this.worker = new Worker(
      'test-suite-execution',
      async (job: Job<SuiteJobPayload>) => {
        return this.processSuiteJob(job);
      },
      {
        connection: {
          host: redis.host,
          port: redis.port,
          password: redis.password,
          db: redis.db,
          maxRetriesPerRequest: null,
        },
        concurrency: 1,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Suite job ${job.id} completed.`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Suite job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log("SuiteWorker started listening on 'test-suite-execution' queue.");
  }

  async processSuiteJob(job: Job<SuiteJobPayload>): Promise<any> {
    const { suite_execution_id, test_case_ids, project_id, environment_id, user_id, variables } = job.data;
    const start = Date.now();

    await this.executionRepo.update(suite_execution_id, {
      status: 'running',
      startedAt: new Date(),
    }).catch(() => {});

    let passedCount = 0;
    let failedCount = 0;

    for (const testCaseId of test_case_ids) {
      // Check if suite was cancelled
      const currentSuite = await this.executionRepo.findOne({ where: { id: suite_execution_id } });
      if (currentSuite?.status === 'cancelled') {
        break;
      }

      const tc = await this.definitionRepo.findOne({ where: { id: testCaseId } });
      if (!tc) {
        failedCount++;
        continue;
      }

      let version: DefinitionVersionEntity | null = null;
      if (tc.currentVersionId) {
        version = await this.versionRepo.findOne({ where: { id: tc.currentVersionId } });
      }
      if (!version) {
        version = await this.versionRepo.findOne({
          where: { definitionId: tc.id },
          order: { versionNum: 'DESC' },
        });
      }
      if (!version) {
        failedCount++;
        continue;
      }

      const graphDef = testCaseToGraphDefinition(version.definitionJson);

      // Create child execution
      const childExec = this.executionRepo.create({
        projectId: project_id,
        definitionId: tc.id,
        definitionVersionId: version.id,
        environmentId: environment_id,
        triggerType: 'suite',
        triggeredBy: user_id,
        status: 'queued',
        summary: { suite_execution_id, test_case_name: tc.name },
      });
      const savedChild = await this.executionRepo.save(childExec);

      await this.queueService.addExecutionJob({
        execution_id: savedChild.id,
        project_id,
        environment_id,
        user_id,
        test_case_id: tc.id,
        browser_config: {
          browser_type: 'chromium',
          headless: true,
          viewport: { width: 1280, height: 800 },
          record_video: false,
          record_trace: true,
          timeout_ms: 30000,
        },
        allowed_domains: ['*'],
        variables: variables || {},
        graph_definition: graphDef,
        correlation_id: `suite-${suite_execution_id}-${savedChild.id}`,
      });

      passedCount++;
    }

    const duration_ms = Date.now() - start;
    const finalStatus = failedCount === 0 ? 'passed' : 'failed';

    await this.executionRepo.update(suite_execution_id, {
      status: finalStatus,
      completedAt: new Date(),
      durationMs: duration_ms,
      summary: {
        cases_total: test_case_ids.length,
        cases_dispatched: passedCount,
        cases_failed: failedCount,
      } as any,
    }).catch(() => {});

    return {
      suite_execution_id,
      status: finalStatus,
      cases_total: test_case_ids.length,
      cases_dispatched: passedCount,
    };
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
  }
}

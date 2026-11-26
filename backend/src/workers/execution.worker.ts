import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worker, Job } from 'bullmq';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { ExecuteJobDto, ExecutionJobResult } from '../contracts/execution.contract';
import { ExecutionEventType } from '../contracts/events.contract';
import { BrowserManagerService } from '../modules/browser/browser-manager.service';
import { ContextManagerService } from '../modules/browser/context-manager.service';
import { PageManagerService } from '../modules/browser/page-manager.service';
import { FlowExecutorService, FlowExecutionState } from '../modules/flows/flow-executor.service';
import { EventPublisherService } from '../modules/monitoring/event-publisher.service';
import { QueueService } from '../queue/queue.service';
import {
  boundTimeoutMs,
  canTransitionExecutionStatus,
  ExecutionStatus,
  isTerminalExecutionStatus,
} from '../modules/executions/execution-state';
import { ExecutionEntity } from '../database/entities/execution.entity';
import { ExecutionStepEntity } from '../database/entities/execution-step.entity';
import { ExecutionLogEntity } from '../database/entities/execution-log.entity';
import { ArtifactEntity } from '../database/entities/artifact.entity';

@Injectable()
export class ExecutionWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExecutionWorker.name);
  private worker: Worker;

  constructor(
    private readonly configService: ConfigService,
    private readonly browserManager: BrowserManagerService,
    private readonly contextManager: ContextManagerService,
    private readonly pageManager: PageManagerService,
    private readonly flowExecutor: FlowExecutorService,
    private readonly eventPublisher: EventPublisherService,
    private readonly queueService: QueueService,
    @InjectRepository(ExecutionEntity)
    private readonly executionRepo: Repository<ExecutionEntity>,
    @InjectRepository(ExecutionStepEntity)
    private readonly stepRepo: Repository<ExecutionStepEntity>,
    @InjectRepository(ExecutionLogEntity)
    private readonly logRepo: Repository<ExecutionLogEntity>,
    @InjectRepository(ArtifactEntity)
    private readonly artifactRepo: Repository<ArtifactEntity>,
  ) {}

  onModuleInit() {
    const redis = this.configService.get('app.redis');
    const concurrency = this.configService.get<number>('app.worker.concurrency') || 2;

    this.worker = new Worker(
      'browser-execution',
      async (job: Job<ExecuteJobDto>) => {
        return this.processJob(job);
      },
      {
        connection: {
          host: redis.host,
          port: redis.port,
          password: redis.password,
          db: redis.db,
          maxRetriesPerRequest: null,
        },
        concurrency,
      },
    );

    this.worker.on('error', (err) => {
      this.logger.warn(`Execution worker Redis error: ${err.message}`);
    });

    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} (execution: ${job.data.execution_id}) completed successfully.`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log(`ExecutionWorker started listening on 'browser-execution' with concurrency: ${concurrency}`);
  }

  async processJob(job: Job<ExecuteJobDto>): Promise<ExecutionJobResult> {
    const payload = job.data;
    const start = Date.now();
    const executionId = payload.execution_id;
    const storageDir =
      this.configService.get<string>('app.storageDir') ||
      this.configService.get<string>('app.storage.dir') ||
      'storage';

    this.logger.log(`Starting execution run ${executionId} (browser: ${payload.browser_config.browser_type})...`);

    // 0. Idempotency & State Machine check
    const existingExec = await this.executionRepo.findOne({ where: { id: executionId } }).catch(() => null);
    if (existingExec && (isTerminalExecutionStatus(existingExec.status) || !canTransitionExecutionStatus(existingExec.status, 'running'))) {
      this.logger.warn(`Skipping duplicate or terminal execution ${executionId} (current status: ${existingExec.status})`);
      return {
        execution_id: executionId,
        status: existingExec.status as any,
        duration_ms: existingExec.durationMs || 0,
        steps_total: 0,
        steps_passed: 0,
        steps_failed: 0,
        artifacts: { screenshots: [] },
      };
    }

    if (await this.queueService.isExecutionCancelled(executionId)) {
      await this.executionRepo.update(executionId, { status: 'cancelled', completedAt: new Date() }).catch(() => {});
      return {
        execution_id: executionId,
        status: 'cancelled',
        duration_ms: 0,
        steps_total: 0,
        steps_passed: 0,
        steps_failed: 0,
        error_message: 'Execution cancelled before start.',
        artifacts: { screenshots: [] },
      };
    }

    // 1. Mark Execution as 'running' in Database
    await this.executionRepo.update(executionId, {
      status: 'running',
      startedAt: new Date(),
    }).catch((e) => this.logger.warn(`Could not update execution started status: ${e.message}`));

    // 2. Publish Status Change -> 'running'
    await this.eventPublisher.publish(executionId, ExecutionEventType.STATUS_CHANGE, {
      status: 'running',
      message: 'Worker picked up job. Initializing isolated Playwright browser context...',
    });

    const browser = await this.browserManager.getBrowser(
      payload.browser_config.browser_type,
      payload.browser_config.headless,
    );

    const isolatedSession = await this.contextManager.createIsolatedContext(
      browser,
      executionId,
      payload.browser_config,
      storageDir,
    );

    const stepTimeoutMs = boundTimeoutMs(
      payload.browser_config?.timeout_ms,
      this.configService.get<number>('app.defaultTimeoutMs') || 30000,
      1000,
      120_000,
    );
    const executionTimeoutMs = boundTimeoutMs(stepTimeoutMs * 10, 300_000, 10_000, 900_000);

    const state: FlowExecutionState = {
      executionId,
      storageDir,
      variables: { ...payload.variables },
      cancelled: false,
      isCancelled: () => this.queueService.isExecutionCancelled(executionId),
      executionTimeoutMs,
      stepTimeoutMs,
      stepResults: [],
    };

    let resultStatus: Extract<ExecutionStatus, 'passed' | 'failed' | 'cancelled' | 'timed_out'> = 'passed';
    let errorMessage: string | undefined;

    try {
      const page = await this.pageManager.createPageWithPolicies(
        isolatedSession.context,
        payload.allowed_domains,
        async (level, msg) => {
          this.eventPublisher.publish(executionId, ExecutionEventType.CONSOLE_LOG, { level, message: msg });
          // Persist diagnostic log
          const logEntry = this.logRepo.create({
            executionId,
            level: level.toUpperCase(),
            message: msg,
          });
          await this.logRepo.save(logEntry).catch(() => {});
        },
      );

      // Execute Flow Graph
      const execOutcome = await this.flowExecutor.executeFlow(page, payload.graph_definition, state);
      resultStatus = execOutcome.status;
      errorMessage = execOutcome.errorMessage;
    } catch (err: any) {
      resultStatus = 'failed';
      errorMessage = err.message || String(err);
      this.logger.error(`Execution ${executionId} error: ${errorMessage}`);
    } finally {
      await isolatedSession.close();
    }

    const duration_ms = Date.now() - start;

    // 3. Persist ExecutionStepEntity records into PostgreSQL
    for (let i = 0; i < state.stepResults.length; i++) {
      const step = state.stepResults[i];
      const stepEntity = this.stepRepo.create({
        executionId,
        stepIndex: i + 1,
        nodeId: step.nodeId,
        stepType: 'action',
        action: step.action,
        status: step.status,
        durationMs: step.duration_ms,
        errorMessage: step.error || null,
      });
      await this.stepRepo.save(stepEntity).catch(() => {});
    }

    // 4. Persist Playwright trace artifact if recorded
    if (isolatedSession.tracePath && fs.existsSync(isolatedSession.tracePath)) {
      try {
        const fileBuffer = fs.readFileSync(isolatedSession.tracePath);
        const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const artifact = this.artifactRepo.create({
          executionId,
          artifactType: 'trace',
          filePath: isolatedSession.tracePath,
          fileSizeBytes: fileBuffer.length,
          mimeType: 'application/zip',
          sha256Hash: sha256,
        });
        await this.artifactRepo.save(artifact);
      } catch (traceErr: any) {
        this.logger.warn(`Could not save trace artifact: ${traceErr.message}`);
      }
    }

    // 5. Finalize Execution record in PostgreSQL (enforce valid state machine transitions)
    const latestExec = await this.executionRepo.findOne({ where: { id: executionId } }).catch(() => null);
    if (!latestExec || (!isTerminalExecutionStatus(latestExec.status) && canTransitionExecutionStatus(latestExec.status, resultStatus))) {
      await this.executionRepo.update(executionId, {
        status: resultStatus,
        completedAt: new Date(),
        durationMs: duration_ms,
        summary: {
          engine: 'playwright',
          steps_total: state.stepResults.length,
          steps_passed: state.stepResults.filter((s) => s.status === 'passed').length,
          steps_failed: state.stepResults.filter((s) => s.status === 'failed').length,
          error_message: errorMessage || null,
        } as any,
      }).catch((e) => this.logger.warn(`Could not update execution terminal status: ${e.message}`));
    } else if (latestExec?.status === 'cancelled') {
      resultStatus = 'cancelled';
    }

    // 6. Publish Final Status Change to monitoring subscribers
    await this.eventPublisher.publish(executionId, ExecutionEventType.STATUS_CHANGE, {
      status: resultStatus,
      duration_ms,
      message: errorMessage || `Execution completed with status '${resultStatus}'.`,
    });

    return {
      execution_id: executionId,
      status: resultStatus,
      duration_ms,
      steps_total: state.stepResults.length,
      steps_passed: state.stepResults.filter((s) => s.status === 'passed').length,
      steps_failed: state.stepResults.filter((s) => s.status === 'failed').length,
      error_message: errorMessage,
      artifacts: {
        screenshots: [],
        trace_path: isolatedSession.tracePath,
      },
    };
  }

  async onModuleDestroy() {
    if (this.worker) {
      this.logger.log('Gracefully closing BullMQ ExecutionWorker...');
      await this.worker.close();
    }
  }
}

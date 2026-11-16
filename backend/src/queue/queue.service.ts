import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Job } from 'bullmq';
import Redis from 'ioredis';
import { ExecuteJobDto } from '../contracts/execution.contract';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private executionQueue: Queue;
  private suiteQueue: Queue;
  private maintenanceQueue: Queue;
  private redisClient: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redis = this.configService.get('app.redis');
    const redisConnection = {
      host: redis.host,
      port: redis.port,
      password: redis.password,
      db: redis.db,
      maxRetriesPerRequest: null,
    };

    this.redisClient = new Redis({
      host: redis.host,
      port: redis.port,
      password: redis.password,
      db: redis.db,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.redisClient.connect().catch((err) => {
      this.logger.warn(`Redis client in QueueService failed to connect: ${err.message}`);
    });

    this.executionQueue = new Queue('browser-execution', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 1, // Non-idempotent browser actions should not retry blindly
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    this.suiteQueue = new Queue('test-suite-execution', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    this.maintenanceQueue = new Queue('maintenance', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });

    this.logger.log('BullMQ queues initialized: browser-execution, test-suite-execution, maintenance.');
  }

  async addExecutionJob(payload: ExecuteJobDto): Promise<Job> {
    const jobId = `exec-${payload.execution_id}`;
    this.logger.log(`Queueing execution job ${jobId} (correlation: ${payload.correlation_id || 'none'})...`);

    // Reset cancellation flag in Redis if previously set
    if (this.redisClient && this.redisClient.status === 'ready') {
      await this.redisClient.del(`execution:cancelled:${payload.execution_id}`).catch(() => {});
    }

    return this.executionQueue.add('execute-flow', payload, {
      jobId, // Idempotency: prevents duplicate queueing of the same execution
      priority: 1,
    });
  }

  async addSuiteJob(suiteRunId: string, payload: Record<string, any>): Promise<Job> {
    const jobId = `suite-${suiteRunId}`;
    return this.suiteQueue.add('execute-suite', payload, { jobId });
  }

  async addMaintenanceJob(taskName: string, data: Record<string, any>): Promise<Job> {
    return this.maintenanceQueue.add(taskName, data);
  }

  async cancelJob(executionId: string): Promise<boolean> {
    const jobId = `exec-${executionId}`;
    let cancelled = false;

    // 1. Set atomic Redis cancellation flag with 24h TTL
    try {
      if (this.redisClient && this.redisClient.status === 'ready') {
        await this.redisClient.set(`execution:cancelled:${executionId}`, '1', 'EX', 86400);
        cancelled = true;
      }
    } catch (err: any) {
      this.logger.warn(`Failed to set Redis cancellation key for ${executionId}: ${err.message}`);
    }

    // 2. Remove or signal BullMQ job
    try {
      const job = await this.executionQueue.getJob(jobId);
      if (job) {
        const state = await job.getState();
        if (state === 'waiting' || state === 'delayed') {
          await job.remove();
          cancelled = true;
        } else {
          await job.updateProgress({ cancelled: true });
          cancelled = true;
        }
      }
    } catch (err: any) {
      this.logger.debug(`BullMQ getJob cancellation check error: ${err.message}`);
    }

    return cancelled;
  }

  async isExecutionCancelled(executionId: string): Promise<boolean> {
    try {
      if (this.redisClient && this.redisClient.status === 'ready') {
        const flag = await this.redisClient.get(`execution:cancelled:${executionId}`);
        if (flag === '1') return true;
      }
    } catch {
      // fallback to job progress check
    }

    try {
      const job = await this.executionQueue.getJob(`exec-${executionId}`);
      if (job) {
        const progress = job.progress as any;
        if (progress?.cancelled === true) return true;
      }
    } catch {
      // ignore
    }

    return false;
  }

  async getQueueMetrics(): Promise<{ waiting: number; active: number; failed: number; completed: number }> {
    const counts = await this.executionQueue.getJobCounts('waiting', 'active', 'failed', 'completed');
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      failed: counts.failed || 0,
      completed: counts.completed || 0,
    };
  }

  async onModuleDestroy() {
    if (this.executionQueue) await this.executionQueue.close();
    if (this.suiteQueue) await this.suiteQueue.close();
    if (this.maintenanceQueue) await this.maintenanceQueue.close();
    if (this.redisClient) await this.redisClient.quit().catch(() => {});
  }
}

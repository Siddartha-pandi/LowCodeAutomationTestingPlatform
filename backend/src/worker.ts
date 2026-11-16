import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('PlaywrightWorkerBootstrap');
  logger.log('Starting standalone Playwright BullMQ Worker Process...');

  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const concurrency = configService.get<number>('app.worker.concurrency') || 2;
  const redisHost = configService.get<string>('app.redis.host') || '127.0.0.1';
  const redisPort = configService.get<number>('app.redis.port') || 6379;

  logger.log('================================================================');
  logger.log(`🚀 Standalone Playwright Execution Worker is Active`);
  logger.log(`   Redis: ${redisHost}:${redisPort}`);
  logger.log(`   Worker Concurrency: ${concurrency}`);
  logger.log(`   Target Queues: browser-execution, test-suite-execution, maintenance`);
  logger.log('================================================================');
}

bootstrap().catch((err) => {
  const logger = new Logger('PlaywrightWorkerBootstrap');
  logger.error(`Fatal error in Worker bootstrap: ${err.message}`, err.stack);
  process.exit(1);
});

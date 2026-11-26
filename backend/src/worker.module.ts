import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { appConfig } from './config/configuration';
import { validateEnvironment } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { BrowserModule } from './modules/browser/browser.module';
import { SelectorsModule } from './modules/selectors/selectors.module';
import { ActionsModule } from './modules/actions/actions.module';
import { AssertionsModule } from './modules/assertions/assertions.module';
import { ScreenshotsModule } from './modules/screenshots/screenshots.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { ChangeDetectionModule } from './modules/change-detection/change-detection.module';
import { FlowsModule } from './modules/flows/flows.module';
import { QueueModule } from './queue/queue.module';
import { ExecutionWorker } from './workers/execution.worker';
import { SuiteWorker } from './workers/suite.worker';
import { ExecutionEntity } from './database/entities/execution.entity';
import { ExecutionStepEntity } from './database/entities/execution-step.entity';
import { ExecutionLogEntity } from './database/entities/execution-log.entity';
import { ArtifactEntity } from './database/entities/artifact.entity';
import { AutomationDefinitionEntity } from './database/entities/automation-definition.entity';
import { DefinitionVersionEntity } from './database/entities/definition-version.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([
      ExecutionEntity,
      ExecutionStepEntity,
      ExecutionLogEntity,
      ArtifactEntity,
      AutomationDefinitionEntity,
      DefinitionVersionEntity,
    ]),
    BrowserModule,
    SelectorsModule,
    ActionsModule,
    AssertionsModule,
    ScreenshotsModule,
    MonitoringModule,
    ChangeDetectionModule,
    FlowsModule,
    QueueModule,
  ],
  providers: [ExecutionWorker, SuiteWorker],
})
export class WorkerModule {}

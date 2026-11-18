import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutionEntity } from '../database/entities/execution.entity';
import { ExecutionStepEntity } from '../database/entities/execution-step.entity';
import { ExecutionLogEntity } from '../database/entities/execution-log.entity';
import { ArtifactEntity } from '../database/entities/artifact.entity';
import { AutomationDefinitionEntity } from '../database/entities/automation-definition.entity';
import { DefinitionVersionEntity } from '../database/entities/definition-version.entity';
import { BrowserModule } from '../modules/browser/browser.module';
import { FlowsModule } from '../modules/flows/flows.module';
import { MonitoringModule } from '../modules/monitoring/monitoring.module';
import { QueueModule } from '../queue/queue.module';
import { ExecutionWorker } from './execution.worker';
import { SuiteWorker } from './suite.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExecutionEntity,
      ExecutionStepEntity,
      ExecutionLogEntity,
      ArtifactEntity,
      AutomationDefinitionEntity,
      DefinitionVersionEntity,
    ]),
    BrowserModule,
    FlowsModule,
    MonitoringModule,
    QueueModule,
  ],
  providers: [ExecutionWorker, SuiteWorker],
  exports: [ExecutionWorker, SuiteWorker],
})
export class WorkersModule {}

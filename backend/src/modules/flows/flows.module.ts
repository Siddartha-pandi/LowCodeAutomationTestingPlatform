import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationDefinitionEntity } from '../../database/entities/automation-definition.entity';
import { DefinitionVersionEntity } from '../../database/entities/definition-version.entity';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { ExecutionStepEntity } from '../../database/entities/execution-step.entity';
import { ExecutionLogEntity } from '../../database/entities/execution-log.entity';
import { EnvironmentEntity } from '../../database/entities/environment.entity';
import { FlowsService } from './flows.service';
import { FlowsController } from './flows.controller';
import { FlowExecutorService } from './flow-executor.service';
import { ProjectsModule } from '../projects/projects.module';
import { QueueModule } from '../../queue/queue.module';
import { ActionsModule } from '../actions/actions.module';
import { AssertionsModule } from '../assertions/assertions.module';
import { ScreenshotsModule } from '../screenshots/screenshots.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { BrowserModule } from '../browser/browser.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AutomationDefinitionEntity,
      DefinitionVersionEntity,
      ExecutionEntity,
      ExecutionStepEntity,
      ExecutionLogEntity,
      EnvironmentEntity,
    ]),
    ProjectsModule,
    QueueModule,
    ActionsModule,
    AssertionsModule,
    ScreenshotsModule,
    MonitoringModule,
    BrowserModule,
  ],
  controllers: [FlowsController],
  providers: [FlowsService, FlowExecutorService],
  exports: [FlowsService, FlowExecutorService],
})
export class FlowsModule {}

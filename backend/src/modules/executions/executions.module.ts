import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { ExecutionStepEntity } from '../../database/entities/execution-step.entity';
import { ExecutionLogEntity } from '../../database/entities/execution-log.entity';
import { ArtifactEntity } from '../../database/entities/artifact.entity';
import { ProjectsModule } from '../projects/projects.module';
import { QueueModule } from '../../queue/queue.module';
import { BrowserModule } from '../browser/browser.module';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExecutionEntity,
      ExecutionStepEntity,
      ExecutionLogEntity,
      ArtifactEntity,
    ]),
    ProjectsModule,
    QueueModule,
    BrowserModule,
  ],
  controllers: [ExecutionsController],
  providers: [ExecutionsService],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}

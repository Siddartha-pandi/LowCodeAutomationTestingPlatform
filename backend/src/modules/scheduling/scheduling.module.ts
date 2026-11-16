import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduleEntity } from '../../database/entities/schedule.entity';
import { AutomationDefinitionEntity } from '../../database/entities/automation-definition.entity';
import { DefinitionVersionEntity } from '../../database/entities/definition-version.entity';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { EnvironmentEntity } from '../../database/entities/environment.entity';
import { QueueModule } from '../../queue/queue.module';
import { ProjectsModule } from '../projects/projects.module';
import { SchedulesService } from './schedules.service';
import { ScheduleRunnerService } from './schedule-runner.service';
import { SchedulesController } from './schedules.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScheduleEntity,
      AutomationDefinitionEntity,
      DefinitionVersionEntity,
      ExecutionEntity,
      EnvironmentEntity,
    ]),
    ScheduleModule.forRoot(),
    QueueModule,
    ProjectsModule,
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService, ScheduleRunnerService],
  exports: [SchedulesService],
})
export class SchedulingModule {}

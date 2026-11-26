import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElementProfileEntity } from '../../database/entities/element-profile.entity';
import { LocatorHistoryEntity } from '../../database/entities/locator-history.entity';
import { HealingEventEntity } from '../../database/entities/healing-event.entity';
import { ApprovalEntity } from '../../database/entities/approval.entity';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { ProjectsModule } from '../projects/projects.module';
import { ChangeDetectorService } from './change-detector.service';
import { ElementsService } from './elements.service';
import { HealingService } from './healing.service';
import { ElementsController } from './elements.controller';
import { HealingController } from './healing.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ElementProfileEntity,
      LocatorHistoryEntity,
      HealingEventEntity,
      ApprovalEntity,
      ExecutionEntity,
    ]),
    ProjectsModule,
  ],
  controllers: [ElementsController, HealingController],
  providers: [ChangeDetectorService, ElementsService, HealingService],
  exports: [ChangeDetectorService, ElementsService, HealingService],
})
export class ChangeDetectionModule {}

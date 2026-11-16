import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationDefinitionEntity } from '../../database/entities/automation-definition.entity';
import { DefinitionVersionEntity } from '../../database/entities/definition-version.entity';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { ProjectsModule } from '../projects/projects.module';
import { QueueModule } from '../../queue/queue.module';
import { TestSuitesService } from './test-suites.service';
import { TestSuitesController } from './test-suites.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AutomationDefinitionEntity,
      DefinitionVersionEntity,
      ExecutionEntity,
    ]),
    ProjectsModule,
    QueueModule,
  ],
  controllers: [TestSuitesController],
  providers: [TestSuitesService],
  exports: [TestSuitesService],
})
export class TestSuitesModule {}

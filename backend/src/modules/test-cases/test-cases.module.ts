import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationDefinitionEntity } from '../../database/entities/automation-definition.entity';
import { DefinitionVersionEntity } from '../../database/entities/definition-version.entity';
import { TestDatasetEntity } from '../../database/entities/test-dataset.entity';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { EnvironmentEntity } from '../../database/entities/environment.entity';
import { ProjectsModule } from '../projects/projects.module';
import { QueueModule } from '../../queue/queue.module';
import { TestCasesService } from './test-cases.service';
import { TestCasesController } from './test-cases.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AutomationDefinitionEntity,
      DefinitionVersionEntity,
      TestDatasetEntity,
      ExecutionEntity,
      EnvironmentEntity,
    ]),
    ProjectsModule,
    QueueModule,
  ],
  controllers: [TestCasesController],
  providers: [TestCasesService],
  exports: [TestCasesService],
})
export class TestCasesModule {}

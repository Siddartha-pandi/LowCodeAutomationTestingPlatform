import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { ProjectEntity } from '../../database/entities/project.entity';
import { ProjectsModule } from '../projects/projects.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExecutionEntity, ProjectEntity]), ProjectsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

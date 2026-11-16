import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ArtifactEntity } from '../../database/entities/artifact.entity';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { ProjectsModule } from '../projects/projects.module';
import { ArtifactsService } from './artifacts.service';
import { ArtifactsController } from './artifacts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ArtifactEntity, ExecutionEntity]),
    ConfigModule,
    ProjectsModule,
  ],
  controllers: [ArtifactsController],
  providers: [ArtifactsService],
  exports: [ArtifactsService],
})
export class ArtifactsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { ExecutionStepEntity } from '../../database/entities/execution-step.entity';
import { ProjectsModule } from '../projects/projects.module';
import { EventPublisherService } from './event-publisher.service';
import { MonitoringGateway } from './monitoring.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExecutionEntity, ExecutionStepEntity]),
    JwtModule,
    ConfigModule,
    ProjectsModule,
  ],
  providers: [EventPublisherService, MonitoringGateway],
  exports: [EventPublisherService, MonitoringGateway],
})
export class MonitoringModule {}

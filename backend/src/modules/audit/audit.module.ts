import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { ExecutionLogEntity } from '../../database/entities/execution-log.entity';
import { ArtifactEntity } from '../../database/entities/artifact.entity';
import { DOMSnapshotEntity } from '../../database/entities/dom-snapshot.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLogEntity,
      ExecutionLogEntity,
      ArtifactEntity,
      DOMSnapshotEntity,
    ]),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

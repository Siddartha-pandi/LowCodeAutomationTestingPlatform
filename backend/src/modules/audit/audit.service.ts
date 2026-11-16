import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { ExecutionLogEntity } from '../../database/entities/execution-log.entity';
import { ArtifactEntity } from '../../database/entities/artifact.entity';
import { DOMSnapshotEntity } from '../../database/entities/dom-snapshot.entity';
import {
  ExportAuditLogsQueryDto,
  ListAuditLogsQueryDto,
  PurgeRetentionDto,
} from './dto/audit.dto';

export interface LogAuditParams {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  clientIp?: string | null;
  details?: Record<string, any> | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepository: Repository<AuditLogEntity>,
    @InjectRepository(ExecutionLogEntity)
    private readonly executionLogRepository: Repository<ExecutionLogEntity>,
    @InjectRepository(ArtifactEntity)
    private readonly artifactRepository: Repository<ArtifactEntity>,
    @InjectRepository(DOMSnapshotEntity)
    private readonly domSnapshotRepository: Repository<DOMSnapshotEntity>,
  ) {}

  async logAuditEvent(params: LogAuditParams): Promise<AuditLogEntity> {
    try {
      const entry = this.auditRepository.create({
        userId: params.userId || null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        clientIp: params.clientIp || null,
        details: params.details || null,
      });
      return await this.auditRepository.save(entry);
    } catch (err: any) {
      this.logger.warn(`Failed to record audit log: ${err.message}`);
      return null as any;
    }
  }

  async listAuditLogs(dto: ListAuditLogsQueryDto): Promise<any[]> {
    const qb = this.buildFilterQuery(dto);
    qb.orderBy('audit.timestamp', 'DESC')
      .skip(dto.skip || 0)
      .take(dto.limit || 50);

    const logs = await qb.getMany();
    return logs.map((l) => this.formatAuditLog(l));
  }

  async exportAuditLogs(
    dto: ExportAuditLogsQueryDto,
  ): Promise<{ content: string; contentType: string; filename: string }> {
    const qb = this.buildFilterQuery(dto);
    qb.orderBy('audit.timestamp', 'DESC').take(dto.limit || 2000);

    const logs = await qb.getMany();

    if (dto.format === 'json') {
      const data = logs.map((l) => ({
        id: l.id,
        timestamp: l.timestamp,
        user_id: l.userId,
        action: l.action,
        resource_type: l.resourceType,
        resource_id: l.resourceId,
        client_ip: l.clientIp,
        details: l.details,
      }));
      return {
        content: JSON.stringify(data, null, 2),
        contentType: 'application/json',
        filename: 'audit_logs.json',
      };
    }

    const lines = [
      'Timestamp (UTC),User ID,Action,Resource Type,Resource ID,Client IP,Details',
    ];

    for (const log of logs) {
      const ts = log.timestamp ? new Date(log.timestamp).toISOString() : '';
      const detailsStr = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '';
      lines.push(
        `"${ts}","${log.userId || 'SYSTEM'}","${log.action}","${log.resourceType}","${
          log.resourceId || ''
        }","${log.clientIp || ''}","${detailsStr}"`,
      );
    }

    return {
      content: lines.join('\n'),
      contentType: 'text/csv; charset=utf-8',
      filename: 'audit_logs.csv',
    };
  }

  async purgeRetention(dto: PurgeRetentionDto, currentUserId?: string): Promise<any> {
    const logHorizon = new Date();
    logHorizon.setDate(logHorizon.getDate() - (dto.log_days || 90));

    const screenshotHorizon = new Date();
    screenshotHorizon.setDate(screenshotHorizon.getDate() - (dto.screenshot_days || 30));

    const domHorizon = new Date();
    domHorizon.setDate(domHorizon.getDate() - (dto.dom_days || 14));

    const logsPurged = await this.executionLogRepository.delete({
      timestamp: LessThan(logHorizon),
    });

    const screenshotsPurged = await this.artifactRepository.delete({
      artifactType: 'screenshot',
      createdAt: LessThan(screenshotHorizon),
    });

    const domPurged = await this.domSnapshotRepository.delete({
      createdAt: LessThan(domHorizon),
    });

    const counts = {
      execution_logs: logsPurged.affected || 0,
      screenshots: screenshotsPurged.affected || 0,
      dom_snapshots: domPurged.affected || 0,
    };

    await this.logAuditEvent({
      userId: currentUserId,
      action: 'retention.purge_executed',
      resourceType: 'system',
      resourceId: 'retention_policy',
      details: {
        log_retention_days: dto.log_days,
        screenshot_retention_days: dto.screenshot_days,
        dom_retention_days: dto.dom_days,
        purged: counts,
      },
    });

    return {
      status: 'completed',
      purged: counts,
      policy_horizons: {
        log_days: dto.log_days,
        screenshot_days: dto.screenshot_days,
        dom_days: dto.dom_days,
      },
      executed_at: new Date().toISOString(),
    };
  }

  private buildFilterQuery(dto: any) {
    const qb = this.auditRepository.createQueryBuilder('audit');

    if (dto.user_id) {
      qb.andWhere('audit.userId = :uid', { uid: dto.user_id });
    }
    if (dto.action) {
      qb.andWhere('audit.action ILIKE :action', { action: `%${dto.action}%` });
    }
    if (dto.resource_type) {
      qb.andWhere('audit.resourceType = :rt', { rt: dto.resource_type });
    }
    if (dto.start_date) {
      qb.andWhere('audit.timestamp >= :start', { start: new Date(dto.start_date) });
    }
    if (dto.end_date) {
      qb.andWhere('audit.timestamp <= :end', { end: new Date(dto.end_date) });
    }

    return qb;
  }

  private formatAuditLog(l: AuditLogEntity) {
    return {
      id: l.id,
      timestamp: l.timestamp,
      user_id: l.userId,
      action: l.action,
      resource_type: l.resourceType,
      resource_id: l.resourceId,
      client_ip: l.clientIp,
      details: l.details,
    };
  }
}

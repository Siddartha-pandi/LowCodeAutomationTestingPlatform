import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealingEventEntity } from '../../database/entities/healing-event.entity';
import { ApprovalEntity } from '../../database/entities/approval.entity';
import { ExecutionEntity } from '../../database/entities/execution.entity';
import { ElementProfileEntity } from '../../database/entities/element-profile.entity';
import { ProjectsService } from '../projects/projects.service';
import { ListApprovalsDto, ListHealingEventsDto } from './dto/healing.dto';

@Injectable()
export class HealingService {
  private readonly logger = new Logger(HealingService.name);

  constructor(
    @InjectRepository(HealingEventEntity)
    private readonly healingRepository: Repository<HealingEventEntity>,
    @InjectRepository(ApprovalEntity)
    private readonly approvalRepository: Repository<ApprovalEntity>,
    @InjectRepository(ExecutionEntity)
    private readonly executionRepository: Repository<ExecutionEntity>,
    @InjectRepository(ElementProfileEntity)
    private readonly profileRepository: Repository<ElementProfileEntity>,
    private readonly projectsService: ProjectsService,
  ) {}

  private async resolveHealingProjectId(event: HealingEventEntity): Promise<string | null> {
    if (event.executionId) {
      const exec = await this.executionRepository.findOne({ where: { id: event.executionId } });
      if (exec?.projectId) return exec.projectId;
    }
    if (event.elementProfileId) {
      const prof = await this.profileRepository.findOne({ where: { id: event.elementProfileId } });
      if (prof?.projectId) return prof.projectId;
    }
    return null;
  }

  async listHealingEvents(
    dto: ListHealingEventsDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any[]> {
    const qb = this.healingRepository
      .createQueryBuilder('h')
      .leftJoin(ExecutionEntity, 'exec', 'exec.id = h.executionId')
      .leftJoin(ElementProfileEntity, 'prof', 'prof.id = h.elementProfileId');

    if (!isSuperuser) {
      const projects = await this.projectsService.listProjects(userId, false);
      if (projects.length === 0) return [];
      const projectIds = projects.map((p) => p.id);
      qb.andWhere('(exec.projectId IN (:...projectIds) OR prof.projectId IN (:...projectIds))', {
        projectIds,
      });
    }

    if (dto.execution_id) {
      qb.andWhere('h.executionId = :execId', { execId: dto.execution_id });
    }
    if (dto.element_profile_id) {
      qb.andWhere('h.elementProfileId = :profId', { profId: dto.element_profile_id });
    }
    if (dto.decision) {
      qb.andWhere('h.decision = :dec', { dec: dto.decision });
    }

    qb.orderBy('h.timestamp', 'DESC')
      .skip(dto.offset || 0)
      .take(dto.limit || 50);

    const events = await qb.getMany();
    return events.map((e) => ({
      id: e.id,
      execution_id: e.executionId,
      element_profile_id: e.elementProfileId,
      original_locator: e.originalLocator,
      healed_locator: e.healedLocator,
      confidence_score: e.confidenceScore,
      decision: e.decision,
      is_approved: e.isApproved,
      scoring_breakdown: e.scoringBreakdown || {},
      timestamp: e.timestamp,
    }));
  }

  async listApprovals(
    dto: ListApprovalsDto,
    userId: string,
    isSuperuser = false,
  ): Promise<any[]> {
    const qb = this.approvalRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.healingEvent', 'healingEvent')
      .leftJoin(ExecutionEntity, 'exec', 'exec.id = healingEvent.executionId')
      .leftJoin(ElementProfileEntity, 'prof', 'prof.id = healingEvent.elementProfileId');

    if (!isSuperuser) {
      const projects = await this.projectsService.listProjects(userId, false);
      if (projects.length === 0) return [];
      const projectIds = projects.map((p) => p.id);
      qb.andWhere('(exec.projectId IN (:...projectIds) OR prof.projectId IN (:...projectIds))', {
        projectIds,
      });
    }

    if (dto.status) {
      qb.andWhere('a.status = :status', { status: dto.status });
    }

    qb.orderBy('a.createdAt', 'DESC')
      .skip(dto.offset || 0)
      .take(dto.limit || 50);

    const approvals = await qb.getMany();
    return approvals.map((a) => ({
      id: a.id,
      healing_event_id: a.healingEventId,
      status: a.status,
      created_at: a.createdAt,
      responded_at: a.respondedAt,
      approved_by: a.approvedBy,
      healing_event: a.healingEvent
        ? {
            id: a.healingEvent.id,
            original_locator: a.healingEvent.originalLocator,
            healed_locator: a.healingEvent.healedLocator,
            confidence_score: a.healingEvent.confidenceScore,
            decision: a.healingEvent.decision,
          }
        : null,
    }));
  }

  async respondToApproval(
    id: string,
    decision: 'approved' | 'rejected',
    userId: string,
    isSuperuser = false,
  ): Promise<any> {
    const approval = await this.approvalRepository.findOne({
      where: { id },
      relations: ['healingEvent'],
    });

    if (!approval) {
      throw new NotFoundException(`Approval request '${id}' not found`);
    }

    if (approval.healingEvent) {
      const projectId = await this.resolveHealingProjectId(approval.healingEvent);
      if (projectId) {
        await this.projectsService.verifyProjectAccess(projectId, userId, isSuperuser);
      }
    }

    if (approval.status !== 'pending') {
      throw new BadRequestException(
        `Approval request is already resolved with status '${approval.status}'`,
      );
    }

    approval.status = decision;
    approval.approvedBy = userId;
    approval.respondedAt = new Date();

    if (approval.healingEvent) {
      approval.healingEvent.isApproved = decision === 'approved';
      await this.healingRepository.save(approval.healingEvent);
    }

    const saved = await this.approvalRepository.save(approval);
    return {
      id: saved.id,
      status: saved.status,
      responded_at: saved.respondedAt,
      approved_by: saved.approvedBy,
    };
  }
}

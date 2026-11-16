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
import { ListApprovalsDto, ListHealingEventsDto } from './dto/healing.dto';

@Injectable()
export class HealingService {
  private readonly logger = new Logger(HealingService.name);

  constructor(
    @InjectRepository(HealingEventEntity)
    private readonly healingRepository: Repository<HealingEventEntity>,
    @InjectRepository(ApprovalEntity)
    private readonly approvalRepository: Repository<ApprovalEntity>,
  ) {}

  async listHealingEvents(dto: ListHealingEventsDto): Promise<any[]> {
    const qb = this.healingRepository.createQueryBuilder('h');

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

  async listApprovals(dto: ListApprovalsDto): Promise<any[]> {
    const qb = this.approvalRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.healingEvent', 'healingEvent');

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
  ): Promise<any> {
    const approval = await this.approvalRepository.findOne({
      where: { id },
      relations: ['healingEvent'],
    });

    if (!approval) {
      throw new NotFoundException(`Approval request '${id}' not found`);
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

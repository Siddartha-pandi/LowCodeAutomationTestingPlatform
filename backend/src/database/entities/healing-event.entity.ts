import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExecutionEntity } from './execution.entity';
import { ElementProfileEntity } from './element-profile.entity';

@Entity('healing_events')
export class HealingEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'execution_id' })
  executionId: string;

  @Column({ type: 'uuid', name: 'element_profile_id' })
  elementProfileId: string;

  @Column({ type: 'varchar', length: 512, name: 'original_locator' })
  originalLocator: string;

  @Column({ type: 'varchar', length: 512, name: 'healed_locator' })
  healedLocator: string;

  @Column({ type: 'float', name: 'confidence_score' })
  confidenceScore: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb", name: 'scoring_breakdown' })
  scoringBreakdown: Record<string, any>;

  @Column({ type: 'varchar', length: 32 })
  decision: string;

  @Column({ type: 'boolean', default: false, name: 'is_approved' })
  isApproved: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp: Date;

  @ManyToOne(() => ExecutionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'execution_id' })
  execution: ExecutionEntity;

  @ManyToOne(() => ElementProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'element_profile_id' })
  elementProfile: ElementProfileEntity;
}

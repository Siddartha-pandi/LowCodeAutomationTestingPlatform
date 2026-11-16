import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { HealingEventEntity } from './healing-event.entity';
import { UserEntity } from './user.entity';

@Entity('approvals')
export class ApprovalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'healing_event_id' })
  healingEventId: string;

  @Column({ type: 'uuid', nullable: true, name: 'requested_by' })
  requestedBy?: string;

  @Column({ type: 'uuid', nullable: true, name: 'approved_by' })
  approvedBy?: string;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'responded_at' })
  respondedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => HealingEventEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'healing_event_id' })
  healingEvent: HealingEventEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'requested_by' })
  requester?: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver?: UserEntity;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExecutionEntity } from './execution.entity';

@Entity('execution_logs')
export class ExecutionLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'execution_id' })
  executionId: string;

  @Column({ type: 'uuid', nullable: true, name: 'step_id' })
  stepId?: string;

  @Column({ type: 'varchar', length: 16, default: 'info' })
  level: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', default: false, name: 'is_redacted' })
  isRedacted: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp: Date;

  @ManyToOne(() => ExecutionEntity, (exec) => exec.logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'execution_id' })
  execution: ExecutionEntity;
}

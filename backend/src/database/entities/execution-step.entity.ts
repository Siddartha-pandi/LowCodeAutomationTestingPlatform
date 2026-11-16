import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExecutionEntity } from './execution.entity';

@Entity('execution_steps')
export class ExecutionStepEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'execution_id' })
  executionId: string;

  @Column({ type: 'int', name: 'step_index' })
  stepIndex: number;

  @Column({ type: 'varchar', length: 64, name: 'node_id' })
  nodeId: string;

  @Column({ type: 'varchar', length: 64, default: 'action', name: 'step_type' })
  stepType: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  action?: string;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string;

  @Column({ type: 'jsonb', nullable: true, name: 'input_data' })
  inputData?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true, name: 'result_data' })
  resultData?: Record<string, any>;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string;

  @Column({ type: 'float', default: 0, name: 'duration_ms' })
  durationMs: number;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'screenshot_path' })
  screenshotPath?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ExecutionEntity, (exec) => exec.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'execution_id' })
  execution: ExecutionEntity;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExecutionEntity } from './execution.entity';

@Entity('dom_snapshots')
export class DOMSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'execution_id' })
  executionId: string;

  @Column({ type: 'varchar', length: 1024, name: 'page_url' })
  pageUrl: string;

  @Column({ type: 'varchar', length: 512, name: 'snapshot_path' })
  snapshotPath: string;

  @Column({ type: 'int', default: 0, name: 'element_count' })
  elementCount: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ExecutionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'execution_id' })
  execution: ExecutionEntity;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExecutionEntity } from './execution.entity';

@Entity('artifacts')
export class ArtifactEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'execution_id' })
  executionId: string;

  @Column({ type: 'varchar', length: 32, name: 'artifact_type' })
  artifactType: string;

  @Column({ type: 'varchar', length: 512, name: 'file_path' })
  filePath: string;

  @Column({ type: 'bigint', default: 0, name: 'file_size_bytes' })
  fileSizeBytes: number;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'mime_type' })
  mimeType?: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'sha256_hash' })
  sha256Hash?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ExecutionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'execution_id' })
  execution: ExecutionEntity;
}

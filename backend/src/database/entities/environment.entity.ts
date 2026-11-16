import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';

@Entity('environments')
export class EnvironmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'base_url' })
  baseUrl?: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb", name: 'allowed_domains' })
  allowedDomains: string[];

  @Column({ type: 'text', nullable: true, name: 'variables_encrypted' })
  variablesEncrypted?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';

@Entity('credentials')
export class CredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 32, name: 'credential_type' })
  credentialType: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  username?: string;

  @Column({ type: 'text', name: 'secret_encrypted' })
  secretEncrypted: string;

  @Column({ type: 'varchar', length: 256, nullable: true, name: 'domain_scope' })
  domainScope?: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;
}

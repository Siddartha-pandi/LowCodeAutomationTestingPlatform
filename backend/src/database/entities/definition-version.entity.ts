import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AutomationDefinitionEntity } from './automation-definition.entity';
import { UserEntity } from './user.entity';

@Entity('definition_versions')
export class DefinitionVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'definition_id' })
  definitionId: string;

  @Column({ type: 'int', name: 'version_num' })
  versionNum: number;

  @Column({ type: 'jsonb', name: 'definition_json' })
  definitionJson: Record<string, any>;

  @Column({ type: 'varchar', length: 64, name: 'checksum_sha256' })
  checksumSha256: string;

  @Column({ type: 'boolean', default: false, name: 'is_published' })
  isPublished: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'published_by' })
  publishedBy?: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'published_at' })
  publishedAt?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => AutomationDefinitionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'definition_id' })
  definition: AutomationDefinitionEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'published_by' })
  publisher?: UserEntity;
}

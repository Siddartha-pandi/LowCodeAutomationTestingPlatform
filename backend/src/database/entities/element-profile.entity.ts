import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { ProjectEntity } from './project.entity';
import { LocatorHistoryEntity } from './locator-history.entity';

@Entity('element_profiles')
@Unique('uq_project_logical_id', ['projectId', 'logicalId'])
export class ElementProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'varchar', length: 120, name: 'logical_id' })
  logicalId: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 64, name: 'element_type' })
  elementType: string;

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'page_context' })
  pageContext?: string;

  @Column({ type: 'varchar', length: 256, nullable: true, name: 'original_text' })
  originalText?: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb", name: 'stable_attributes' })
  stableAttributes: Record<string, any>;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb", name: 'structural_fingerprint' })
  structuralFingerprint: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @OneToMany(() => LocatorHistoryEntity, (lh) => lh.elementProfile)
  locators: Relation<LocatorHistoryEntity[]>;
}

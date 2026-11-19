import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { ProjectEntity } from './project.entity';
import { AutomationDefinitionEntity } from './automation-definition.entity';
import { DefinitionVersionEntity } from './definition-version.entity';
import { EnvironmentEntity } from './environment.entity';
import { UserEntity } from './user.entity';
import { ExecutionStepEntity } from './execution-step.entity';
import { ExecutionLogEntity } from './execution-log.entity';

@Entity('executions')
export class ExecutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', name: 'definition_id' })
  definitionId: string;

  @Column({ type: 'uuid', nullable: true, name: 'definition_version_id' })
  definitionVersionId?: string;

  @Column({ type: 'uuid', nullable: true, name: 'environment_id' })
  environmentId?: string;

  @Column({ type: 'varchar', length: 32, default: 'manual', name: 'trigger_type' })
  triggerType: string;

  @Column({ type: 'uuid', nullable: true, name: 'triggered_by' })
  triggeredBy?: string;

  @Column({ type: 'varchar', length: 32, default: 'queued' })
  status: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'session_id' })
  sessionId?: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'started_at' })
  startedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt?: Date;

  @Column({ type: 'float', default: 0, name: 'duration_ms' })
  durationMs: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  summary: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @ManyToOne(() => AutomationDefinitionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'definition_id' })
  definition: AutomationDefinitionEntity;

  @ManyToOne(() => DefinitionVersionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'definition_version_id' })
  version?: DefinitionVersionEntity;

  @ManyToOne(() => EnvironmentEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'environment_id' })
  environment?: EnvironmentEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'triggered_by' })
  user?: UserEntity;

  @OneToMany(() => ExecutionStepEntity, (step) => step.execution)
  steps: Relation<ExecutionStepEntity[]>;

  @OneToMany(() => ExecutionLogEntity, (log) => log.execution)
  logs: Relation<ExecutionLogEntity[]>;
}

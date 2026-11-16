import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AutomationDefinitionEntity } from './automation-definition.entity';
import { EnvironmentEntity } from './environment.entity';

@Entity('schedules')
export class ScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'definition_id' })
  definitionId: string;

  @Column({ type: 'uuid', nullable: true, name: 'environment_id' })
  environmentId?: string;

  @Column({ type: 'varchar', length: 64, name: 'cron_expression' })
  cronExpression: string;

  @Column({ type: 'varchar', length: 64, default: 'Asia/Kolkata' })
  timezone: string;

  @Column({ type: 'boolean', default: true, name: 'is_enabled' })
  isEnabled: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_run_at' })
  lastRunAt?: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'next_run_at' })
  nextRunAt?: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => AutomationDefinitionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'definition_id' })
  definition: AutomationDefinitionEntity;

  @ManyToOne(() => EnvironmentEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'environment_id' })
  environment?: EnvironmentEntity;
}

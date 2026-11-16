import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId?: string;

  @Column({ type: 'varchar', length: 80 })
  action: string;

  @Column({ type: 'varchar', length: 64, name: 'resource_type' })
  resourceType: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'resource_id' })
  resourceId?: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'client_ip' })
  clientIp?: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  details: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  timestamp: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;
}

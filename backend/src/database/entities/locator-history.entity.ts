import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ElementProfileEntity } from './element-profile.entity';

@Entity('locator_history')
export class LocatorHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'element_profile_id' })
  elementProfileId: string;

  @Column({ type: 'varchar', length: 32, name: 'locator_type' })
  locatorType: string;

  @Column({ type: 'varchar', length: 512, name: 'locator_value' })
  locatorValue: string;

  @Column({ type: 'int', default: 0, name: 'success_count' })
  successCount: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'last_verified_at' })
  lastVerifiedAt: Date;

  @ManyToOne(() => ElementProfileEntity, (ep) => ep.locators, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'element_profile_id' })
  elementProfile: ElementProfileEntity;
}

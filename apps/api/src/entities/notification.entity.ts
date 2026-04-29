// apps/api/src/entities/notification.entity.ts
// TypeORM entity for the notifications table.

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { TenantEntity } from './tenant.entity';

@Entity('notifications')
@Index('idx_notifications_user', ['userId', 'read', 'createdAt'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  // NOTE: If adding new enum values, run: ALTER TYPE notification_type ADD VALUE 'ISSUE_DELETED';
  @Column({
    type: 'enum',
    enum: ['ISSUE_ASSIGNED', 'ISSUE_UPDATED', 'COMMENT_ADDED', 'MENTION', 'SPRINT_STARTED', 'SPRINT_COMPLETED', 'ISSUE_DELETED'],
  })
  type!: 'ISSUE_ASSIGNED' | 'ISSUE_UPDATED' | 'COMMENT_ADDED' | 'MENTION' | 'SPRINT_STARTED' | 'SPRINT_COMPLETED' | 'ISSUE_DELETED';

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  read!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;
}

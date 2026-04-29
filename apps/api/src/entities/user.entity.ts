// apps/api/src/entities/user.entity.ts
// TypeORM entity for the users table. password_hash is excluded from SELECT by default.

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';

@Entity('users')
@Index('idx_users_tenant_email', ['tenantId', 'email'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255, default: '' })
  fullName!: string;

  @Column({ type: 'enum', enum: ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER', 'VIEWER'], default: 'DEVELOPER' })
  role!: 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER' | 'VIEWER';

  @Column({ name: 'avatar_url', type: 'varchar', length: 512, nullable: true })
  avatarUrl!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;
}

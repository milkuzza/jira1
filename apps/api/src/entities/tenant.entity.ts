// apps/api/src/entities/tenant.entity.ts
// TypeORM entity for the tenants table — root of multi-tenant hierarchy.

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { ProjectEntity } from './project.entity';

@Entity('tenants')
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 63, unique: true })
  slug!: string;

  @Column({ type: 'enum', enum: ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'], default: 'FREE' })
  plan!: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => UserEntity, (user) => user.tenant)
  users!: UserEntity[];

  @OneToMany(() => ProjectEntity, (project) => project.tenant)
  projects!: ProjectEntity[];
}

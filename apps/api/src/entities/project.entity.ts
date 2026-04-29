// apps/api/src/entities/project.entity.ts
// TypeORM entity for the projects table.

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { BoardColumnEntity } from './board-column.entity';
import { SprintEntity } from './sprint.entity';

@Entity('projects')
@Index('idx_projects_tenant_key', ['tenantId', 'key'], { unique: true })
export class ProjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 10 })
  key!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'board_type', type: 'enum', enum: ['KANBAN', 'SCRUM'], default: 'KANBAN' })
  boardType!: 'KANBAN' | 'SCRUM';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @OneToMany(() => BoardColumnEntity, (col) => col.project)
  boardColumns!: BoardColumnEntity[];

  @OneToMany(() => SprintEntity, (sprint) => sprint.project)
  sprints!: SprintEntity[];
}

// apps/api/src/entities/sprint.entity.ts
// TypeORM entity for the sprints table.

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';

@Entity('sprints')
export class SprintEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  goal!: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: Date | null;

  @Column({ type: 'enum', enum: ['PLANNED', 'ACTIVE', 'COMPLETED'], default: 'PLANNED' })
  status!: 'PLANNED' | 'ACTIVE' | 'COMPLETED';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => ProjectEntity, (project) => project.sprints, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;
}

// apps/api/src/entities/board-column.entity.ts
// TypeORM entity for the board_columns table.

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';

@Entity('board_columns')
export class BoardColumnEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'int', default: 0 })
  order!: number;

  @Column({ type: 'varchar', length: 7, default: '#6B7280' })
  color!: string;

  /** The issue status string that maps to this column (e.g. 'BACKLOG', 'IN_PROGRESS').
   *  Must be unique per project. Allows fully dynamic board columns. */
  @Column({ name: 'status_key', type: 'varchar', length: 100, default: '' })
  statusKey!: string;

  @ManyToOne(() => ProjectEntity, (project) => project.boardColumns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;
}

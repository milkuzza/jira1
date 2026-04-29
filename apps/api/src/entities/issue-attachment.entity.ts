// apps/api/src/entities/issue-attachment.entity.ts
// TypeORM entity for the issue_attachments table.

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IssueEntity } from './issue.entity';
import { UserEntity } from './user.entity';

@Entity('issue_attachments')
export class IssueAttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'issue_id', type: 'uuid' })
  issueId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  filename!: string;

  @Column({ type: 'varchar', length: 512 })
  url!: string;

  @Column({ type: 'bigint', default: 0 })
  size!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => IssueEntity, (issue) => issue.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issue_id' })
  issue!: IssueEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}

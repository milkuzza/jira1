// apps/api/src/entities/issue-changelog.entity.ts
// TypeORM entity for the issue_changelog table — audit trail for field changes.

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IssueEntity } from './issue.entity';
import { UserEntity } from './user.entity';

@Entity('issue_changelog')
@Index('idx_issue_changelog_issue', ['issueId', 'createdAt'])
export class IssueChangelogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'issue_id', type: 'uuid' })
  issueId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 100 })
  field!: string;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue!: string | null;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => IssueEntity, (issue) => issue.changelog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'issue_id' })
  issue!: IssueEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}

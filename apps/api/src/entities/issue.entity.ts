// apps/api/src/entities/issue.entity.ts
// TypeORM entity for the issues table — the core work item entity.

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { ProjectEntity } from './project.entity';
import { SprintEntity } from './sprint.entity';
import { UserEntity } from './user.entity';
import { IssueCommentEntity } from './issue-comment.entity';
import { IssueAttachmentEntity } from './issue-attachment.entity';
import { IssueChangelogEntity } from './issue-changelog.entity';
import { LabelEntity } from './label.entity';

@Entity('issues')
@Index('idx_issues_tenant_project', ['tenantId', 'projectId'])
@Index('idx_issues_assignee', ['assigneeId'])
@Index('idx_issues_sprint', ['sprintId'])
export class IssueEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ name: 'sprint_id', type: 'uuid', nullable: true })
  sprintId!: string | null;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  @Column({ type: 'varchar', length: 500 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'],
    default: 'BACKLOG',
  })
  status!: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

  @Column({
    type: 'enum',
    enum: ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'],
    default: 'MEDIUM',
  })
  priority!: 'LOWEST' | 'LOW' | 'MEDIUM' | 'HIGH' | 'HIGHEST';

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId!: string | null;

  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId!: string;

  @Column({ name: 'story_points', type: 'int', nullable: true })
  storyPoints!: number | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: Date | null;

  @Column({ type: 'double precision', default: 0 })
  order!: number;

  @Column({ name: 'search_vector', type: 'tsvector', select: false, insert: false, update: false })
  searchVector!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  // ─── Relations ───────────────────────────────────

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;

  @ManyToOne(() => SprintEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sprint_id' })
  sprint!: SprintEntity | null;

  @ManyToOne(() => IssueEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent!: IssueEntity | null;

  @OneToMany(() => IssueEntity, (issue) => issue.parent)
  children!: IssueEntity[];

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignee_id' })
  assignee!: UserEntity | null;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reporter_id' })
  reporter!: UserEntity;

  @OneToMany(() => IssueCommentEntity, (comment) => comment.issue)
  comments!: IssueCommentEntity[];

  @OneToMany(() => IssueAttachmentEntity, (attachment) => attachment.issue)
  attachments!: IssueAttachmentEntity[];

  @OneToMany(() => IssueChangelogEntity, (changelog) => changelog.issue)
  changelog!: IssueChangelogEntity[];

  @ManyToMany(() => LabelEntity)
  @JoinTable({
    name: 'issue_labels',
    joinColumn: { name: 'issue_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'label_id', referencedColumnName: 'id' },
  })
  labels!: LabelEntity[];
}

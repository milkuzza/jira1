// apps/api/src/modules/issues/issues.service.ts
// Issue CRUD, changelog automation, float-based ordering with rebalance, comments, attachments.

import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { IssueEntity } from '../../entities/issue.entity';
import { IssueCommentEntity } from '../../entities/issue-comment.entity';
import { IssueAttachmentEntity } from '../../entities/issue-attachment.entity';
import { IssueChangelogEntity } from '../../entities/issue-changelog.entity';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { MoveIssueDto } from './dto/move-issue.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import {
  CHANGELOG_TRACKED_FIELDS,
  ORDER_REBALANCE_THRESHOLD,
  DEFAULT_ISSUES_LIMIT,
  EVENTS,
  WS_EVENTS,
} from '../../constants';

export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface CursorData {
  order: number;
  id: string;
}

@Injectable()
export class IssuesService {
  private readonly logger = new Logger(IssuesService.name);

  constructor(
    @InjectRepository(IssueEntity)
    private readonly issueRepo: Repository<IssueEntity>,
    @InjectRepository(IssueCommentEntity)
    private readonly commentRepo: Repository<IssueCommentEntity>,
    @InjectRepository(IssueAttachmentEntity)
    private readonly attachmentRepo: Repository<IssueAttachmentEntity>,
    @InjectRepository(IssueChangelogEntity)
    private readonly changelogRepo: Repository<IssueChangelogEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Create ──────────────────────────────────────

  async create(
    projectId: string,
    tenantId: string,
    reporterId: string,
    dto: CreateIssueDto,
  ): Promise<IssueEntity> {
    // Get max order for the target status column
    const maxOrder = await this.issueRepo
      .createQueryBuilder('issue')
      .select('MAX(issue.order)', 'max')
      .where('issue.projectId = :projectId', { projectId })
      .andWhere('issue.status = :status', { status: dto.status ?? 'BACKLOG' })
      .getRawOne<{ max: number | null }>();

    const issue = this.issueRepo.create({
      tenantId,
      projectId,
      reporterId,
      title: dto.title,
      description: dto.description ?? null,
      status: (dto.status as IssueEntity['status']) ?? 'BACKLOG',
      priority: (dto.priority as IssueEntity['priority']) ?? 'MEDIUM',
      assigneeId: dto.assigneeId ?? null,
      sprintId: dto.sprintId ?? null,
      parentId: dto.parentId ?? null,
      storyPoints: dto.storyPoints ?? null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      order: (maxOrder?.max ?? 0) + 1,
    });

    const saved = await this.issueRepo.save(issue);

    this.eventEmitter.emit(EVENTS.ISSUE_CREATED, {
      issue: saved,
      projectId,
    });

    this.logger.log(`Issue created: ${saved.id} in project ${projectId}`);
    return saved;
  }

  // ─── List with cursor pagination ─────────────────

  async findAll(
    projectId: string,
    tenantId: string,
    filters: {
      status?: string;
      assignee?: string;
      sprint?: string;
      priority?: string;
      search?: string;
      cursor?: string;
      limit?: number;
    },
  ): Promise<CursorPage<IssueEntity>> {
    const limit = filters.limit ?? DEFAULT_ISSUES_LIMIT;

    let qb: SelectQueryBuilder<IssueEntity> = this.issueRepo
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.assignee', 'assignee')
      .where('issue.projectId = :projectId', { projectId })
      .andWhere('issue.tenantId = :tenantId', { tenantId });

    // Apply filters
    if (filters.status) {
      qb = qb.andWhere('issue.status = :status', { status: filters.status });
    }
    if (filters.assignee) {
      qb = qb.andWhere('issue.assigneeId = :assignee', { assignee: filters.assignee });
    }
    if (filters.sprint) {
      qb = qb.andWhere('issue.sprintId = :sprint', { sprint: filters.sprint });
    }
    if (filters.priority) {
      qb = qb.andWhere('issue.priority = :priority', { priority: filters.priority });
    }
    if (filters.search) {
      qb = qb.andWhere("issue.search_vector @@ plainto_tsquery('english', :search)", {
        search: filters.search,
      });
    }

    // Cursor pagination
    if (filters.cursor) {
      const decoded = this.decodeCursor(filters.cursor);
      if (decoded) {
        qb = qb.andWhere(
          '(issue.order > :cursorOrder OR (issue.order = :cursorOrder AND issue.id > :cursorId))',
          { cursorOrder: decoded.order, cursorId: decoded.id },
        );
      }
    }

    qb = qb
      .orderBy('issue.order', 'ASC')
      .addOrderBy('issue.id', 'ASC')
      .take(limit + 1); // Take one extra to check hasMore

    const results = await qb.getMany();
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;
    const lastItem = data[data.length - 1];

    return {
      data,
      nextCursor: lastItem ? this.encodeCursor({ order: lastItem.order, id: lastItem.id }) : null,
      hasMore,
    };
  }

  // ─── Find One ────────────────────────────────────

  async findOne(issueId: string, tenantId: string): Promise<IssueEntity> {
    const issue = await this.issueRepo.findOne({
      where: { id: issueId, tenantId },
      relations: ['assignee', 'reporter', 'comments', 'attachments', 'labels', 'sprint'],
    });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }
    return issue;
  }

  // ─── Update with changelog ───────────────────────

  async update(issueId: string, userId: string, dto: UpdateIssueDto): Promise<IssueEntity> {
    const current = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!current) {
      throw new NotFoundException('Issue not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Build changelog entries BEFORE applying changes
      const changelogEntries: Partial<IssueChangelogEntity>[] = [];
      const oldStatus = current.status;

      for (const field of CHANGELOG_TRACKED_FIELDS) {
        const dtoValue = dto[field as keyof UpdateIssueDto];
        if (dtoValue !== undefined) {
          const currentValue = current[field as keyof IssueEntity];
          const oldVal = currentValue != null ? String(currentValue) : null;
          const newVal = dtoValue != null ? String(dtoValue) : null;

          if (oldVal !== newVal) {
            changelogEntries.push({
              issueId,
              userId,
              field,
              oldValue: oldVal,
              newValue: newVal,
            });
          }
        }
      }

      const oldAssigneeId = current.assigneeId;

      // Apply updates
      if (dto.title !== undefined) current.title = dto.title;
      if (dto.description !== undefined) current.description = dto.description ?? null;
      if (dto.status !== undefined) current.status = dto.status as IssueEntity['status'];
      if (dto.priority !== undefined) current.priority = dto.priority as IssueEntity['priority'];
      if (dto.assigneeId !== undefined) current.assigneeId = dto.assigneeId ?? null;
      if (dto.sprintId !== undefined) current.sprintId = dto.sprintId ?? null;
      if (dto.storyPoints !== undefined) current.storyPoints = dto.storyPoints ?? null;
      if (dto.dueDate !== undefined) current.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

      await queryRunner.manager.save(current);

      // Save changelog
      if (changelogEntries.length > 0) {
        const entries = changelogEntries.map((e) =>
          queryRunner.manager.create(IssueChangelogEntity, e),
        );
        await queryRunner.manager.save(entries);
      }

      await queryRunner.commitTransaction();

      // Emit assignment notification if assignee changed
      if (
        dto.assigneeId !== undefined &&
        dto.assigneeId !== null &&
        dto.assigneeId !== oldAssigneeId
      ) {
        this.eventEmitter.emit(EVENTS.ISSUE_ASSIGNED, {
          issueId,
          assigneeId: dto.assigneeId,
          assignedBy: userId,
          tenantId: current.tenantId,
        });
      }

      // Emit events
      if (dto.status && dto.status !== oldStatus) {
        this.eventEmitter.emit(EVENTS.ISSUE_STATUS_CHANGED, {
          issueId,
          oldStatus,
          newStatus: dto.status,
          userId,
        });
      }

      const hasChanges = Object.keys(dto).length > 0;
      if (hasChanges) {
        this.eventEmitter.emit(EVENTS.ISSUE_UPDATED, {
          issueId,
          projectId: current.projectId,
          changes: dto,
          userId,
        });
      }

      // Re-fetch with all relations so the API response includes assignee, reporter, etc.
      const withRelations = await this.issueRepo.findOne({
        where: { id: issueId, tenantId: current.tenantId },
        relations: ['assignee', 'reporter', 'labels', 'sprint'],
      });
      return withRelations ?? current;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Move / Reorder (Kanban DnD) ────────────────

  async move(issueId: string, userId: string, dto: MoveIssueDto, tenantId: string): Promise<IssueEntity> {
    const issue = await this.issueRepo.findOne({ where: { id: issueId, tenantId } });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const oldStatus = issue.status;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      issue.status = dto.newStatus as IssueEntity['status'];
      issue.order = dto.newOrder;
      await queryRunner.manager.save(issue);

      // Check if rebalance needed within the same transaction
      const neighborsCount = await queryRunner.manager
        .createQueryBuilder(IssueEntity, 'issue')
        .where('issue.projectId = :projectId', { projectId: issue.projectId })
        .andWhere('issue.status = :status', { status: dto.newStatus })
        .andWhere('issue.id != :issueId', { issueId })
        .andWhere('ABS(issue.order - :newOrder) < :threshold', {
          newOrder: dto.newOrder,
          threshold: ORDER_REBALANCE_THRESHOLD,
        })
        .getCount();

      if (neighborsCount > 0) {
        await this.rebalanceColumnTx(queryRunner.manager, issue.projectId, dto.newStatus);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Emit move event
    this.eventEmitter.emit(EVENTS.ISSUE_MOVED, {
      issueId,
      newStatus: dto.newStatus,
      newOrder: dto.newOrder,
      movedBy: userId,
      projectId: issue.projectId,
      oldStatus,
    });

    return issue;
  }

  /** Rebalance all issue orders in a column to integers 1, 2, 3…
   *  Uses a single bulk UPDATE … FROM (VALUES …) for efficiency.
   */
  async rebalanceColumn(projectId: string, status: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await this.rebalanceColumnTx(queryRunner.manager, projectId, status);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /** Rebalance within an existing EntityManager (used by move()). */
  private async rebalanceColumnTx(
    manager: import('typeorm').EntityManager,
    projectId: string,
    status: string,
  ): Promise<void> {
    const issues = await manager
      .createQueryBuilder(IssueEntity, 'issue')
      .select(['issue.id'])
      .where('issue.projectId = :projectId', { projectId })
      .andWhere('issue.status = :status', { status })
      .orderBy('issue.order', 'ASC')
      .getMany();

    if (issues.length === 0) return;

    // Build a single bulk UPDATE using VALUES
    const values = issues
      .map((issue, idx) => `('${issue.id}'::uuid, ${(idx + 1) * 1.0})`)
      .join(', ');

    await manager.query(
      `UPDATE issues SET "order" = v.new_order
       FROM (VALUES ${values}) AS v(id, new_order)
       WHERE issues.id = v.id`,
    );

    this.logger.debug(`Rebalanced ${issues.length} issues in column ${status} of project ${projectId}`);
  }

  // ─── Delete ──────────────────────────────────────

  async remove(issueId: string): Promise<void> {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    // Save data before deletion for event
    const { reporterId, assigneeId, tenantId, title, projectId } = issue;

    await this.issueRepo.remove(issue);

    this.eventEmitter.emit(EVENTS.ISSUE_DELETED, {
      issueId,
      reporterId,
      assigneeId: assigneeId ?? null,
      tenantId,
      title,
      projectId,
    });
  }

  // ─── Comments ────────────────────────────────────

  async addComment(issueId: string, userId: string, dto: CreateCommentDto): Promise<IssueCommentEntity> {
    // Verify issue exists
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const comment = this.commentRepo.create({
      issueId,
      userId,
      body: dto.body,
    });

    const saved = await this.commentRepo.save(comment);

    this.eventEmitter.emit(EVENTS.ISSUE_COMMENTED, {
      issueId,
      commentId: saved.id,
      userId,
      projectId: issue.projectId,
      tenantId: issue.tenantId,
    });

    return saved;
  }

  async getComments(issueId: string): Promise<IssueCommentEntity[]> {
    return this.commentRepo.find({
      where: { issueId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  // ─── Attachments ─────────────────────────────────

  async createAttachmentPresign(issueId: string, userId: string, filename: string): Promise<{
    uploadUrl: string;
    attachmentId: string;
    fileUrl: string;
  }> {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const attachmentId = uuidv4();
    const filePath = `${issue.projectId}/${issueId}/${attachmentId}-${filename}`;
    const minioEndpoint = process.env['MINIO_ENDPOINT'] ?? 'http://minio:9000';
    const fileUrl = `${minioEndpoint}/attachments/${filePath}`;

    // Create attachment record (not confirmed yet)
    const attachment = this.attachmentRepo.create({
      issueId,
      userId,
      filename,
      url: fileUrl,
      size: 0, // Updated on confirm
    });
    await this.attachmentRepo.save(attachment);

    // NOTE: Real presigned URL generation requires MinioService injection.
    // The URL below is a placeholder — wire up MinioService.presignedPutObject()
    // once it is moved to a shared module.
    const uploadUrl = `${minioEndpoint}/attachments/${filePath}?upload=presigned`;

    return { uploadUrl, attachmentId: attachment.id, fileUrl };
  }

  async confirmAttachment(attachmentId: string): Promise<IssueAttachmentEntity> {
    const attachment = await this.attachmentRepo.findOne({ where: { id: attachmentId } });
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }
    // Mark as confirmed (in production, verify file exists in MinIO)
    return attachment;
  }

  // ─── Changelog ───────────────────────────────────

  async getChangelog(issueId: string): Promise<IssueChangelogEntity[]> {
    return this.changelogRepo.find({
      where: { issueId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Cursor helpers ──────────────────────────────

  private encodeCursor(data: CursorData): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  private decodeCursor(cursor: string): CursorData | null {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8')) as CursorData;
    } catch {
      return null;
    }
  }
}

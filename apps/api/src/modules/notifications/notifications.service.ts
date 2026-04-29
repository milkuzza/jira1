// apps/api/src/modules/notifications/notifications.service.ts
// Notification service: event listeners → INSERT + WS emit + email stub.

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationEntity } from '../../entities/notification.entity';
import { UserEntity } from '../../entities/user.entity';
import { IssueEntity } from '../../entities/issue.entity';
import { IssueCommentEntity } from '../../entities/issue-comment.entity';
import { IssuesGateway } from '../issues/issues.gateway';
import { MailService } from '../mail/mail.service';
import {
  EVENTS,
  WS_PRESENCE,
  NOTIFICATION_TYPES,
  NOTIFICATIONS_PAGE_SIZE,
} from '../../constants';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifRepo: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(IssueEntity)
    private readonly issueRepo: Repository<IssueEntity>,
    @InjectRepository(IssueCommentEntity)
    private readonly commentRepo: Repository<IssueCommentEntity>,
    private readonly gateway: IssuesGateway,
    private readonly mailService: MailService,
  ) {}

  // ─── Event Listeners ─────────────────────────────

  @OnEvent(EVENTS.ISSUE_ASSIGNED)
  async handleIssueAssigned(payload: {
    issueId: string;
    assigneeId: string;
    assignedBy: string;
    tenantId: string;
  }): Promise<void> {
    try {
      if (payload.assigneeId === payload.assignedBy) return; // Don't notify self

      const issue = await this.issueRepo.findOne({
        where: { id: payload.issueId },
        select: ['id', 'title', 'projectId'],
      });
      if (!issue) return;

      await this.createAndEmit(
        payload.assigneeId,
        payload.tenantId,
        NOTIFICATION_TYPES.ISSUE_ASSIGNED,
        {
          issueId: payload.issueId,
          issueTitle: issue.title,
          projectId: issue.projectId,
          assignedBy: payload.assignedBy,
        },
      );
    } catch (err) {
      this.logger.error(`handleIssueAssigned failed: ${String(err)}`);
    }
  }

  @OnEvent(EVENTS.ISSUE_CREATED)
  async handleIssueCreated(payload: {
    issue: {
      id: string;
      title: string;
      status: string;
      priority: string;
      assigneeId?: string | null;
      reporterId: string;
      tenantId: string;
      projectId: string;
    };
    projectId: string;
  }): Promise<void> {
    try {
      const issue = payload.issue;
      if (!issue.assigneeId) return;
      if (issue.assigneeId === issue.reporterId) return;

      await this.createAndEmit(
        issue.assigneeId,
        issue.tenantId,
        NOTIFICATION_TYPES.ISSUE_ASSIGNED,
        {
          issueId: issue.id,
          issueTitle: issue.title,
          projectId: issue.projectId,
          assignedBy: issue.reporterId,
        },
      );
    } catch (err) {
      this.logger.error(`handleIssueCreated failed: ${String(err)}`);
    }
  }

  @OnEvent(EVENTS.ISSUE_COMMENTED)
  async handleIssueCommented(payload: {
    issueId: string;
    commentId: string;
    userId: string;
    projectId: string;
  }): Promise<void> {
    try {
      const issue = await this.issueRepo.findOne({
        where: { id: payload.issueId },
        select: ['id', 'reporterId', 'tenantId', 'title', 'projectId', 'assigneeId'],
      });
      if (!issue) {
        this.logger.warn(`handleIssueCommented: issue ${payload.issueId} not found`);
        return;
      }

      // Collect recipients: reporter + assignee + previous commenters (exclude commenter)
      const recipients = new Set<string>();

      if (issue.reporterId && issue.reporterId !== payload.userId) {
        recipients.add(issue.reporterId);
      }

      // Notify assignee if set and different from commenter
      if (issue.assigneeId && issue.assigneeId !== payload.userId) {
        recipients.add(issue.assigneeId);
      }

      // Notify previous unique commenters (excluding current commenter)
      // We fetch all comments and filter in JS — simpler and avoids raw SQL pitfalls.
      const allComments = await this.commentRepo.find({
        where: { issueId: payload.issueId },
        select: ['userId'],
      });

      for (const c of allComments) {
        if (c.userId && c.userId !== payload.userId) {
          recipients.add(c.userId);
        }
      }

      if (recipients.size === 0) {
        this.logger.debug(`handleIssueCommented: no recipients for issue ${payload.issueId}`);
        return;
      }

      const commenter = await this.userRepo.findOne({
        where: { id: payload.userId },
        select: ['fullName', 'email'],
      });
      const commenterName = commenter?.fullName || commenter?.email || 'Someone';

      for (const recipientId of recipients) {
        await this.createAndEmit(
          recipientId,
          issue.tenantId,
          NOTIFICATION_TYPES.COMMENT_ADDED,
          {
            issueId: payload.issueId,
            issueTitle: issue.title,
            projectId: issue.projectId,
            commentId: payload.commentId,
            commenterName,
          },
        );
      }
    } catch (err) {
      this.logger.error(`handleIssueCommented failed: ${String(err)}`);
    }
  }

  @OnEvent(EVENTS.ISSUE_STATUS_CHANGED)
  async handleStatusChanged(payload: {
    issueId: string;
    oldStatus: string;
    newStatus: string;
    userId: string;
  }): Promise<void> {
    try {
      const issue = await this.issueRepo.findOne({
        where: { id: payload.issueId },
        select: ['id', 'reporterId', 'tenantId', 'title', 'projectId'],
      });
      if (!issue || issue.reporterId === payload.userId) return;

      await this.createAndEmit(
        issue.reporterId,
        issue.tenantId,
        NOTIFICATION_TYPES.ISSUE_UPDATED,
        {
          issueId: payload.issueId,
          issueTitle: issue.title,
          projectId: issue.projectId,
          field: 'status',
          from: payload.oldStatus,
          to: payload.newStatus,
        },
      );
    } catch (err) {
      this.logger.error(`handleStatusChanged failed: ${String(err)}`);
    }
  }

  @OnEvent(EVENTS.ISSUE_UPDATED)
  async handleFieldUpdated(payload: {
    issueId: string;
    projectId: string;
    changes: Record<string, unknown>;
    userId: string;
  }): Promise<void> {
    try {
      const hasPriority = 'priority' in payload.changes && payload.changes.priority != null;
      const hasDueDate = 'dueDate' in payload.changes && payload.changes.dueDate != null;
      if (!hasPriority && !hasDueDate) return;

      const issue = await this.issueRepo.findOne({
        where: { id: payload.issueId },
        select: ['id', 'assigneeId', 'tenantId', 'title', 'projectId'],
      });
      if (!issue || !issue.assigneeId) return;
      if (issue.assigneeId === payload.userId) return;

      const changeField = hasPriority ? 'priority' : 'dueDate';
      const changeTo = hasPriority
        ? String(payload.changes.priority ?? '')
        : String(payload.changes.dueDate ?? '');

      await this.createAndEmit(
        issue.assigneeId,
        issue.tenantId,
        NOTIFICATION_TYPES.ISSUE_UPDATED,
        {
          issueId: issue.id,
          issueTitle: issue.title,
          projectId: issue.projectId,
          field: changeField,
          from: '',
          to: changeTo,
        },
      );
    } catch (err) {
      this.logger.error(`handleFieldUpdated failed: ${String(err)}`);
    }
  }

  @OnEvent(EVENTS.ISSUE_DELETED)
  async handleIssueDeleted(payload: {
    issueId: string;
    reporterId: string;
    assigneeId: string | null;
    tenantId: string;
    title: string;
    projectId: string;
  }): Promise<void> {
    try {
      const recipients = new Set<string>();
      recipients.add(payload.reporterId);
      if (payload.assigneeId && payload.assigneeId !== payload.reporterId) {
        recipients.add(payload.assigneeId);
      }

      for (const recipientId of recipients) {
        await this.createAndEmit(
          recipientId,
          payload.tenantId,
          NOTIFICATION_TYPES.ISSUE_DELETED,
          {
            issueId: payload.issueId,
            issueTitle: payload.title,
            projectId: payload.projectId,
          },
        );
      }
    } catch (err) {
      this.logger.error(`handleIssueDeleted failed: ${String(err)}`);
    }
  }

  @OnEvent(EVENTS.SPRINT_STARTED)
  async handleSprintStarted(payload: {
    sprintId: string;
    sprintName: string;
    projectId: string;
    tenantId: string;
  }): Promise<void> {
    try {
      // Notify all PROJECT_MANAGERs and ADMINs in the tenant
      const managers = await this.userRepo.find({
        where: [
          { tenantId: payload.tenantId, role: 'PROJECT_MANAGER' },
          { tenantId: payload.tenantId, role: 'ADMIN' },
        ],
        select: ['id'],
      });

      for (const mgr of managers) {
        await this.createAndEmit(
          mgr.id,
          payload.tenantId,
          NOTIFICATION_TYPES.SPRINT_STARTED,
          {
            sprintId: payload.sprintId,
            sprintName: payload.sprintName,
            projectId: payload.projectId,
          },
        );
      }
    } catch (err) {
      this.logger.error(`handleSprintStarted failed: ${String(err)}`);
    }
  }

  @OnEvent(EVENTS.SPRINT_COMPLETED)
  async handleSprintCompleted(payload: {
    sprintId: string;
    sprintName: string;
    projectId: string;
    tenantId: string;
  }): Promise<void> {
    try {
      // Notify all PROJECT_MANAGERs and ADMINs in the tenant
      const managers = await this.userRepo.find({
        where: [
          { tenantId: payload.tenantId, role: 'PROJECT_MANAGER' },
          { tenantId: payload.tenantId, role: 'ADMIN' },
        ],
        select: ['id'],
      });

      for (const mgr of managers) {
        await this.createAndEmit(
          mgr.id,
          payload.tenantId,
          NOTIFICATION_TYPES.SPRINT_COMPLETED,
          {
            sprintId: payload.sprintId,
            sprintName: payload.sprintName,
            projectId: payload.projectId,
          },
        );
      }
    } catch (err) {
      this.logger.error(`handleSprintCompleted failed: ${String(err)}`);
    }
  }

  // ─── CRUD ────────────────────────────────────────

  async findAll(userId: string): Promise<NotificationEntity[]> {
    return this.notifRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: NOTIFICATIONS_PAGE_SIZE,
    });
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await this.notifRepo.update({ id: notificationId, userId }, { read: true });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifRepo.update({ userId, read: false }, { read: true });
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notifRepo.count({ where: { userId, read: false } });
    return { count };
  }

  // ─── Helpers ─────────────────────────────────────

  private async createAndEmit(
    userId: string,
    tenantId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const notification = this.notifRepo.create({
      userId,
      tenantId,
      type: type as NotificationEntity['type'],
      payload,
      read: false,
    });
    const saved = await this.notifRepo.save(notification);

    this.gateway.emitToUser(userId, tenantId, WS_PRESENCE.NOTIFICATION_NEW, {
      id: saved.id,
      type: saved.type,
      payload: saved.payload,
      read: false,
      createdAt: saved.createdAt.toISOString(),
    });

    this.logger.debug(`Notification sent to ${userId}: ${type}`);

    this.sendNotificationEmail(userId, type, payload).catch((err: unknown) =>
      this.logger.error(`sendNotificationEmail failed for user ${userId}: ${String(err)}`),
    );
  }

  private async sendNotificationEmail(
    userId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['email', 'fullName'],
    });
    if (!user?.email) return;

    const buildEmail = (
      subject: string,
      content: string,
    ): { subject: string; bodyHtml: string } => ({
      subject,
      bodyHtml: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;color:#111">
          <h2 style="font-size:18px">${subject}</h2>
          <p style="color:#374151">${content}</p>
          <p style="margin-top:24px;font-size:12px;color:#9CA3AF">
            This is an automated notification from ProjectHub.
          </p>
        </div>
      `,
    });

    let email: { subject: string; bodyHtml: string } | null = null;

    switch (type) {
      case NOTIFICATION_TYPES.ISSUE_ASSIGNED: {
        const issueTitle = String(payload['issueTitle'] ?? 'a task');
        email = buildEmail(
          'New task assigned to you',
          `You have been assigned to: <strong>${issueTitle}</strong>.`,
        );
        break;
      }
      case NOTIFICATION_TYPES.COMMENT_ADDED: {
        const issueTitle = String(payload['issueTitle'] ?? 'an issue');
        const commenterName = String(payload['commenterName'] ?? 'Someone');
        email = buildEmail(
          `New comment on ${issueTitle}`,
          `<strong>${commenterName}</strong> left a comment on <strong>${issueTitle}</strong>.`,
        );
        break;
      }
      case NOTIFICATION_TYPES.ISSUE_UPDATED: {
        const issueTitle = String(payload['issueTitle'] ?? 'a task');
        const field = String(payload['field'] ?? 'field');
        const to = String(payload['to'] ?? '');
        email = buildEmail(
          `Task updated: ${issueTitle}`,
          `<strong>${field}</strong> was changed to <strong>${to}</strong> on task <strong>${issueTitle}</strong>.`,
        );
        break;
      }
      case NOTIFICATION_TYPES.SPRINT_STARTED: {
        const sprintName = String(payload['sprintName'] ?? 'a sprint');
        email = buildEmail(
          `Sprint started: ${sprintName}`,
          `Sprint <strong>${sprintName}</strong> has been started.`,
        );
        break;
      }
      case NOTIFICATION_TYPES.SPRINT_COMPLETED: {
        const sprintName = String(payload['sprintName'] ?? 'a sprint');
        email = buildEmail(
          `Sprint completed: ${sprintName}`,
          `Sprint <strong>${sprintName}</strong> has been completed.`,
        );
        break;
      }
      case NOTIFICATION_TYPES.ISSUE_DELETED: {
        const issueTitle = String(payload['issueTitle'] ?? 'a task');
        email = buildEmail(
          `Task deleted: ${issueTitle}`,
          `Task <strong>${issueTitle}</strong> has been deleted.`,
        );
        break;
      }
      default:
        return;
    }

    if (!email) return;

    await this.mailService.sendNotificationEmail({
      to: user.email,
      subject: email.subject,
      bodyHtml: email.bodyHtml,
    });
  }
}

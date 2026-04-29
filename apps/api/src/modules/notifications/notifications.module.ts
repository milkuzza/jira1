// apps/api/src/modules/notifications/notifications.module.ts
// Notifications module: event-driven in-app notifications.

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from '../../entities/notification.entity';
import { UserEntity } from '../../entities/user.entity';
import { IssueEntity } from '../../entities/issue.entity';
import { IssueCommentEntity } from '../../entities/issue-comment.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { IssuesModule } from '../issues/issues.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, UserEntity, IssueEntity, IssueCommentEntity]),
    forwardRef(() => IssuesModule), // For IssuesGateway
    MailModule,
  ],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}

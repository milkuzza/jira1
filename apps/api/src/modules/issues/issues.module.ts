// apps/api/src/modules/issues/issues.module.ts
// Issues module: CRUD, ordering, comments, attachments, changelog, WebSocket gateway.

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueEntity } from '../../entities/issue.entity';
import { IssueCommentEntity } from '../../entities/issue-comment.entity';
import { IssueAttachmentEntity } from '../../entities/issue-attachment.entity';
import { IssueChangelogEntity } from '../../entities/issue-changelog.entity';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';
import { IssuesGateway } from './issues.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IssueEntity,
      IssueCommentEntity,
      IssueAttachmentEntity,
      IssueChangelogEntity,
    ]),
    AuthModule, // For JwtService in gateway
  ],
  providers: [IssuesService, IssuesGateway],
  controllers: [IssuesController],
  exports: [IssuesService, IssuesGateway],
})
export class IssuesModule {}

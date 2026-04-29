// apps/api/src/modules/issues/issues.controller.ts
// Issue REST endpoints: CRUD, move, comments, attachments, changelog.

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IssuesService, CursorPage } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { MoveIssueDto } from './dto/move-issue.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser, JwtUser } from '../../decorators/current-user.decorator';
import { IssueEntity } from '../../entities/issue.entity';
import { IssueCommentEntity } from '../../entities/issue-comment.entity';
import { IssueAttachmentEntity } from '../../entities/issue-attachment.entity';
import { IssueChangelogEntity } from '../../entities/issue-changelog.entity';
import { Roles } from '../../decorators/roles.decorator';
import { PlanGuard, PLAN_RESOURCE_KEY } from '../../billing/plan.guard';

@ApiTags('Issues')
@ApiBearerAuth()
@Controller()
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  // ─── CRUD ────────────────────────────────────────

  @Post('projects/:projectId/issues')
  @UseGuards(PlanGuard)
  @SetMetadata(PLAN_RESOURCE_KEY, 'issues')
  @ApiOperation({ summary: 'Create an issue in a project' })
  async create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateIssueDto,
  ): Promise<IssueEntity> {
    return this.issuesService.create(projectId, user.tenantId, user.sub, dto);
  }

  @Get('projects/:projectId/issues')
  @ApiOperation({ summary: 'List issues with filters and cursor pagination' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignee', required: false })
  @ApiQuery({ name: 'sprint', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: JwtUser,
    @Query('status') status?: string,
    @Query('assignee') assignee?: string,
    @Query('sprint') sprint?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<CursorPage<IssueEntity>> {
    return this.issuesService.findAll(projectId, user.tenantId, {
      status,
      assignee,
      sprint,
      priority,
      search,
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('issues/:id')
  @ApiOperation({ summary: 'Get issue details with relations' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ): Promise<IssueEntity> {
    return this.issuesService.findOne(id, user.tenantId);
  }

  @Patch('issues/:id')
  @ApiOperation({ summary: 'Update issue (with automatic changelog)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateIssueDto,
  ): Promise<IssueEntity> {
    return this.issuesService.update(id, user.sub, dto);
  }

  @Patch('issues/:id/order')
  @ApiOperation({ summary: 'Move issue (Kanban drag-and-drop)' })
  async move(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: MoveIssueDto,
  ): Promise<IssueEntity> {
    return this.issuesService.move(id, user.sub, dto, user.tenantId);
  }

  @Delete('issues/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete an issue (ADMIN or reporter)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.issuesService.remove(id);
  }

  // ─── Comments ────────────────────────────────────

  @Post('issues/:id/comments')
  @ApiOperation({ summary: 'Add a comment to an issue' })
  async addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateCommentDto,
  ): Promise<IssueCommentEntity> {
    return this.issuesService.addComment(id, user.sub, dto);
  }

  @Get('issues/:id/comments')
  @ApiOperation({ summary: 'Get comments for an issue' })
  async getComments(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IssueCommentEntity[]> {
    return this.issuesService.getComments(id);
  }

  // ─── Attachments ─────────────────────────────────

  @Post('issues/:id/attachments')
  @ApiOperation({ summary: 'Generate presigned URL for attachment upload' })
  async createAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body('filename') filename: string,
  ): Promise<{ uploadUrl: string; attachmentId: string; fileUrl: string }> {
    return this.issuesService.createAttachmentPresign(id, user.sub, filename);
  }

  @Patch('issues/:id/attachments/:attachmentId/confirm')
  @ApiOperation({ summary: 'Confirm attachment upload' })
  async confirmAttachment(
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<IssueAttachmentEntity> {
    return this.issuesService.confirmAttachment(attachmentId);
  }

  // ─── Changelog ───────────────────────────────────

  @Get('issues/:id/changelog')
  @ApiOperation({ summary: 'Get issue changelog' })
  async getChangelog(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<IssueChangelogEntity[]> {
    return this.issuesService.getChangelog(id);
  }
}

// packages/shared-types/src/schemas/board.schema.ts
// Zod schemas for Projects, Issues, Board, Sprints DTOs.

import { z } from 'zod';
import {
  IssueStatusSchema,
  IssuePrioritySchema,
  BoardTypeSchema,
  SprintStatusSchema,
  UserRoleSchema,
} from '../enums.js';

// ─── Projects ────────────────────────────────────

export const CreateProjectDtoSchema = z.object({
  name: z.string().min(1).max(255),
  key: z.string().min(1).max(10).regex(/^[A-Z][A-Z0-9]*$/),
  description: z.string().nullable().optional(),
  boardType: BoardTypeSchema.optional(),
});
export type CreateProjectDto = z.infer<typeof CreateProjectDtoSchema>;

export const UpdateProjectDtoSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
});
export type UpdateProjectDto = z.infer<typeof UpdateProjectDtoSchema>;

export const AddMemberDtoSchema = z.object({
  userId: z.string().uuid(),
  role: UserRoleSchema,
});
export type AddMemberDto = z.infer<typeof AddMemberDtoSchema>;

export const CreateColumnDtoSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});
export type CreateColumnDto = z.infer<typeof CreateColumnDtoSchema>;

// ─── Sprints ─────────────────────────────────────

export const CreateSprintDtoSchema = z.object({
  name: z.string().min(1).max(255),
  goal: z.string().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
});
export type CreateSprintDto = z.infer<typeof CreateSprintDtoSchema>;

// ─── Issues ──────────────────────────────────────

export const CreateIssueDtoSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  status: IssueStatusSchema.optional(),
  priority: IssuePrioritySchema.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  sprintId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  storyPoints: z.number().int().min(0).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});
export type CreateIssueDto = z.infer<typeof CreateIssueDtoSchema>;

export const UpdateIssueDtoSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  status: IssueStatusSchema.optional(),
  priority: IssuePrioritySchema.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  sprintId: z.string().uuid().nullable().optional(),
  storyPoints: z.number().int().min(0).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});
export type UpdateIssueDto = z.infer<typeof UpdateIssueDtoSchema>;

export const MoveIssueDtoSchema = z.object({
  newOrder: z.number(),
  newStatus: IssueStatusSchema,
  columnId: z.string().uuid(),
});
export type MoveIssueDto = z.infer<typeof MoveIssueDtoSchema>;

export const CreateCommentDtoSchema = z.object({
  body: z.string().min(1),
});
export type CreateCommentDto = z.infer<typeof CreateCommentDtoSchema>;

// ─── Board Response DTOs ─────────────────────────

export const IssueCardDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: IssueStatusSchema,
  priority: IssuePrioritySchema,
  assignee: z
    .object({
      id: z.string().uuid(),
      fullName: z.string(),
      avatarUrl: z.string().nullable(),
    })
    .nullable(),
  storyPoints: z.number().nullable(),
  labelsCount: z.number().int(),
  commentsCount: z.number().int(),
  order: z.number(),
});
export type IssueCardDto = z.infer<typeof IssueCardDtoSchema>;

export const BoardColumnWithIssuesDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string(),
  order: z.number().int(),
  issues: z.array(IssueCardDtoSchema),
});
export type BoardColumnWithIssuesDto = z.infer<typeof BoardColumnWithIssuesDtoSchema>;

export const BoardResponseDtoSchema = z.object({
  columns: z.array(BoardColumnWithIssuesDtoSchema),
});
export type BoardResponseDto = z.infer<typeof BoardResponseDtoSchema>;

// ─── Cursor Pagination ───────────────────────────

export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type CursorPagination = z.infer<typeof CursorPaginationSchema>;

export const CursorPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  });

export type CursorPaginatedResponse<T> = {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

// ─── WebSocket Events ────────────────────────────

export const WsIssueMoved = z.object({
  issueId: z.string().uuid(),
  newStatus: IssueStatusSchema,
  newOrder: z.number(),
  movedBy: z.string().uuid(),
});
export type WsIssueMovedPayload = z.infer<typeof WsIssueMoved>;

export const WsIssueCreated = z.object({
  issue: IssueCardDtoSchema,
});
export type WsIssueCreatedPayload = z.infer<typeof WsIssueCreated>;

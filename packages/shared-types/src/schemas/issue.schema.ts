// packages/shared-types/src/schemas/issue.schema.ts
// Zod schema and TypeScript type for the Issue entity.

import { z } from 'zod';
import { IssueStatusSchema, IssuePrioritySchema } from '../enums.js';

export const IssueSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  projectId: z.string().uuid(),
  sprintId: z.string().uuid().nullable(),
  parentId: z.string().uuid().nullable(),
  title: z.string().min(1).max(500),
  description: z.string().nullable(),
  status: IssueStatusSchema,
  priority: IssuePrioritySchema,
  assigneeId: z.string().uuid().nullable(),
  reporterId: z.string().uuid(),
  storyPoints: z.number().int().min(0).nullable(),
  dueDate: z.coerce.date().nullable(),
  order: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Issue = z.infer<typeof IssueSchema>;

export const CreateIssueSchema = IssueSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  order: true,
});
export type CreateIssue = z.infer<typeof CreateIssueSchema>;

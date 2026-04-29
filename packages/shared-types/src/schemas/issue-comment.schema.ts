// packages/shared-types/src/schemas/issue-comment.schema.ts
// Zod schema and TypeScript type for the IssueComment entity.

import { z } from 'zod';

export const IssueCommentSchema = z.object({
  id: z.string().uuid(),
  issueId: z.string().uuid(),
  userId: z.string().uuid(),
  body: z.string().min(1),
  createdAt: z.coerce.date(),
});

export type IssueComment = z.infer<typeof IssueCommentSchema>;

export const CreateIssueCommentSchema = IssueCommentSchema.omit({ id: true, createdAt: true });
export type CreateIssueComment = z.infer<typeof CreateIssueCommentSchema>;

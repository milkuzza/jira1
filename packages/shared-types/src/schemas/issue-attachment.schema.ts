// packages/shared-types/src/schemas/issue-attachment.schema.ts
// Zod schema and TypeScript type for the IssueAttachment entity.

import { z } from 'zod';

export const IssueAttachmentSchema = z.object({
  id: z.string().uuid(),
  issueId: z.string().uuid(),
  userId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  url: z.string().url().max(512),
  size: z.number().int().min(0),
  createdAt: z.coerce.date(),
});

export type IssueAttachment = z.infer<typeof IssueAttachmentSchema>;

export const CreateIssueAttachmentSchema = IssueAttachmentSchema.omit({
  id: true,
  createdAt: true,
});
export type CreateIssueAttachment = z.infer<typeof CreateIssueAttachmentSchema>;

// packages/shared-types/src/schemas/issue-changelog.schema.ts
// Zod schema and TypeScript type for the IssueChangelog entity.

import { z } from 'zod';

export const IssueChangelogSchema = z.object({
  id: z.string().uuid(),
  issueId: z.string().uuid(),
  userId: z.string().uuid(),
  field: z.string().min(1).max(100),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type IssueChangelog = z.infer<typeof IssueChangelogSchema>;

export const CreateIssueChangelogSchema = IssueChangelogSchema.omit({
  id: true,
  createdAt: true,
});
export type CreateIssueChangelog = z.infer<typeof CreateIssueChangelogSchema>;

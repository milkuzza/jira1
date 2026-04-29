// packages/shared-types/src/schemas/sprint.schema.ts
// Zod schema and TypeScript type for the Sprint entity.

import { z } from 'zod';
import { SprintStatusSchema } from '../enums.js';

export const SprintSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1).max(255),
  goal: z.string().nullable(),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable(),
  status: SprintStatusSchema,
  createdAt: z.coerce.date(),
});

export type Sprint = z.infer<typeof SprintSchema>;

export const CreateSprintSchema = SprintSchema.omit({ id: true, createdAt: true });
export type CreateSprint = z.infer<typeof CreateSprintSchema>;

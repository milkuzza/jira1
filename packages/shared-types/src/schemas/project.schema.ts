// packages/shared-types/src/schemas/project.schema.ts
// Zod schema and TypeScript type for the Project entity.

import { z } from 'zod';
import { BoardTypeSchema } from '../enums.js';

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  key: z.string().min(1).max(10).regex(/^[A-Z][A-Z0-9]*$/),
  description: z.string().nullable(),
  boardType: BoardTypeSchema,
  createdAt: z.coerce.date(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = ProjectSchema.omit({ id: true, createdAt: true });
export type CreateProject = z.infer<typeof CreateProjectSchema>;

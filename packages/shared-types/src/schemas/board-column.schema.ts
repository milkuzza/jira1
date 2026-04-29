// packages/shared-types/src/schemas/board-column.schema.ts
// Zod schema and TypeScript type for the BoardColumn entity.

import { z } from 'zod';

export const BoardColumnSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  order: z.number().int().min(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export type BoardColumn = z.infer<typeof BoardColumnSchema>;

export const CreateBoardColumnSchema = BoardColumnSchema.omit({ id: true });
export type CreateBoardColumn = z.infer<typeof CreateBoardColumnSchema>;

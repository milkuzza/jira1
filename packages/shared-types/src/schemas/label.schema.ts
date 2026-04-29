// packages/shared-types/src/schemas/label.schema.ts
// Zod schema and TypeScript type for the Label entity.

import { z } from 'zod';

export const LabelSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export type Label = z.infer<typeof LabelSchema>;

export const CreateLabelSchema = LabelSchema.omit({ id: true });
export type CreateLabel = z.infer<typeof CreateLabelSchema>;

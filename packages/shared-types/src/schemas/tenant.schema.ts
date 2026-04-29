// packages/shared-types/src/schemas/tenant.schema.ts
// Zod schema and TypeScript type for the Tenant entity.

import { z } from 'zod';
import { PlanTypeSchema } from '../enums.js';

export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(63).regex(/^[a-z0-9-]+$/),
  plan: PlanTypeSchema,
  createdAt: z.coerce.date(),
});

export type Tenant = z.infer<typeof TenantSchema>;

export const CreateTenantSchema = TenantSchema.omit({ id: true, createdAt: true });
export type CreateTenant = z.infer<typeof CreateTenantSchema>;

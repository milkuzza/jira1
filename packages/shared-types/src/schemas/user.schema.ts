// packages/shared-types/src/schemas/user.schema.ts
// Zod schema and TypeScript type for the User entity.
// NOTE: password_hash is intentionally excluded — never exposed via API.

import { z } from 'zod';
import { UserRoleSchema } from '../enums.js';

export const UserSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email().max(255),
  fullName: z.string().max(255),
  role: UserRoleSchema,
  avatarUrl: z.string().url().max(512).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateUser = z.infer<typeof CreateUserSchema>;

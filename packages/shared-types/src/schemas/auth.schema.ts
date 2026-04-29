// packages/shared-types/src/schemas/auth.schema.ts
// Zod schemas for authentication, registration, and user management DTOs.

import { z } from 'zod';
import { UserRoleSchema, PlanTypeSchema } from '../enums.js';

// ─── Auth ────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});
export type Login = z.infer<typeof LoginSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshToken = z.infer<typeof RefreshTokenSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const JwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema,
  tokenVersion: z.number().int().optional(),
  tokenId: z.string().uuid().optional(),
});
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    fullName: z.string(),
    role: UserRoleSchema,
    avatarUrl: z.string().nullable(),
  }),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// ─── Tenant Registration ─────────────────────────

export const RegisterTenantSchema = z.object({
  orgName: z.string().min(1).max(255),
  slug: z.string().min(2).max(63).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  adminEmail: z.string().email().max(255),
  adminPassword: z.string().min(8).max(128),
});
export type RegisterTenant = z.infer<typeof RegisterTenantSchema>;

export const UpdateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  plan: PlanTypeSchema.optional(),
});
export type UpdateTenant = z.infer<typeof UpdateTenantSchema>;

// ─── Users ───────────────────────────────────────

export const UpdateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
  currentPassword: z.string().min(8).max(128).optional(),
  newPassword: z.string().min(8).max(128).optional(),
  avatarUrl: z.string().url().max(512).nullable().optional(),
});
export type UpdateUser = z.infer<typeof UpdateUserSchema>;

export const InviteUserSchema = z.object({
  email: z.string().email().max(255),
  role: UserRoleSchema,
});
export type InviteUser = z.infer<typeof InviteUserSchema>;

export const AvatarPresignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  avatarUrl: z.string().url(),
});
export type AvatarPresignResponse = z.infer<typeof AvatarPresignResponseSchema>;

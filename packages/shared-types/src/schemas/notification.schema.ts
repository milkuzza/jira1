// packages/shared-types/src/schemas/notification.schema.ts
// Zod schemas for notifications, search results, and unread counts.

import { z } from 'zod';
import { NotificationTypeSchema } from '../enums.js';

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: NotificationTypeSchema,
  payload: z.record(z.unknown()),
  read: z.boolean(),
  createdAt: z.coerce.date(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const CreateNotificationSchema = NotificationSchema.omit({
  id: true,
  read: true,
  createdAt: true,
});
export type CreateNotification = z.infer<typeof CreateNotificationSchema>;

// ─── API Response DTOs ───────────────────────────

export const NotificationDtoSchema = z.object({
  id: z.string().uuid(),
  type: NotificationTypeSchema,
  payload: z.record(z.unknown()),
  read: z.boolean(),
  createdAt: z.string(),
});
export type NotificationDto = z.infer<typeof NotificationDtoSchema>;

export const UnreadCountResponseSchema = z.object({
  count: z.number().int().min(0),
});
export type UnreadCountResponse = z.infer<typeof UnreadCountResponseSchema>;

// ─── Search ──────────────────────────────────────

export const SearchIssueDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  headline: z.string(),
  priority: z.string(),
  status: z.string(),
  projectId: z.string().uuid(),
  rank: z.number(),
});
export type SearchIssueDto = z.infer<typeof SearchIssueDtoSchema>;

export const SearchProjectDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  key: z.string(),
});
export type SearchProjectDto = z.infer<typeof SearchProjectDtoSchema>;

export const SearchResultsSchema = z.object({
  issues: z.array(SearchIssueDtoSchema),
  projects: z.array(SearchProjectDtoSchema),
});
export type SearchResults = z.infer<typeof SearchResultsSchema>;


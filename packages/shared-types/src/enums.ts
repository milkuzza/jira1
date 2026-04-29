// packages/shared-types/src/enums.ts
// All domain enums as Zod schemas with corresponding TypeScript types.

import { z } from 'zod';

// ─── Plan Types ──────────────────────────────────
export const PlanTypeSchema = z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']);
export type PlanType = z.infer<typeof PlanTypeSchema>;

// ─── User Roles ──────────────────────────────────
export const UserRoleSchema = z.enum(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER', 'VIEWER']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// ─── Board Types ─────────────────────────────────
export const BoardTypeSchema = z.enum(['KANBAN', 'SCRUM']);
export type BoardType = z.infer<typeof BoardTypeSchema>;

// ─── Sprint Status ───────────────────────────────
export const SprintStatusSchema = z.enum(['PLANNED', 'ACTIVE', 'COMPLETED']);
export type SprintStatus = z.infer<typeof SprintStatusSchema>;

// ─── Issue Status ────────────────────────────────
export const IssueStatusSchema = z.enum([
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
  'CANCELLED',
]);
export type IssueStatus = z.infer<typeof IssueStatusSchema>;

// ─── Issue Priority ──────────────────────────────
export const IssuePrioritySchema = z.enum(['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST']);
export type IssuePriority = z.infer<typeof IssuePrioritySchema>;

// ─── Notification Type ───────────────────────────
export const NotificationTypeSchema = z.enum([
  'ISSUE_ASSIGNED',
  'ISSUE_UPDATED',
  'COMMENT_ADDED',
  'MENTION',
  'SPRINT_STARTED',
  'SPRINT_COMPLETED',
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

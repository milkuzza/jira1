// apps/api/src/constants/index.ts
// Application-wide constants — no magic strings.

/** Redis key prefix for cached tenant lookups */
export const TENANT_CACHE_PREFIX = 'tenant:slug:';

/** Tenant cache TTL in seconds (5 minutes) */
export const TENANT_CACHE_TTL = 300;

/** Default board columns for new projects */
export const DEFAULT_BOARD_COLUMNS = [
  { name: 'Backlog',      order: 0, color: '#6B7280', statusKey: 'BACKLOG'      },
  { name: 'In Progress',  order: 1, color: '#3B82F6', statusKey: 'IN_PROGRESS'  },
  { name: 'Review',       order: 2, color: '#F59E0B', statusKey: 'IN_REVIEW'    },
  { name: 'Done',         order: 3, color: '#10B981', statusKey: 'DONE'         },
] as const;

/** PostgreSQL SET LOCAL command for tenant isolation */
export const SET_TENANT_QUERY = "SELECT set_config('app.tenant_id', $1, true)";

/** Application domain for subdomain extraction */
export const APP_DOMAIN_DEFAULT = 'app.localhost';

/** Health check query */
export const HEALTH_CHECK_QUERY = 'SELECT 1';

/** Swagger document configuration */
export const SWAGGER_CONFIG = {
  TITLE: 'TaskHub API',
  DESCRIPTION: 'API documentation for the TaskHub SaaS task management system',
  VERSION: '0.1.0',
  PATH: 'api/docs',
} as const;

/** Bcrypt salt rounds */
export const BCRYPT_SALT_ROUNDS = 12;

/** Request property name for tenant */
export const REQUEST_TENANT_KEY = 'tenant';

// ─── Auth & JWT ──────────────────────────────────

/** Access token TTL (15 minutes) */
export const ACCESS_TOKEN_TTL = '15m';

/** Refresh token TTL in seconds (30 days) */
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Redis key prefix for refresh tokens: refresh:{userId}:{tokenId} */
export const REFRESH_KEY_PREFIX = 'refresh';

/** Metadata key for @Public() decorator */
export const IS_PUBLIC_KEY = 'isPublic';

/** Metadata key for @Roles() decorator */
export const ROLES_KEY = 'roles';

/** Metadata key for @CheckPolicy() decorator */
export const POLICY_KEY = 'policy';

/** Redis injection token */
export const REDIS_CLIENT = 'REDIS_CLIENT';

// ─── RBAC Actions ────────────────────────────────

export enum Action {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
  Manage = 'manage',
}

export enum Resource {
  Tenant = 'tenant',
  User = 'user',
  Project = 'project',
  Issue = 'issue',
  Sprint = 'sprint',
  Comment = 'comment',
}

/** Role → allowed actions mapping */
export const ROLE_PERMISSIONS: Record<string, Record<string, Action[]>> = {
  ADMIN: {
    [Resource.Tenant]: [Action.Manage],
    [Resource.User]: [Action.Manage],
    [Resource.Project]: [Action.Manage],
    [Resource.Issue]: [Action.Manage],
    [Resource.Sprint]: [Action.Manage],
    [Resource.Comment]: [Action.Manage],
  },
  PROJECT_MANAGER: {
    [Resource.Project]: [Action.Create, Action.Read, Action.Update, Action.Delete],
    [Resource.Issue]: [Action.Create, Action.Read, Action.Update, Action.Delete],
    [Resource.Sprint]: [Action.Create, Action.Read, Action.Update, Action.Delete],
    [Resource.Comment]: [Action.Create, Action.Read, Action.Update, Action.Delete],
    [Resource.User]: [Action.Read],
  },
  DEVELOPER: {
    [Resource.Project]: [Action.Read],
    [Resource.Issue]: [Action.Create, Action.Read, Action.Update],
    [Resource.Sprint]: [Action.Read],
    [Resource.Comment]: [Action.Create, Action.Read, Action.Update],
    [Resource.User]: [Action.Read],
  },
  VIEWER: {
    [Resource.Project]: [Action.Read],
    [Resource.Issue]: [Action.Read],
    [Resource.Sprint]: [Action.Read],
    [Resource.Comment]: [Action.Read],
    [Resource.User]: [Action.Read],
  },
} as const;

// ─── MinIO / Avatars ─────────────────────────────

/** MinIO bucket for avatars */
export const AVATAR_BUCKET = 'avatars';

/** Max avatar file size in bytes (2 MB) */
export const AVATAR_MAX_SIZE = 2 * 1024 * 1024;

/** Presigned URL TTL in seconds */
export const PRESIGN_TTL = 60;

// ─── Public Routes ───────────────────────────────

/** Routes that skip tenant middleware */
export const PUBLIC_ROUTES = [
  '/tenants/register',
  '/health',
] as const;

// ─── Issues / Kanban ─────────────────────────────

/** Minimum gap between order values before rebalancing */
export const ORDER_REBALANCE_THRESHOLD = 0.001;

/** Fields tracked in issue_changelog on update */
export const CHANGELOG_TRACKED_FIELDS = [
  'title',
  'description',
  'status',
  'priority',
  'assigneeId',
  'sprintId',
  'storyPoints',
  'dueDate',
] as const;

/** Default issues page size for cursor pagination */
export const DEFAULT_ISSUES_LIMIT = 50;

/** MinIO bucket for attachments */
export const ATTACHMENT_BUCKET = 'attachments';

// ─── WebSocket Events ────────────────────────────

export const WS_EVENTS = {
  ISSUE_MOVED: 'issue:moved',
  ISSUE_CREATED: 'issue:created',
  ISSUE_UPDATED: 'issue:updated',
  ISSUE_COMMENTED: 'issue:commented',
  COLUMN_CREATED: 'column:created',
  COLUMN_UPDATED: 'column:updated',
  COLUMN_DELETED: 'column:deleted',
  JOIN_PROJECT: 'join:project',
} as const;

// ─── EventEmitter Events ─────────────────────────

export const EVENTS = {
  ISSUE_CREATED: 'issue.created',
  ISSUE_STATUS_CHANGED: 'issue.status_changed',
  ISSUE_UPDATED: 'issue.updated',
  ISSUE_MOVED: 'issue.moved',
  ISSUE_COMMENTED: 'issue.commented',
  ISSUE_ASSIGNED: 'issue.assigned',
  ISSUE_DELETED: 'issue.deleted',
  SPRINT_STARTED: 'sprint.started',
  SPRINT_COMPLETED: 'sprint.completed',
  COLUMN_CREATED: 'column.created',
  COLUMN_UPDATED: 'column.updated',
  COLUMN_DELETED: 'column.deleted',
} as const;

// ─── WebSocket Presence ──────────────────────────

export const WS_PRESENCE = {
  USER_VIEWING: 'user:viewing',
  USER_LEFT: 'user:left',
  ISSUE_DELETED: 'issue:deleted',
  NOTIFICATION_NEW: 'notification:new',
} as const;

// ─── Notifications ───────────────────────────────

export const NOTIFICATION_TYPES = {
  ISSUE_ASSIGNED: 'ISSUE_ASSIGNED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  ISSUE_UPDATED: 'ISSUE_UPDATED',
  SPRINT_STARTED: 'SPRINT_STARTED',
  SPRINT_COMPLETED: 'SPRINT_COMPLETED',
  ISSUE_DELETED: 'ISSUE_DELETED',
} as const;

export const NOTIFICATIONS_PAGE_SIZE = 20;

// ─── SaaS Plan Limits ────────────────────────────

export const PLAN_LIMITS: Record<string, Record<string, number>> = {
  FREE:       { projects: 3,        users: 5,        issues: 100      },
  BASIC:      { projects: 10,       users: 20,       issues: 1000     },
  PRO:        { projects: 20,       users: 50,       issues: Infinity },
  ENTERPRISE: { projects: Infinity, users: Infinity, issues: Infinity },
} as const;

/** Redis cache TTL for plan limit counts (60s) */
export const PLAN_LIMIT_CACHE_TTL = 60;

/** Redis key prefix for plan limit counts */
export const PLAN_LIMIT_PREFIX = 'plan:count';

// ─── Search ──────────────────────────────────────

/** Max search results */
export const SEARCH_LIMIT_ISSUES = 10;
export const SEARCH_LIMIT_PROJECTS = 5;

/** Redis key prefix for recent views */
export const RECENT_VIEWS_PREFIX = 'user:recent';
export const RECENT_VIEWS_MAX = 10;

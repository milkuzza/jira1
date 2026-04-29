// apps/web/src/lib/constants.ts
// Application-wide constants: status/priority enums, labels, colors.

export const ISSUE_STATUS = {
  BACKLOG:     'BACKLOG',
  TODO:        'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW:   'IN_REVIEW',
  DONE:        'DONE',
  CANCELLED:   'CANCELLED',
} as const;

export type IssueStatus = typeof ISSUE_STATUS[keyof typeof ISSUE_STATUS];

export const STATUS_LABELS: Record<IssueStatus, string> = {
  BACKLOG:     'Backlog',
  TODO:        'Todo',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW:   'In Review',
  DONE:        'Done',
  CANCELLED:   'Cancelled',
};

export const STATUS_COLORS: Record<IssueStatus, string> = {
  BACKLOG:     'var(--status-backlog)',
  TODO:        'var(--status-todo)',
  IN_PROGRESS: 'var(--status-in-progress)',
  IN_REVIEW:   'var(--status-in-review)',
  DONE:        'var(--status-done)',
  CANCELLED:   'var(--status-cancelled)',
};

export const ISSUE_PRIORITY = {
  HIGHEST: 'HIGHEST',
  HIGH:    'HIGH',
  MEDIUM:  'MEDIUM',
  LOW:     'LOW',
  LOWEST:  'LOWEST',
} as const;

export type IssuePriority = typeof ISSUE_PRIORITY[keyof typeof ISSUE_PRIORITY];

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  HIGHEST: 'Highest',
  HIGH:    'High',
  MEDIUM:  'Medium',
  LOW:     'Low',
  LOWEST:  'Lowest',
};

export const PRIORITY_COLORS: Record<IssuePriority, string> = {
  HIGHEST: 'var(--priority-urgent)',
  HIGH:    'var(--priority-high)',
  MEDIUM:  'var(--priority-medium)',
  LOW:     'var(--priority-low)',
  LOWEST:  'var(--priority-none)',
};

export const ROLES = {
  ADMIN:           'ADMIN',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  DEVELOPER:       'DEVELOPER',
  VIEWER:          'VIEWER',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN:           'Admin',
  PROJECT_MANAGER: 'Project Manager',
  DEVELOPER:       'Developer',
  VIEWER:          'Viewer',
};

export const PLAN_LABELS = {
  FREE:       'Free',
  BASIC:      'Basic',
  PRO:        'Pro',
  ENTERPRISE: 'Enterprise',
} as const;

export const BOARD_TYPE = {
  KANBAN: 'KANBAN',
  SCRUM:  'SCRUM',
} as const;

export const RECENT_ISSUES_KEY = 'tm:recent-issues';
export const MAX_RECENT_ISSUES = 5;

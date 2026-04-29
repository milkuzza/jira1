// apps/web/src/components/ui/Badge.tsx
// Status and priority badges, plus generic variant badges.

import React from 'react';
import { STATUS_COLORS, PRIORITY_COLORS, type IssueStatus, type IssuePriority } from '../../lib/constants';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const VARIANT_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  default: { background: 'var(--color-surface-2)', color: 'var(--color-text)' },
  success: { background: 'var(--color-success-subtle)', color: 'var(--color-success)' },
  warning: { background: '#fef9ec', color: '#b45309' },
  danger:  { background: 'var(--color-danger-subtle)', color: 'var(--color-danger)' },
  info:    { background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' },
  muted:   { background: 'transparent', color: 'var(--color-muted)', border: '1px solid var(--color-border)' },
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: string; // color of leading dot
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', dot, style }) => (
  <span
    role="status"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 'var(--font-size-xs)',
      fontWeight: 500,
      padding: '2px 7px',
      borderRadius: 'var(--radius-full)',
      lineHeight: 1.5,
      ...VARIANT_STYLES[variant],
      ...style,
    }}
  >
    {dot && (
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: dot,
          flexShrink: 0,
        }}
      />
    )}
    {children}
  </span>
);

// Convenience: status badge
export const StatusBadge: React.FC<{ status: IssueStatus }> = ({ status }) => {
  const color = STATUS_COLORS[status] ?? 'var(--color-muted)';
  const labels: Record<IssueStatus, string> = {
    BACKLOG: 'Backlog', TODO: 'Todo', IN_PROGRESS: 'In Progress',
    IN_REVIEW: 'In Review', DONE: 'Done', CANCELLED: 'Cancelled',
  };
  return <Badge dot={color}>{labels[status] ?? status}</Badge>;
};

// Convenience: priority badge
export const PriorityBadge: React.FC<{ priority: IssuePriority }> = ({ priority }) => {
  const color = PRIORITY_COLORS[priority] ?? 'var(--priority-none)';
  const labels: Record<IssuePriority, string> = {
    HIGHEST: 'Highest', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low', LOWEST: 'Lowest',
  };
  return <Badge dot={color}>{labels[priority] ?? priority}</Badge>;
};

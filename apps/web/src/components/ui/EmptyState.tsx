// apps/web/src/components/ui/EmptyState.tsx
// Empty state placeholder with icon, title, description, and optional action.

import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      gap: 12,
      textAlign: 'center',
    }}
    role="status"
    aria-label={title}
  >
    {icon && (
      <span style={{ color: 'var(--color-muted)', marginBottom: 4 }}>{icon}</span>
    )}
    <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, color: 'var(--color-text)' }}>
      {title}
    </h3>
    {description && (
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', maxWidth: 320 }}>
        {description}
      </p>
    )}
    {action && <div style={{ marginTop: 8 }}>{action}</div>}
  </div>
);

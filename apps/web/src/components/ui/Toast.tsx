// apps/web/src/components/ui/Toast.tsx
// Toast notification stack — fixed bottom-right, stacked, auto-dismiss.

import React from 'react';
import type { Toast as ToastItem } from '../../hooks/useToast';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={15} />,
  error:   <XCircle    size={15} />,
  warning: <AlertTriangle size={15} />,
  info:    <Info       size={15} />,
};

const COLORS = {
  success: { bg: 'var(--color-success-subtle)', icon: 'var(--color-success)' },
  error:   { bg: 'var(--color-danger-subtle)',  icon: 'var(--color-danger)' },
  warning: { bg: '#fef9ec',                     icon: '#b45309' },
  info:    { bg: 'var(--color-accent-subtle)',  icon: 'var(--color-accent)' },
};

interface ToastListProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export const ToastList: React.FC<ToastListProps> = ({ toasts, onRemove }) => (
  <div
    aria-live="polite"
    aria-label="Notifications"
    style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
    }}
  >
    {toasts.map((t) => (
      <div
        key={t.id}
        role="alert"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          background: COLORS[t.type].bg,
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-md)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text)',
          animation: 'slideInRight 150ms both',
          maxWidth: 360,
          pointerEvents: 'auto',
        }}
      >
        <span style={{ color: COLORS[t.type].icon, flexShrink: 0 }}>{ICONS[t.type]}</span>
        <span style={{ flex: 1 }}>{t.message}</span>
        <button
          onClick={() => onRemove(t.id)}
          aria-label="Dismiss notification"
          style={{ color: 'var(--color-muted)', cursor: 'pointer', flexShrink: 0 }}
        >
          <X size={13} />
        </button>
      </div>
    ))}
  </div>
);

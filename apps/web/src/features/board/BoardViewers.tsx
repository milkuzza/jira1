// apps/web/src/features/board/BoardViewers.tsx
// Shows avatar stack of users currently viewing the board.
// Clicking opens a small popover listing all viewer names.

import React, { useState, useRef, useEffect } from 'react';
import { Avatar } from '../../components/ui/Avatar';
import type { UserPresence } from '../../hooks/useProjectSocket';

interface BoardViewersProps {
  viewers: UserPresence[];
}

const MAX_SHOW = 4;

export const BoardViewers: React.FC<BoardViewersProps> = ({ viewers }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (viewers.length === 0) return null;

  const visible = viewers.slice(0, MAX_SHOW);
  const overflow = viewers.length - MAX_SHOW;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Avatar stack — click to toggle popover */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`${viewers.length} users viewing — click to see who`}
        title={viewers.map((v) => v.fullName).join(', ')}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {visible.map((v, i) => (
          <span
            key={v.userId}
            style={{
              marginLeft: i === 0 ? 0 : -6,
              border: '2px solid var(--color-bg)',
              borderRadius: '50%',
              display: 'inline-flex',
              zIndex: visible.length - i,
            }}
          >
            <Avatar name={v.fullName} src={v.avatarUrl ?? undefined} size="xs" />
          </span>
        ))}
        {overflow > 0 && (
          <span
            style={{
              marginLeft: -6,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'var(--color-surface-2)',
              border: '2px solid var(--color-bg)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 600,
              color: 'var(--color-muted)',
              zIndex: 0,
            }}
          >
            +{overflow}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            boxShadow: 'var(--shadow-md)',
            padding: '8px 0',
            minWidth: 180,
            zIndex: 100,
          }}
          role="listbox"
          aria-label="Current viewers"
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--color-muted)',
              padding: '0 12px 6px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Viewing now
          </p>
          {viewers.map((v) => (
            <div
              key={v.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 12px',
              }}
              role="option"
            >
              <Avatar name={v.fullName} src={v.avatarUrl ?? undefined} size="xs" />
              <span style={{ fontSize: 12, color: 'var(--color-text)' }}>{v.fullName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

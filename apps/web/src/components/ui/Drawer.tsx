// apps/web/src/components/ui/Drawer.tsx
// Slide-in drawer from the right with sm/md/lg widths.

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Drawer.module.css';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ open, onClose, title, size = 'md', children }) => {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal aria-label={title}>
      <div
        className={[styles.panel, styles[size]].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          <button className={styles.close} onClick={onClose} aria-label="Close drawer">✕</button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
};

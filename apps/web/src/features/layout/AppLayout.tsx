// apps/web/src/features/layout/AppLayout.tsx
// Main app shell: fixed Sidebar + scrollable main area with Header.

import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '../search/CommandPalette';
import { ToastList } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import styles from './AppLayout.module.css';
import { errorBus } from '../../lib/errorBus';

// Toast context
export const ToastContext = React.createContext<ReturnType<typeof useToast>['toast']>({
  success: () => undefined,
  error:   () => undefined,
  info:    () => undefined,
  warning: () => undefined,
});

const AppLayout: React.FC = () => {
  const { toasts, removeToast, toast } = useToast();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    errorBus.register((msg) => toast.error(msg));
    return () => errorBus.unregister();
  }, [toast]);

  return (
    <ToastContext.Provider value={toast}>
      <div className={styles.shell}>
        <Sidebar />
        <div className={styles.main}>
          <Header onOpenSearch={() => setPaletteOpen(true)} />
          <main className={styles.content}>
            <Outlet />
          </main>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ToastList toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export { AppLayout };

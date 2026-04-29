// apps/web/src/hooks/useToast.ts
// Minimal toast system — fixed bottom-right, 4s auto-dismiss, stacking.

import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface UseToastReturn {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
    warning: (msg: string) => void;
  };
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast],
  );

  return {
    toasts,
    addToast,
    removeToast,
    toast: {
      success: (msg) => addToast(msg, 'success'),
      error:   (msg) => addToast(msg, 'error'),
      info:    (msg) => addToast(msg, 'info'),
      warning: (msg) => addToast(msg, 'warning'),
    },
  };
}

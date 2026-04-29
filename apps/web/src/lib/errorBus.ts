// apps/web/src/lib/errorBus.ts
// Tiny event emitter for broadcasting API errors to the UI layer.

type ErrorHandler = (message: string) => void;

let handler: ErrorHandler | null = null;

export const errorBus = {
  /** Register the single global handler (called once from AppLayout). */
  register: (h: ErrorHandler) => { handler = h; },
  /** Unregister. */
  unregister: () => { handler = null; },
  /** Emit an error message. Silently ignored if no handler is registered. */
  emit: (message: string) => { handler?.(message); },
};

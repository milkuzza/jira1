// apps/web/src/hooks/useKeyboardShortcut.ts
// Listens for keyboard shortcuts globally.

import { useEffect, useCallback } from 'react';

type ModifierKey = 'Meta' | 'Control' | 'Alt' | 'Shift';

function parseShortcut(shortcut: string): { modifiers: ModifierKey[]; key: string } {
  const parts = shortcut.split('+');
  const key = parts[parts.length - 1].toLowerCase();
  const modifiers = parts.slice(0, -1) as ModifierKey[];
  return { modifiers, key };
}

export function useKeyboardShortcut(
  shortcuts: string[],
  callback: (e: KeyboardEvent) => void,
  options: { preventDefault?: boolean } = { preventDefault: true },
): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const { modifiers, key } = parseShortcut(shortcut);

        const modsMatch = modifiers.every((mod) => {
          if (mod === 'Meta') return e.metaKey;
          if (mod === 'Control') return e.ctrlKey;
          if (mod === 'Alt') return e.altKey;
          if (mod === 'Shift') return e.shiftKey;
          return false;
        });

        if (modsMatch && e.key.toLowerCase() === key) {
          if (options.preventDefault) e.preventDefault();
          callback(e);
          break;
        }
      }
    },
    [shortcuts, callback, options.preventDefault],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

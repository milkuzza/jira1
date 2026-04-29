// apps/web/src/features/search/CommandPalette.tsx
// Global search palette: Cmd+K, debounced /search, keyboard navigation, recent issues.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../../api/search.api';
import { useDebounce } from '../../hooks/useDebounce';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { Spinner } from '../../components/ui/Spinner';
import { PRIORITY_COLORS, RECENT_ISSUES_KEY, MAX_RECENT_ISSUES } from '../../lib/constants';
import { Search, FileText, FolderOpen, Clock } from 'lucide-react';
import { createPortal } from 'react-dom';
import styles from './CommandPalette.module.css';

interface RecentIssue { id: string; title: string; projectId: string; }

function getRecentIssues(): RecentIssue[] {
  try { return JSON.parse(localStorage.getItem(RECENT_ISSUES_KEY) ?? '[]'); }
  catch { return []; }
}

function saveRecentIssue(issue: RecentIssue): void {
  const prev = getRecentIssues().filter((i) => i.id !== issue.id);
  const next = [issue, ...prev].slice(0, MAX_RECENT_ISSUES);
  localStorage.setItem(RECENT_ISSUES_KEY, JSON.stringify(next));
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQ = useDebounce(query, 300);

  // Also open on Cmd+K (header handles it too, this is a safety net)
  useKeyboardShortcut(['Meta+k', 'Control+k'], () => { if (!open) return; });

  useEffect(() => {
    if (open) { setQuery(''); setFocused(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const { data: results, isFetching } = useQuery({
    queryKey: ['search', debouncedQ],
    queryFn: () => searchApi.search(debouncedQ),
    enabled: debouncedQ.length > 0,
    staleTime: 30_000,
  });

  const recent = getRecentIssues();

  type Item =
    | { kind: 'issue'; id: string; title: string; projectId: string; priority?: string }
    | { kind: 'project'; id: string; name: string; key: string };

  const items: Item[] = debouncedQ.length === 0
    ? recent.map((r) => ({ kind: 'issue' as const, id: r.id, title: r.title, projectId: r.projectId }))
    : [
        ...(results?.issues.map((i) => ({ kind: 'issue' as const, id: i.id, title: i.title, projectId: i.projectId, priority: i.priority })) ?? []),
        ...(results?.projects.map((p) => ({ kind: 'project' as const, id: p.id, name: p.name, key: p.key })) ?? []),
      ];

  const navigate2Item = useCallback((item: Item) => {
    if (item.kind === 'issue') {
      saveRecentIssue({ id: item.id, title: item.title, projectId: item.projectId });
      navigate(`/projects/${item.projectId}/board`);
    } else {
      navigate(`/projects/${item.id}/board`);
    }
    onClose();
  }, [navigate, onClose]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused((f) => Math.min(f + 1, items.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused((f) => Math.max(f - 1, 0)); }
    if (e.key === 'Enter' && items[focused]) navigate2Item(items[focused]);
    if (e.key === 'Escape') onClose();
  };

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal aria-label="Search">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Input */}
        <div className={styles.inputRow}>
          <Search size={16} className={styles.searchIcon} aria-hidden />
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setFocused(0); }}
            onKeyDown={handleKey}
            placeholder="Search issues, projects…"
            aria-label="Search"
            autoComplete="off"
          />
          {isFetching && <Spinner size="sm" />}
        </div>

        {/* Results */}
        <div className={styles.results} role="listbox" aria-label="Search results">
          {items.length === 0 && debouncedQ.length > 0 && !isFetching && (
            <p className={styles.empty}>No results for "{debouncedQ}"</p>
          )}

          {items.length === 0 && debouncedQ.length === 0 && (
            <p className={styles.hint}>
              <Clock size={12} /> Recent
            </p>
          )}

          {debouncedQ.length > 0 && results?.issues && results.issues.length > 0 && (
            <p className={styles.sectionLabel}>Issues</p>
          )}
          {debouncedQ.length > 0 && results?.projects && results.projects.length > 0 && (() => {
            const issueCount = results.issues.length;
            return null; // section label rendered below
          })()}

          {items.map((item, i) => (
            <button
              key={`${item.kind}-${item.id}`}
              role="option"
              aria-selected={i === focused}
              className={[styles.item, i === focused ? styles.itemActive : ''].join(' ')}
              onClick={() => navigate2Item(item)}
              onMouseEnter={() => setFocused(i)}
            >
              {item.kind === 'issue' ? (
                <>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: PRIORITY_COLORS[(item as { priority?: string }).priority as keyof typeof PRIORITY_COLORS] ?? 'var(--priority-none)',
                      flexShrink: 0,
                    }}
                    aria-hidden
                  />
                  <FileText size={13} className={styles.itemIcon} aria-hidden />
                  <span className={styles.itemTitle}>{item.title}</span>
                </>
              ) : (
                <>
                  <FolderOpen size={13} className={styles.itemIcon} aria-hidden />
                  <span className={styles.itemTitle}>{item.name}</span>
                  <span className={styles.itemMeta}>{item.key}</span>
                </>
              )}
            </button>
          ))}
        </div>

        <div className={styles.footer}>
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↩</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>,
    document.body,
  );
};

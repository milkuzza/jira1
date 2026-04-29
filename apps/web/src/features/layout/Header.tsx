// apps/web/src/features/layout/Header.tsx
// Fixed top header: breadcrumbs, locale switcher, search button, notification bell.

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects.api';
import { NotificationBell } from '../notifications/NotificationBell';
import { Button } from '../../components/ui/Button';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { Search, ChevronRight, Globe } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { useLocaleStore } from '../../stores/locale.store';
import styles from './Header.module.css';

interface HeaderProps {
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch }) => {
  const { projectId } = useParams<{ projectId?: string }>();
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
    staleTime: 60_000,
  });

  const project = projectId ? projects?.find((p) => p.id === projectId) : undefined;

  // Keyboard shortcut Cmd/Ctrl + K
  useKeyboardShortcut(['Meta+k', 'Control+k'], onOpenSearch);

  const toggleLocale = () => setLocale(locale === 'ru' ? 'en' : 'ru');

  return (
    <header className={styles.header}>
      {/* Breadcrumbs */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link to="/projects" className={styles.crumb}>{t.header.projects}</Link>
        {project && (
          <>
            <ChevronRight size={12} className={styles.sep} aria-hidden />
            <Link to={`/projects/${project.id}/board`} className={styles.crumb}>{project.name}</Link>
          </>
        )}
      </nav>

      {/* Actions */}
      <div className={styles.actions}>
        <Button
          variant="ghost"
          size="sm"
          icon={<Search size={13} />}
          onClick={onOpenSearch}
          aria-label={t.header.searchShortcut}
          style={{ color: 'var(--color-muted)', fontSize: 12 }}
        >
          <span className={styles.shortcutHint}>
            <kbd>⌘K</kbd>
          </span>
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Locale switcher */}
        <button
          className={styles.localeBtn}
          onClick={toggleLocale}
          aria-label={locale === 'ru' ? 'Switch to English' : 'Переключить на русский'}
          title={locale === 'ru' ? 'Switch to English' : 'Переключить на русский'}
        >
          <Globe size={13} />
          <span>{locale === 'ru' ? 'EN' : 'RU'}</span>
        </button>

        <NotificationBell />
      </div>
    </header>
  );
};

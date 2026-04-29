// apps/web/src/features/notifications/NotificationBell.tsx
// Header bell icon with unread badge, dropdown list, mark-read, WS listener.

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, type NotificationDto } from '../../api/notifications.api';
import { useSocket } from '../../hooks/useSocket';
import { Bell } from 'lucide-react';
import { fmtDistance } from '../../lib/locale';
import { useNavigate } from 'react-router-dom';
import { useT, type Translations } from '../../lib/i18n';
import styles from './NotificationBell.module.css';

function notificationText(nt: Translations['notifications'], n: NotificationDto): string {
  const p = n.payload as Record<string, string>;
  switch (n.type) {
    case 'ISSUE_ASSIGNED':   return nt.assigned(p.issueTitle ?? '');
    case 'COMMENT_ADDED':    return nt.commented(p.commenterName ?? '', p.issueTitle ?? '');
    case 'ISSUE_UPDATED':    return nt.updated(p.issueTitle ?? '', p.field ?? p.change ?? '', p.to ?? '');
    case 'SPRINT_STARTED':   return nt.sprintStarted(p.sprintName ?? '');
    case 'SPRINT_COMPLETED': return nt.sprintCompleted(p.sprintName ?? '');
    case 'ISSUE_DELETED':    return nt.issueDeleted(p.issueTitle ?? '');
    default:                 return n.type;
  }
}

export const NotificationBell: React.FC = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: count = 0 } = useQuery({
    queryKey: ['notifications/count'],
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 30_000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    enabled: open,
    staleTime: 10_000,
  });

  // WebSocket: new notification arrives → bump count + refresh list
  useEffect(() => {
    if (!socket) return;
    const onNew = () => {
      queryClient.setQueryData<number>(['notifications/count'], (c) => (c ?? 0) + 1);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };
    socket.on('notification:new', onNew);
    return () => { socket.off('notification:new', onNew); };
  }, [socket, queryClient]);

  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications/count'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.setQueryData(['notifications/count'], 0);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        className={styles.btn}
        onClick={() => setOpen((o) => !o)}
        aria-label={`${t.notifications.title}${count > 0 ? `, ${count}` : ''}`}
        aria-expanded={open}
      >
        <Bell size={16} />
        {count > 0 && (
          <span className={styles.badge} aria-hidden>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown} role="dialog" aria-label={t.notifications.title}>
          <div className={styles.dropHead}>
            <span className={styles.dropTitle}>{t.notifications.title}</span>
            {count > 0 && (
              <button className={styles.markAll} onClick={() => markAllRead.mutate()}>
                {t.notifications.markAllRead}
              </button>
            )}
          </div>

          <div className={styles.list}>
            {notifications.length === 0 && (
              <p className={styles.empty}>{t.notifications.none}</p>
            )}
            {notifications.map((n: NotificationDto) => (
              <button
                key={n.id}
                className={[styles.notif, !n.read ? styles.unread : ''].join(' ')}
                onClick={() => {
                  if (!n.read) markRead.mutate(n.id);
                  const p = n.payload as Record<string, string>;
                  if (p.projectId && p.issueId) {
                    navigate(`/projects/${p.projectId}/board?issue=${p.issueId}`);
                    setOpen(false);
                  }
                }}
              >
                <span className={[styles.dot, !n.read ? styles.dotVisible : ''].join(' ')} aria-hidden />
                <div className={styles.notifBody}>
                  <p className={styles.notifText}>{notificationText(t.notifications, n)}</p>
                  <p className={styles.notifTime}>{fmtDistance(n.createdAt)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

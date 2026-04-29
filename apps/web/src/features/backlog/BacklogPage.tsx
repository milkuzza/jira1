// apps/web/src/features/backlog/BacklogPage.tsx
// Flat list of all project issues sortable by various fields.

import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { issuesApi } from '../../api/issues.api';
import { Avatar } from '../../components/ui/Avatar';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { PRIORITY_COLORS, STATUS_COLORS } from '../../lib/constants';
import { useT } from '../../lib/i18n';
import { List } from 'lucide-react';
import styles from './BacklogPage.module.css';

const BacklogPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useT();

  const { data, isLoading } = useQuery({
    queryKey: ['backlog', projectId],
    queryFn: () => issuesApi.list(projectId!, { limit: 100 }),
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const issues = data?.data ?? [];

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t.backlog.title}</h1>
        <span className={styles.count}>{t.backlog.issues(issues.length)}</span>
      </div>

      {issues.length === 0 ? (
        <EmptyState icon={<List size={36} />} title={t.backlog.noIssues} description={t.backlog.noIssuesDesc} />
      ) : (
        <div className={styles.list} role="list">
          {issues.map((issue) => (
            <div key={issue.id} className={styles.row} role="listitem">
              {/* Priority dot */}
              <span
                style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: PRIORITY_COLORS[issue.priority as keyof typeof PRIORITY_COLORS] ?? 'var(--priority-none)',
                }}
                aria-label={`Priority: ${issue.priority}`}
              />

              {/* Title */}
              <span className={styles.issueTitle}>{issue.title}</span>

              {/* Status */}
              <span
                className={styles.statusBadge}
                style={{ color: STATUS_COLORS[issue.status as keyof typeof STATUS_COLORS] }}
              >
                {issue.status.replace('_', ' ')}
              </span>

              {/* Story points */}
              {issue.storyPoints != null && (
                <span className={styles.points}>{issue.storyPoints}</span>
              )}

              {/* Assignee */}
              {issue.assignee ? (
                <Avatar name={(issue.assignee as { fullName: string }).fullName} src={(issue.assignee as { avatarUrl: string | null }).avatarUrl} size="xs" />
              ) : (
                <span className={styles.unassigned}>—</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BacklogPage;

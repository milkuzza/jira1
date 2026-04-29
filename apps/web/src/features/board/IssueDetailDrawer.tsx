// apps/web/src/features/board/IssueDetailDrawer.tsx
// Full-featured slide-in drawer for issue detail: editable fields, comments, changelog, attachments.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { issuesApi, type CommentDto, type ChangelogDto } from '../../api/issues.api';
import { usersApi } from '../../api/users.api';
import { Drawer } from '../../components/ui/Drawer';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import {
  ISSUE_STATUS, STATUS_LABELS, STATUS_COLORS,
  ISSUE_PRIORITY, PRIORITY_LABELS, PRIORITY_COLORS,
} from '../../lib/constants';
import { fmtDistance } from '../../lib/locale';
import { useT } from '../../lib/i18n';
import { Paperclip, MessageSquare, History, X } from 'lucide-react';
import styles from './IssueDetailDrawer.module.css';

interface IssueDetailDrawerProps {
  issueId: string | null;
  projectId: string;
  onClose: () => void;
}

export const IssueDetailDrawer: React.FC<IssueDetailDrawerProps> = ({ issueId, projectId, onClose }) => {
  const t = useT();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'comments' | 'changelog'>('comments');
  const [commentBody, setCommentBody] = useState('');
  const descRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', issueId],
    queryFn: () => issuesApi.getById(issueId!),
    enabled: !!issueId,
    staleTime: 0, // always refetch when drawer opens or query is invalidated
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    staleTime: 120_000,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['comments', issueId],
    queryFn: () => issuesApi.getComments(issueId!),
    enabled: !!issueId && tab === 'comments',
  });

  const { data: changelog = [] } = useQuery({
    queryKey: ['changelog', issueId],
    queryFn: () => issuesApi.getChangelog(issueId!),
    enabled: !!issueId && tab === 'changelog',
  });

  // Sync description DOM value when issue updates (but only if not focused)
  useEffect(() => {
    if (descRef.current && document.activeElement !== descRef.current) {
      descRef.current.value = issue?.description ?? '';
    }
  }, [issue?.description]);

  // Sync title DOM value when issue updates (but only if not focused)
  useEffect(() => {
    if (titleRef.current && document.activeElement !== titleRef.current) {
      titleRef.current.textContent = issue?.title ?? '';
    }
  }, [issue?.title]);

  const updateMutation = useMutation({
    mutationFn: (dto: Parameters<typeof issuesApi.update>[1]) =>
      issuesApi.update(issueId!, dto),
    onSuccess: () => {
      // Invalidate (not setQueryData) so we refetch with full relations.
      // The update endpoint returns IssueEntity without loaded relations,
      // so setQueryData would overwrite assignee/reporter/etc. with undefined.
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: () => issuesApi.addComment(issueId!, commentBody.trim()),
    onSuccess: () => { setCommentBody(''); void refetchComments(); },
  });

  const handleField = useCallback(
    <K extends keyof Parameters<typeof issuesApi.update>[1]>(
      key: K,
      value: Parameters<typeof issuesApi.update>[1][K],
    ) => {
      updateMutation.mutate({ [key]: value } as Parameters<typeof issuesApi.update>[1]);
    },
    [updateMutation],
  );

  const boardColumns = queryClient.getQueryData<import('../../api/projects.api').BoardColumnDto[]>(['board', projectId]) ?? [];
  const statusOptions = boardColumns.map((col) => ({ value: col.status, label: col.name }));
  if (!statusOptions.some((o) => o.value === 'CANCELLED')) {
    statusOptions.push({ value: 'CANCELLED', label: STATUS_LABELS['CANCELLED'] ?? 'Cancelled' });
  }
  if (issue && !statusOptions.some((o) => o.value === issue.status)) {
    statusOptions.push({ value: issue.status, label: STATUS_LABELS[issue.status as keyof typeof STATUS_LABELS] ?? issue.status });
  }

  if (!issueId) return null;

  return (
    <Drawer open={!!issueId} onClose={onClose} size="md">
      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner size="lg" />
        </div>
      )}

      {issue && !isLoading && (
        <div className={styles.container}>
          {/* Top status / priority row */}
          <div className={styles.topRow}>
            <select
              className={styles.statusSelect}
              value={issue.status}
              onChange={(e) => handleField('status', e.target.value)}
              aria-label="Issue status"
              style={{ borderColor: STATUS_COLORS[issue.status as keyof typeof STATUS_COLORS] ?? 'var(--color-border)' }}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              className={styles.prioritySelect}
              value={issue.priority}
              onChange={(e) => handleField('priority', e.target.value)}
              aria-label="Issue priority"
            >
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>

            <span className={styles.spacer} />
            <button onClick={onClose} className={styles.closeBtn} aria-label={t.issue.close}>
              <X size={16} />
            </button>
          </div>

          {/* Title — inline editable */}
          <div
            ref={titleRef}
            className={styles.title}
            contentEditable
            suppressContentEditableWarning
            aria-label="Issue title"
            onBlur={(e) => {
              const v = e.currentTarget.textContent?.trim() ?? '';
              if (v && v !== issue.title) handleField('title', v);
            }}
          >
            {issue.title}
          </div>

          {/* Description */}
          <textarea
            ref={descRef}
            className={styles.description}
            defaultValue={issue.description ?? ''}
            placeholder={t.issue.descriptionPlaceholder}
            aria-label="Issue description"
            onBlur={(e) => {
              const v = e.target.value;
              if (v !== (issue.description ?? '')) handleField('description', v);
            }}
          />

          {/* Sidebar-style metadata */}
          <div className={styles.meta}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>{t.issue.assignee}</span>
              <select
                className={styles.metaSelect}
                value={issue.assignee?.id ?? ''}
                onChange={(e) => handleField('assigneeId', e.target.value || null)}
                aria-label="Assignee"
              >
                <option value="">{t.issue.unassigned}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </select>
            </div>

            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>{t.issue.storyPoints}</span>
              <input
                type="number"
                min={0}
                max={100}
                className={styles.metaInput}
                defaultValue={issue.storyPoints ?? ''}
                placeholder="—"
                aria-label="Story points"
                onBlur={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  if (v !== issue.storyPoints) handleField('storyPoints', v);
                }}
              />
            </div>

            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>{t.issue.dueDate}</span>
              <input
                type="date"
                className={styles.metaInput}
                defaultValue={issue.dueDate?.slice(0, 10) ?? ''}
                aria-label="Due date"
                onBlur={(e) => {
                  const v = e.target.value || null;
                  if (v !== issue.dueDate?.slice(0, 10)) handleField('dueDate', v);
                }}
              />
            </div>

            {issue.reporter && (
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>{t.issue.reporter}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar name={issue.reporter.fullName} src={issue.reporter.avatarUrl} size="xs" />
                  <span style={{ fontSize: 12 }}>{issue.reporter.fullName}</span>
                </div>
              </div>
            )}

            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>{t.issue.created}</span>
              <span className={styles.metaValue}>{fmtDistance(issue.createdAt)}</span>
            </div>

            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>{t.issue.updated}</span>
              <span className={styles.metaValue}>{fmtDistance(issue.updatedAt)}</span>
            </div>
          </div>

          {/* Activity tabs */}
          <div className={styles.tabs}>
            <button
              className={[styles.tab, tab === 'comments' ? styles.tabActive : ''].join(' ')}
              onClick={() => setTab('comments')}
            >
              <MessageSquare size={13} /> {t.issue.commentsTab} ({comments.length})
            </button>
            <button
              className={[styles.tab, tab === 'changelog' ? styles.tabActive : ''].join(' ')}
              onClick={() => setTab('changelog')}
            >
              <History size={13} /> {t.issue.changelogTab}
            </button>
          </div>

          {tab === 'comments' && (
            <div className={styles.activity}>
              {comments.map((c: CommentDto) => (
                <div key={c.id} className={styles.comment}>
                  <Avatar name={c.user.fullName} src={c.user.avatarUrl} size="sm" />
                  <div className={styles.commentBody}>
                    <div className={styles.commentHeader}>
                      <strong>{c.user.fullName}</strong>
                      <span className={styles.commentTime}>
                        {fmtDistance(c.createdAt)}
                      </span>
                    </div>
                    <p className={styles.commentText}>{c.body}</p>
                  </div>
                </div>
              ))}

              <div className={styles.addComment}>
                <textarea
                  className={styles.commentInput}
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder={t.issue.addCommentPlaceholder}
                  rows={3}
                  aria-label="Add comment"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && commentBody.trim()) {
                      e.preventDefault();
                      addCommentMutation.mutate();
                    }
                  }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  loading={addCommentMutation.isPending}
                  disabled={!commentBody.trim()}
                  onClick={() => addCommentMutation.mutate()}
                >
                  {t.issue.comment}
                </Button>
              </div>
            </div>
          )}

          {tab === 'changelog' && (
            <div className={styles.activity}>
              {changelog.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--color-muted)', padding: '12px 0' }}>
                  {t.issue.noChangelog}
                </p>
              )}
              {changelog.map((c: ChangelogDto) => (
                <div key={c.id} className={styles.change}>
                  <Avatar name={c.user.fullName} size="xs" />
                  <span className={styles.changeText}>
                    <strong>{c.user.fullName}</strong> {t.issue.changelogChanged} <em>{c.field}</em>
                    {c.oldValue && <> {t.issue.changelogFrom} <Badge>{c.oldValue}</Badge></>}
                    {c.newValue && <> {t.issue.changelogTo} <Badge variant="info">{c.newValue}</Badge></>}
                  </span>
                  <span className={styles.commentTime}>
                    {fmtDistance(c.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};

// apps/web/src/features/kanban/IssueDetailDrawer.tsx
// Slide-in drawer for issue details — inline editing, comments, attachments.
// State: local edit state (title, description, comment body), query/mutation state from hooks.

import React, { useState, useCallback } from 'react';
import { useIssue, useUpdateIssue, useAddComment } from '../../api/hooks';

interface Props {
  issueId: string;
  onClose: () => void;
}

const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'];
const PRIORITIES = ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'];

export const IssueDetailDrawer: React.FC<Props> = ({ issueId, onClose }) => {
  const { data: issue, isLoading } = useIssue(issueId);
  const updateMutation = useUpdateIssue();
  const commentMutation = useAddComment(issueId);
  const [commentBody, setCommentBody] = useState('');

  const handleFieldChange = useCallback(
    (field: string, value: string | number | null) => {
      updateMutation.mutate({
        issueId,
        data: { [field]: value },
      });
    },
    [issueId, updateMutation],
  );

  const handleTitleBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const newTitle = e.currentTarget.textContent?.trim();
      if (newTitle && newTitle !== issue?.title) {
        handleFieldChange('title', newTitle);
      }
    },
    [issue?.title, handleFieldChange],
  );

  const handleDescriptionBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      const newDesc = e.target.value;
      if (newDesc !== (issue?.description ?? '')) {
        handleFieldChange('description', newDesc || null);
      }
    },
    [issue?.description, handleFieldChange],
  );

  const handleAddComment = useCallback(() => {
    if (!commentBody.trim()) return;
    commentMutation.mutate(
      { body: commentBody },
      { onSuccess: () => setCommentBody('') },
    );
  }, [commentBody, commentMutation]);

  if (isLoading || !issue) {
    return (
      <>
        <div className="drawer-backdrop" onClick={onClose} />
        <div className="drawer">
          <button className="drawer-close" onClick={onClose}>×</button>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <button className="drawer-close" onClick={onClose}>×</button>

        {/* Title — inline editable */}
        <div
          className="drawer-title"
          contentEditable
          suppressContentEditableWarning
          onBlur={handleTitleBlur}
        >
          {issue.title}
        </div>

        {/* Fields */}
        <div className="drawer-section">
          <div className="drawer-section-title">Details</div>

          <div className="drawer-field">
            <span className="drawer-field-label">Status</span>
            <select
              className="drawer-select"
              value={issue.status}
              onChange={(e) => handleFieldChange('status', e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div className="drawer-field">
            <span className="drawer-field-label">Priority</span>
            <select
              className="drawer-select"
              value={issue.priority}
              onChange={(e) => handleFieldChange('priority', e.target.value)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="drawer-field">
            <span className="drawer-field-label">Assignee</span>
            <span className="drawer-field-value">
              {issue.assignee?.fullName ?? 'Unassigned'}
            </span>
          </div>

          <div className="drawer-field">
            <span className="drawer-field-label">Reporter</span>
            <span className="drawer-field-value">{issue.reporter?.fullName ?? '—'}</span>
          </div>

          <div className="drawer-field">
            <span className="drawer-field-label">Sprint</span>
            <span className="drawer-field-value">{issue.sprint?.name ?? 'None'}</span>
          </div>

          <div className="drawer-field">
            <span className="drawer-field-label">Story Points</span>
            <span className="drawer-field-value">{issue.storyPoints ?? '—'}</span>
          </div>

          <div className="drawer-field">
            <span className="drawer-field-label">Due Date</span>
            <span className="drawer-field-value">
              {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="drawer-section">
          <div className="drawer-section-title">Description</div>
          <textarea
            className="drawer-description"
            defaultValue={issue.description ?? ''}
            onBlur={handleDescriptionBlur}
            placeholder="Add a description…"
          />
        </div>

        {/* Labels */}
        {issue.labels.length > 0 && (
          <div className="drawer-section">
            <div className="drawer-section-title">Labels</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {issue.labels.map((label) => (
                <span
                  key={label.id}
                  style={{
                    background: label.color + '30',
                    color: label.color,
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="drawer-section">
          <div className="drawer-section-title">Comments ({issue.comments.length})</div>
          <div className="comment-list">
            {issue.comments.map((comment) => (
              <div key={comment.id} className="comment-item">
                <div className="comment-body">{comment.body}</div>
                <div className="comment-meta">
                  {new Date(comment.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <div className="comment-input-row">
            <input
              className="comment-input"
              placeholder="Add a comment…"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            />
            <button className="comment-submit" onClick={handleAddComment}>
              Send
            </button>
          </div>
        </div>

        {/* Attachments */}
        {issue.attachments.length > 0 && (
          <div className="drawer-section">
            <div className="drawer-section-title">Attachments</div>
            {issue.attachments.map((att) => (
              <div key={att.id} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', padding: '4px 0' }}>
                📎 <a href={att.fileUrl} target="_blank" rel="noopener" style={{ color: '#818cf8' }}>
                  {att.filename}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

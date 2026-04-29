// apps/web/src/features/kanban/IssueCard.tsx
// Draggable issue card with priority stripe, avatar, and story points badge.
// State: none (pure presentational, drag state from useSortable)

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { IssueCard as IssueCardType } from '../../api/hooks';

interface Props {
  issue: IssueCardType;
  columnId: string;
  onClick: (issueId: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const IssueCard: React.FC<Props> = ({ issue, columnId, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
    data: {
      type: 'issue',
      columnId,
      ...issue,
    },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`issue-card ${isDragging ? 'issue-card--dragging' : ''}`}
      onClick={() => onClick(issue.id)}
      {...attributes}
      {...listeners}
    >
      <div className={`issue-card-priority-stripe issue-card-priority-stripe--${issue.priority}`} />

      <div className="issue-card-title">{issue.title}</div>

      <div className="issue-card-meta">
        {issue.assignee && (
          <div className="issue-card-avatar" title={issue.assignee.fullName}>
            {issue.assignee.avatarUrl ? (
              <img src={issue.assignee.avatarUrl} alt={issue.assignee.fullName} />
            ) : (
              getInitials(issue.assignee.fullName)
            )}
          </div>
        )}

        <div className="issue-card-badges">
          {issue.commentsCount > 0 && (
            <span className="issue-card-badge">💬 {issue.commentsCount}</span>
          )}
          {issue.labelsCount > 0 && (
            <span className="issue-card-badge">🏷 {issue.labelsCount}</span>
          )}
        </div>

        {issue.storyPoints != null && (
          <div className="issue-card-story-points">{issue.storyPoints} SP</div>
        )}
      </div>
    </div>
  );
};

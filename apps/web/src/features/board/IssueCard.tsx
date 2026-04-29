// apps/web/src/features/board/IssueCard.tsx
// Kanban issue card with sortable DnD, priority strip, quick actions on hover.

import React, { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar } from '../../components/ui/Avatar';
import { PRIORITY_COLORS } from '../../lib/constants';
import type { IssueInColumn } from '../../api/projects.api';
import { AlertCircle, Hash } from 'lucide-react';
import styles from './IssueCard.module.css';

interface IssueCardProps {
  issue: IssueInColumn;
  onOpen: (issueId: string) => void;
  isDragOverlay?: boolean;
}

export const IssueCard: React.FC<IssueCardProps> = memo(({ issue, onOpen, isDragOverlay }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
    // Disable layout-change animations so the card snaps instantly to its new
    // position rather than playing the "return to origin" animation on drop.
    animateLayoutChanges: () => false,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    // Only apply a CSS transition when the card is actually displaced (transform
    // is non-null).  This covers the sibling-shuffle animation while dragging.
    // When transform resets to null on drop, we skip the transition so the card
    // snaps instantly to its new DOM position instead of animating back to the
    // old one — that "snap-back" flash was the visible artefact.
    transition: transform ? (transition ?? undefined) : undefined,
    opacity: isDragging ? 0.35 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const priorityColor = PRIORITY_COLORS[issue.priority as keyof typeof PRIORITY_COLORS] ?? 'var(--priority-none)';

  return (
    <div
      ref={setNodeRef}
      style={isDragOverlay ? { ...style, opacity: 0.9, boxShadow: 'var(--shadow-lg)', transition: 'none' } : style}
      className={[styles.card, isDragOverlay ? styles.overlay : ''].filter(Boolean).join(' ')}
      onClick={() => !isDragging && onOpen(issue.id)}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`Issue: ${issue.title}`}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(issue.id); }}
    >
      {/* Priority strip */}
      <div
        className={styles.priorityBar}
        style={{ background: priorityColor }}
        aria-label={`Priority: ${issue.priority}`}
      />

      <div className={styles.body}>
        <p className={styles.title}>{issue.title}</p>
        <div className={styles.meta}>
          <span className={styles.issueId}>
            <Hash size={10} aria-hidden />
            {issue.id.substring(0, 8)}
          </span>
          {issue.storyPoints != null && (
            <span className={styles.points}>{issue.storyPoints}</span>
          )}
          {(issue.labels ?? []).slice(0, 2).map((l) => (
            <span key={l.id} className={styles.label} style={{ background: `${l.color}20`, color: l.color }}>
              {l.name}
            </span>
          ))}
          <span className={styles.spacer} />
          {issue.assignee ? (
            <Avatar name={issue.assignee.fullName} src={issue.assignee.avatarUrl} size="xs" />
          ) : (
            <span className={styles.unassigned} aria-label="Unassigned"><AlertCircle size={12} /></span>
          )}
        </div>
      </div>
    </div>
  );
}, (prev, next) =>
  prev.issue.id === next.issue.id &&
  prev.issue.title === next.issue.title &&
  prev.issue.priority === next.issue.priority &&
  prev.issue.storyPoints === next.issue.storyPoints &&
  prev.issue.assignee?.id === next.issue.assignee?.id,
);
IssueCard.displayName = 'IssueCard';

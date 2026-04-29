// apps/web/src/features/kanban/KanbanColumn.tsx
// Droppable column with sortable issue list.
// State: none (presentational, drop/sort context from dnd-kit)

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { IssueCard } from './IssueCard';
import type { BoardColumn as ColumnType } from '../../api/hooks';

interface Props {
  column: ColumnType;
  onIssueClick: (issueId: string) => void;
}

export const KanbanColumn: React.FC<Props> = ({ column, onIssueClick }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      status: column.name.toUpperCase().replace(/\s+/g, '_'),
    },
  });

  const issueIds = column.issues.map((i) => i.id);

  return (
    <div
      className="kanban-column"
      style={{
        borderColor: isOver ? `${column.color}60` : undefined,
      }}
    >
      <div className="kanban-column-header">
        <div
          className="kanban-column-indicator"
          style={{ backgroundColor: column.color }}
        />
        <span className="kanban-column-title">{column.name}</span>
        <span className="kanban-column-count">{column.issues.length}</span>
      </div>

      <div ref={setNodeRef} className="kanban-column-body">
        <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
          {column.issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              columnId={column.id}
              onClick={onIssueClick}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

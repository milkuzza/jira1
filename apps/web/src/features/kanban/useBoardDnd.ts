// apps/web/src/features/kanban/useBoardDnd.ts
// Hook for Kanban drag-and-drop: optimistic updates with rollback.

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type { BoardResponse, IssueCard } from '../../api/hooks';
import { useMoveIssue } from '../../api/hooks';

export function useBoardDnd(projectId: string) {
  const [activeIssue, setActiveIssue] = useState<IssueCard | null>(null);
  const queryClient = useQueryClient();
  const moveIssueMutation = useMoveIssue(projectId);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const issue = active.data.current as IssueCard | undefined;
    setActiveIssue(issue ?? null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveIssue(null);
      const { active, over } = event;

      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      // Parse the over target: either a column or an issue
      const overData = over.data.current as {
        type?: string;
        columnId?: string;
        status?: string;
        sortable?: { index: number };
      } | undefined;

      // Determine target column
      let targetColumnId: string;
      let targetStatus: string;
      let newOrder: number;

      if (overData?.type === 'column') {
        // Dropped on empty column — place at end
        targetColumnId = overId;
        targetStatus = overData.status ?? 'BACKLOG';
        newOrder = 1000;
      } else {
        // Dropped on or near an issue
        targetColumnId = overData?.columnId ?? '';
        targetStatus = overData?.status ?? 'BACKLOG';

        // Calculate order: midpoint between neighbors
        const board = queryClient.getQueryData<BoardResponse>(['board', projectId]);
        if (board) {
          const column = board.columns.find((c) => c.id === targetColumnId);
          if (column) {
            const overIndex = column.issues.findIndex((i) => i.id === overId);
            if (overIndex >= 0) {
              const prev = overIndex > 0 ? column.issues[overIndex - 1].order : 0;
              const next = column.issues[overIndex].order;
              newOrder = (prev + next) / 2;
            } else {
              newOrder = (column.issues[column.issues.length - 1]?.order ?? 0) + 1;
            }
          } else {
            newOrder = 1;
          }
        } else {
          newOrder = 1;
        }
      }

      // Optimistic update: move issue in the cache
      queryClient.setQueryData<BoardResponse>(['board', projectId], (old) => {
        if (!old) return old;

        const newColumns = old.columns.map((col) => ({
          ...col,
          issues: col.issues.filter((i) => i.id !== activeId),
        }));

        const targetCol = newColumns.find((c) => c.id === targetColumnId);
        if (targetCol) {
          const movedIssue = old.columns
            .flatMap((c) => c.issues)
            .find((i) => i.id === activeId);

          if (movedIssue) {
            targetCol.issues.push({
              ...movedIssue,
              status: targetStatus,
              order: newOrder,
            });
            targetCol.issues.sort((a, b) => a.order - b.order);
          }
        }

        return { columns: newColumns };
      });

      // Send mutation
      moveIssueMutation.mutate({
        issueId: activeId,
        newOrder,
        newStatus: targetStatus,
        columnId: targetColumnId,
      });
    },
    [projectId, queryClient, moveIssueMutation],
  );

  return {
    activeIssue,
    handleDragStart,
    handleDragEnd,
  };
}

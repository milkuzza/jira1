// apps/web/src/features/board/useBoardDnd.ts
// DnD logic hook: sensors, drag state, newOrder computation, optimistic patch.

import { useState, useCallback } from 'react';
import {
  useSensor, useSensors, PointerSensor, KeyboardSensor,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { issuesApi } from '../../api/issues.api';
import type { BoardColumnDto, IssueInColumn } from '../../api/projects.api';

export interface ActiveIssue {
  issue: IssueInColumn;
  fromStatus: string;
}

export function useBoardDnd(projectId: string) {
  const queryClient = useQueryClient();
  const [activeIssue, setActiveIssue] = useState<ActiveIssue | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const moveMutation = useMutation({
    mutationFn: ({ issueId, newOrder, newStatus }: { issueId: string; newOrder: number; newStatus: string }) =>
      issuesApi.move(issueId, { newOrder, newStatus }),
    onError: () => {
      // Rollback: re-fetch board on error
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
    },
  });

  const onDragStart = useCallback((event: DragStartEvent) => {
    const boards = queryClient.getQueryData<BoardColumnDto[]>(['board', projectId]);
    if (!boards) return;
    for (const col of boards) {
      const issue = col.issues.find((i) => i.id === event.active.id);
      if (issue) { setActiveIssue({ issue, fromStatus: col.status }); break; }
    }
  }, [queryClient, projectId]);

  const onDragOver = useCallback((_event: DragOverEvent) => {
    // Visual feedback during drag is handled by DnD-kit's SortableContext
  }, []);

  const onDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // Nothing to do — clear state and bail
    if (!over || active.id === over.id) {
      setActiveIssue(null);
      return;
    }

    const boards = queryClient.getQueryData<BoardColumnDto[]>(['board', projectId]);
    if (!boards) {
      setActiveIssue(null);
      return;
    }

    // Determine destination column and position
    let destCol: BoardColumnDto | undefined;
    let destIndex = 0;

    for (const col of boards) {
      const idx = col.issues.findIndex((i) => i.id === over.id);
      if (idx !== -1) { destCol = col; destIndex = idx; break; }
      // over.id might be a column droppable id (the status string)
      if (col.status === over.id) { destCol = col; destIndex = col.issues.length; break; }
    }

    if (!destCol) {
      setActiveIssue(null);
      return;
    }

    const issues = destCol.issues.filter((i) => i.id !== active.id);
    const prev = issues[destIndex - 1]?.order ?? 0;
    const next = issues[destIndex]?.order ?? prev + 2;
    let newOrder = (prev + next) / 2;

    // Precision guard — if too close to neighbour, bump by 1
    if (newOrder - prev < 0.001) newOrder = prev + 1;

    const newStatus = destCol.status;

    // ─── IMPORTANT: apply optimistic update BEFORE clearing activeIssue ───
    // This ensures the card appears instantly at its new position in the same
    // React render in which the DragOverlay disappears.  If we called
    // setActiveIssue(null) first, the original semi-transparent placeholder
    // would flash at its old DOM position for one frame before the data
    // update moved it — that is the "snap-back" artifact users see.
    queryClient.setQueryData<BoardColumnDto[]>(['board', projectId], (old) => {
      if (!old) return old;
      let moved: IssueInColumn | undefined;
      const stripped = old.map((c) => {
        const issue = c.issues.find((i) => i.id === active.id);
        if (issue) moved = { ...issue, status: newStatus, order: newOrder };
        return { ...c, issues: c.issues.filter((i) => i.id !== active.id) };
      });
      return stripped.map((c) => {
        if (c.status !== newStatus || !moved) return c;
        const list = [...c.issues, moved].sort((a, b) => a.order - b.order);
        return { ...c, issues: list };
      });
    });

    // Now clear the overlay — board data is already in its final state
    setActiveIssue(null);

    moveMutation.mutate({ issueId: String(active.id), newOrder, newStatus });
  }, [queryClient, projectId, moveMutation]);

  return { sensors, onDragStart, onDragOver, onDragEnd, activeIssue };
}

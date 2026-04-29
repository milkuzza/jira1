// apps/web/src/hooks/useProjectSocket.ts
// Per-project WebSocket events: board updates, presence tracking.

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { useAuthStore } from '../stores/auth.store';
import type { BoardColumnDto, IssueInColumn } from '../api/projects.api';

export interface UserPresence {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}

interface IssueMovedPayload {
  issueId: string;
  newStatus: string;
  newOrder: number;
  movedBy: string;
}

interface IssueUpdatedPayload {
  issueId: string;
  changes: Partial<IssueInColumn>;
}

interface IssueCreatedPayload {
  issue: IssueInColumn;
  columnId: string;
}

interface IssueDeletedPayload {
  issueId: string;
}

interface IssueCommentedPayload {
  issueId: string;
  commentId: string;
}

export function useProjectSocket(projectId: string | undefined): {
  viewers: UserPresence[];
} {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [viewers, setViewers] = useState<UserPresence[]>([]);

  useEffect(() => {
    if (!socket || !projectId) return;

    // Read token from auth store (persisted in localStorage as 'tm:auth')
    const token = useAuthStore.getState().accessToken ?? '';
    const currentUserId = useAuthStore.getState().user?.id;
    socket.emit('join:project', { token, projectId });

    // ─── Presence ──────────────────────────────────────────────────────────────
    const onViewing = (user: UserPresence) => {
      if (user.userId === currentUserId) return; // don't show self
      setViewers((v) => [...v.filter((u) => u.userId !== user.userId), user]);
    };

    const onLeft = ({ userId }: { userId: string }) =>
      setViewers((v) => v.filter((u) => u.userId !== userId));

    const onViewersInitial = (viewersList: UserPresence[]) =>
      setViewers(viewersList.filter((u) => u.userId !== currentUserId));

    // ─── Board updates ─────────────────────────────────────────────────────────
    const onIssueMoved = ({ issueId, newStatus, newOrder }: IssueMovedPayload) => {
      queryClient.setQueryData<BoardColumnDto[]>(['board', projectId], (old) => {
        if (!old) return old;
        let movedIssue: IssueInColumn | undefined;

        // Remove from old column
        const next = old.map((col) => {
          const issue = col.issues.find((i) => i.id === issueId);
          if (issue) movedIssue = issue;
          return { ...col, issues: col.issues.filter((i) => i.id !== issueId) };
        });

        if (!movedIssue) return old;

        // Insert in new column sorted by order
        return next.map((col) => {
          if (col.status !== newStatus) return col;
          const updated = { ...movedIssue!, status: newStatus, order: newOrder };
          const issues = [...col.issues, updated].sort((a, b) => a.order - b.order);
          return { ...col, issues };
        });
      });
    };

    const onIssueUpdated = ({ issueId }: IssueUpdatedPayload) => {
      // Invalidate the detail view (fixes wrong key: was ['issues', ...])
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
      // Invalidate the board to get fresh data with all relations (assignee, etc.)
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
    };

    const onIssueCreated = ({ issue }: IssueCreatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
      // For newly created issues just invalidate — simpler than finding the right column index
      void issue;
    };

    const onIssueDeleted = ({ issueId }: IssueDeletedPayload) => {
      queryClient.setQueryData<BoardColumnDto[]>(['board', projectId], (old) =>
        old?.map((col) => ({
          ...col,
          issues: col.issues.filter((i) => i.id !== issueId),
        })),
      );
    };

    const onIssueCommented = ({ issueId: commentedIssueId }: IssueCommentedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['comments', commentedIssueId] });
      // Also bump the issue detail (for comment count)
      queryClient.invalidateQueries({ queryKey: ['issue', commentedIssueId] });
    };

    const onColumnChange = () => {
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
    };

    socket.on('user:viewing',   onViewing);
    socket.on('user:left',      onLeft);
    socket.on('viewers:initial', onViewersInitial);
    socket.on('issue:moved',    onIssueMoved);
    socket.on('issue:updated',  onIssueUpdated);
    socket.on('issue:created',  onIssueCreated);
    socket.on('issue:deleted',   onIssueDeleted);
    socket.on('issue:commented', onIssueCommented);
    socket.on('column:created',  onColumnChange);
    socket.on('column:updated', onColumnChange);
    socket.on('column:deleted', onColumnChange);

    return () => {
      socket.emit('leave:project', { projectId });
      socket.off('user:viewing',   onViewing);
      socket.off('user:left',      onLeft);
      socket.off('viewers:initial', onViewersInitial);
      socket.off('issue:moved',    onIssueMoved);
      socket.off('issue:updated',  onIssueUpdated);
      socket.off('issue:created',  onIssueCreated);
      socket.off('issue:deleted',   onIssueDeleted);
      socket.off('issue:commented', onIssueCommented);
      socket.off('column:created',  onColumnChange);
      socket.off('column:updated', onColumnChange);
      socket.off('column:deleted', onColumnChange);
      setViewers([]);
    };
  }, [socket, projectId, queryClient]);

  return { viewers };
}

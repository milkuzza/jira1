// apps/web/src/api/hooks.ts
// TanStack Query hooks for board, issues, and mutations.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

// ─── Types ───────────────────────────────────────

export interface IssueCard {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: { id: string; fullName: string; avatarUrl: string | null } | null;
  storyPoints: number | null;
  labelsCount: number;
  commentsCount: number;
  order: number;
}

export interface BoardColumn {
  id: string;
  name: string;
  color: string;
  order: number;
  issues: IssueCard[];
}

export interface BoardResponse {
  columns: BoardColumn[];
}

export interface IssueDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  assignee: { id: string; fullName: string; avatarUrl: string | null } | null;
  reporter: { id: string; fullName: string; avatarUrl: string | null };
  sprintId: string | null;
  sprint: { id: string; name: string } | null;
  storyPoints: number | null;
  dueDate: string | null;
  order: number;
  comments: { id: string; body: string; userId: string; createdAt: string }[];
  attachments: { id: string; filename: string; fileUrl: string }[];
  labels: { id: string; name: string; color: string }[];
  createdAt: string;
  updatedAt: string;
}

// ─── Queries ─────────────────────────────────────

export function useBoard(projectId: string) {
  return useQuery<BoardResponse>({
    queryKey: ['board', projectId],
    queryFn: () => apiFetch<BoardResponse>(`/projects/${projectId}/board`),
    enabled: !!projectId,
    refetchInterval: 30_000,
  });
}

export function useIssue(issueId: string | null) {
  return useQuery<IssueDetail>({
    queryKey: ['issue', issueId],
    queryFn: () => apiFetch<IssueDetail>(`/issues/${issueId}`),
    enabled: !!issueId,
  });
}

export function useProjects() {
  return useQuery<{ id: string; name: string; key: string }[]>({
    queryKey: ['projects'],
    queryFn: () => apiFetch('/projects'),
  });
}

// ─── Mutations ───────────────────────────────────

export function useMoveIssue(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { issueId: string; newOrder: number; newStatus: string; columnId: string }) =>
      apiFetch(`/issues/${vars.issueId}/order`, {
        method: 'PATCH',
        body: JSON.stringify({
          newOrder: vars.newOrder,
          newStatus: vars.newStatus,
          columnId: vars.columnId,
        }),
      }),
    onError: () => {
      // Rollback: invalidate board to refetch
      void queryClient.invalidateQueries({ queryKey: ['board', projectId] });
    },
  });
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { issueId: string; data: Record<string, unknown> }) =>
      apiFetch(`/issues/${vars.issueId}`, {
        method: 'PATCH',
        body: JSON.stringify(vars.data),
      }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['issue', vars.issueId] });
    },
  });
}

export function useCreateIssue(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { title: string; status?: string; priority?: string }) =>
      apiFetch(`/projects/${projectId}/issues`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['board', projectId] });
    },
  });
}

export function useAddComment(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { body: string }) =>
      apiFetch(`/issues/${issueId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
    },
  });
}

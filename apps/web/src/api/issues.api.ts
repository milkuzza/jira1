// apps/web/src/api/issues.api.ts
// Issue CRUD, comments, changelog, attachments.

import api from './client';

export interface IssueDto {
  id: string;
  projectId: string;
  tenantId: string;
  sprintId: string | null;
  parentId: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: { id: string; fullName: string; avatarUrl: string | null } | null;
  reporter: { id: string; fullName: string; avatarUrl: string | null };
  storyPoints: number | null;
  dueDate: string | null;
  order: number;
  labels: Array<{ id: string; name: string; color: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueDto {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  sprintId?: string;
  storyPoints?: number;
  dueDate?: string;
}

export interface UpdateIssueDto {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  sprintId?: string | null;
  storyPoints?: number | null;
  dueDate?: string | null;
  labelIds?: string[];
}

export interface MoveIssueDto {
  newOrder: number;
  newStatus: string;
  columnId?: string;
}

export interface CommentDto {
  id: string;
  issueId: string;
  user: { id: string; fullName: string; avatarUrl: string | null };
  body: string;
  createdAt: string;
}

export interface ChangelogDto {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  user: { id: string; fullName: string };
  createdAt: string;
}

export interface AttachmentDto {
  id: string;
  filename: string;
  url: string;
  size: number;
  createdAt: string;
}

export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const issuesApi = {
  create: async (projectId: string, dto: CreateIssueDto): Promise<IssueDto> => {
    const { data } = await api.post<IssueDto>(`/projects/${projectId}/issues`, dto);
    return data;
  },

  list: async (projectId: string, params?: { cursor?: string; limit?: number; status?: string }): Promise<CursorPage<IssueDto>> => {
    const { data } = await api.get<CursorPage<IssueDto>>(`/projects/${projectId}/issues`, { params });
    return data;
  },

  getById: async (issueId: string): Promise<IssueDto> => {
    const { data } = await api.get<IssueDto>(`/issues/${issueId}`);
    return data;
  },

  update: async (issueId: string, dto: UpdateIssueDto): Promise<IssueDto> => {
    const { data } = await api.patch<IssueDto>(`/issues/${issueId}`, dto);
    return data;
  },

  move: async (issueId: string, dto: MoveIssueDto): Promise<IssueDto> => {
    const { data } = await api.patch<IssueDto>(`/issues/${issueId}/order`, dto);
    return data;
  },

  delete: async (issueId: string): Promise<void> => {
    await api.delete(`/issues/${issueId}`);
  },

  // ─── Comments ───────────────────────────────────────────────────────────────
  getComments: async (issueId: string): Promise<CommentDto[]> => {
    const { data } = await api.get<CommentDto[]>(`/issues/${issueId}/comments`);
    return data;
  },

  addComment: async (issueId: string, body: string): Promise<CommentDto> => {
    const { data } = await api.post<CommentDto>(`/issues/${issueId}/comments`, { body });
    return data;
  },

  // ─── Changelog ──────────────────────────────────────────────────────────────
  getChangelog: async (issueId: string): Promise<ChangelogDto[]> => {
    const { data } = await api.get<ChangelogDto[]>(`/issues/${issueId}/changelog`);
    return data;
  },

  // ─── Attachments ────────────────────────────────────────────────────────────
  getAttachments: async (issueId: string): Promise<AttachmentDto[]> => {
    const { data } = await api.get<AttachmentDto[]>(`/issues/${issueId}/attachments`);
    return data;
  },

  requestAttachmentUpload: async (
    issueId: string,
    dto: { filename: string; contentType: string; size: number },
  ): Promise<{ uploadUrl: string; attachmentId: string; fileUrl: string }> => {
    const { data } = await api.post(`/issues/${issueId}/attachments`, dto);
    return data;
  },

  confirmAttachment: async (issueId: string, attachmentId: string): Promise<AttachmentDto> => {
    const { data } = await api.patch<AttachmentDto>(`/issues/${issueId}/attachments/${attachmentId}/confirm`);
    return data;
  },
};

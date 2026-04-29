// apps/web/src/api/projects.api.ts
// Project and board-column endpoints.

import api from './client';

export interface ProjectDto {
  id: string;
  tenantId: string;
  name: string;
  key: string;
  description: string | null;
  boardType: 'KANBAN' | 'SCRUM';
  createdAt: string;
  issueCount?: number;
}

export interface CreateProjectDto {
  name: string;
  key: string;
  description?: string;
  boardType?: 'KANBAN' | 'SCRUM';
}

export interface BoardColumnDto {
  id: string;
  name: string;
  order: number;
  color: string;
  status: string;
  issues: IssueInColumn[];
}

export interface IssueInColumn {
  id: string;
  title: string;
  status: string;
  priority: string;
  order: number;
  storyPoints: number | null;
  assignee: { id: string; fullName: string; avatarUrl: string | null } | null;
  labels: Array<{ id: string; name: string; color: string }>;
}

export interface SprintDto {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
}

export const projectsApi = {
  list: async (): Promise<ProjectDto[]> => {
    const { data } = await api.get<ProjectDto[]>('/projects');
    return data;
  },

  create: async (dto: CreateProjectDto): Promise<ProjectDto> => {
    const { data } = await api.post<ProjectDto>('/projects', dto);
    return data;
  },

  createColumn: async (projectId: string, dto: { name: string; color?: string }): Promise<void> => {
    await api.post(`/projects/${projectId}/board-columns`, dto);
  },

  updateColumn: async (columnId: string, dto: { name?: string; color?: string }): Promise<void> => {
    await api.patch(`/projects/board-columns/${columnId}`, dto);
  },

  deleteColumn: async (columnId: string): Promise<void> => {
    await api.delete(`/projects/board-columns/${columnId}`);
  },

  getBoard: async (projectId: string): Promise<BoardColumnDto[]> => {
    // The backend actually returns { columns: BoardColumnWithIssues[] }
    const { data } = await api.get<{ columns?: BoardColumnDto[] }>(`/projects/${projectId}/board`);
    if (data.columns) return data.columns;
    if (Array.isArray(data)) return data as unknown as BoardColumnDto[];
    return [];
  },

  getSprints: async (projectId: string): Promise<SprintDto[]> => {
    const { data } = await api.get<SprintDto[]>(`/projects/${projectId}/sprints`);
    return data;
  },

  createSprint: async (projectId: string, dto: { name: string; goal?: string; startDate?: string; endDate?: string }): Promise<SprintDto> => {
    const { data } = await api.post<SprintDto>(`/projects/${projectId}/sprints`, dto);
    return data;
  },

  startSprint: async (sprintId: string): Promise<SprintDto> => {
    const { data } = await api.patch<SprintDto>(`/projects/sprints/${sprintId}/start`);
    return data;
  },

  completeSprint: async (sprintId: string): Promise<SprintDto> => {
    const { data } = await api.patch<SprintDto>(`/projects/sprints/${sprintId}/complete`);
    return data;
  },

  delete: async (projectId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}`);
  },
};

// apps/web/src/api/search.api.ts
// Search endpoint.

import api from './client';

export interface SearchIssueResult {
  id: string;
  title: string;
  titleHighlight?: string;
  status: string;
  priority: string;
  projectId: string;
  projectName: string;
}

export interface SearchProjectResult {
  id: string;
  name: string;
  key: string;
}

export interface SearchResponse {
  issues: SearchIssueResult[];
  projects: SearchProjectResult[];
}

export const searchApi = {
  search: async (q: string, projectId?: string): Promise<SearchResponse> => {
    const { data } = await api.get<SearchResponse>('/search', {
      params: { q, ...(projectId ? { projectId } : {}) },
    });
    return data;
  },
};

// apps/web/src/api/tenants.api.ts
// Tenant endpoints: register, get current, update, check slug.

import api from './client';

export interface TenantDto {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
  createdAt: string;
}

export interface RegisterTenantDto {
  orgName: string;
  slug: string;
  adminEmail: string;
  adminPassword: string;
}

export interface RegisterTenantResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string; role: string; avatarUrl: string | null };
}

export const tenantsApi = {
  register: async (dto: RegisterTenantDto): Promise<RegisterTenantResponse> => {
    const { data } = await api.post<RegisterTenantResponse>('/tenants/register', dto);
    return data;
  },

  getCurrent: async (): Promise<TenantDto> => {
    const { data } = await api.get<TenantDto>('/tenants/current');
    return data;
  },

  update: async (dto: { name?: string }): Promise<TenantDto> => {
    const { data } = await api.patch<TenantDto>('/tenants/current', dto);
    return data;
  },

  checkSlug: async (slug: string): Promise<{ available: boolean }> => {
    const { data } = await api.get<{ available: boolean }>(`/tenants/check-slug?slug=${slug}`);
    return data;
  },
};

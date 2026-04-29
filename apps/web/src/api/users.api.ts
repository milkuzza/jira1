// apps/web/src/api/users.api.ts
// User endpoints: me, list, invite, avatar.

import api from './client';

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
  tenantId: string;
  createdAt: string;
}

export interface UpdateMeDto {
  fullName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  avatarUrl?: string;
}

export interface InviteDto {
  email: string;
  role: string;
}

export interface InviteResult {
  id: string;
  email: string;
  temporaryPassword: string;
}

export const usersApi = {
  getMe: async (): Promise<UserDto> => {
    const { data } = await api.get<UserDto>('/users/me');
    return data;
  },

  updateMe: async (dto: UpdateMeDto): Promise<UserDto> => {
    const { data } = await api.patch<UserDto>('/users/me', dto);
    return data;
  },

  list: async (): Promise<UserDto[]> => {
    const { data } = await api.get<UserDto[]>('/users');
    return data;
  },

  invite: async (dto: InviteDto): Promise<InviteResult> => {
    const { data } = await api.post<InviteResult>('/users/invite', dto);
    return data;
  },

  remove: async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}`);
  },

  uploadAvatar: async (file: File): Promise<{ avatarUrl: string }> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<{ avatarUrl: string }>('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

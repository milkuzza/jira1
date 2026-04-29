// apps/web/src/api/auth.api.ts
// Auth endpoints: login, refresh, logout, register.

import api from './client';

export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
  tenantId: string;
}

export interface LoginResponse extends TokenPair {
  user: UserDto;
}

export const authApi = {
  login: async (dto: LoginDto): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', dto);
    return data;
  },

  refresh: async (refreshToken: string): Promise<TokenPair> => {
    const { data } = await api.post<TokenPair>('/auth/refresh', { refreshToken });
    return data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};

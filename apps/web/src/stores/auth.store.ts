// apps/web/src/stores/auth.store.ts
// Zustand auth store with localStorage persistence.
// workspaceSlug drives the X-Tenant-Id header on every API request.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
  tenantId: string;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  tenant: AuthTenant | null;
  workspaceSlug: string | null;   // ← persisted separately for quick access
  // actions
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string, tenant: AuthTenant) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setTenant: (tenant: AuthTenant) => void;
  setWorkspaceSlug: (slug: string) => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      tenant: null,
      workspaceSlug: null,

      setAuth: (user, accessToken, refreshToken, tenant) =>
        set({ user, accessToken, refreshToken, tenant, workspaceSlug: tenant.slug }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setTenant: (tenant) =>
        set({ tenant, workspaceSlug: tenant.slug }),

      setWorkspaceSlug: (slug) =>
        set({ workspaceSlug: slug }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, tenant: null, workspaceSlug: null }),
    }),
    {
      name: 'tm:auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tenant: state.tenant,
        workspaceSlug: state.workspaceSlug,
      }),
    },
  ),
);

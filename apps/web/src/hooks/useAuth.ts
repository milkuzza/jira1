// apps/web/src/hooks/useAuth.ts
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { authApi } from '../api/auth.api';
import { usersApi } from '../api/users.api';

export function useAuth() {
  const store = useAuthStore();
  const navigate = useNavigate();

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login({ email, password });
    // fetch user profile
    const user = await usersApi.getMe();
    const tenant = store.tenant ?? { id: '', name: '', slug: '', plan: 'FREE' as const };
    store.setAuth(
      { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl, tenantId: tenant.id },
      tokens.accessToken,
      tokens.refreshToken,
      // tenant info from TenantMiddleware — host gives slug
      store.tenant ?? { id: '', name: '', slug: '', plan: 'FREE' },
    );
    navigate('/');
  }, [store, navigate]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    store.clearAuth();
    navigate('/login');
  }, [store, navigate]);

  return { user: store.user, tenant: store.tenant, isAuthenticated: !!store.user, login, logout };
}

// apps/web/src/features/layout/ProtectedRoute.tsx
// Redirects to /login if no token, loads user profile if not loaded.

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { usersApi } from '../../api/users.api';
import { tenantsApi } from '../../api/tenants.api';
import { configureClient } from '../../api/client';
import { Spinner } from '../../components/ui/Spinner';

interface Props { children: React.ReactNode; }

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { accessToken, user, tenant, setAuth, setTenant, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(!user && !!accessToken);

  // Wire axios to store on every mount (safe — idempotent)
  configureClient({
    getAccessToken:   () => useAuthStore.getState().accessToken,
    getRefreshToken:  () => useAuthStore.getState().refreshToken,
    getWorkspaceSlug: () => useAuthStore.getState().workspaceSlug,
    setTokens:        (a, r) => useAuthStore.getState().setTokens(a, r),
    clearAuth:        () => useAuthStore.getState().clearAuth(),
  });

  useEffect(() => {
    if (!accessToken || user) { setLoading(false); return; }
    setLoading(true);
    Promise.all([usersApi.getMe(), tenantsApi.getCurrent()])
      .then(([u, t]) => {
        setAuth(
          { id: u.id, email: u.email, fullName: u.fullName, role: u.role, avatarUrl: u.avatarUrl, tenantId: u.tenantId },
          accessToken,
          useAuthStore.getState().refreshToken ?? '',
          { id: t.id, name: t.name, slug: t.slug, plan: t.plan },
        );
        setTenant({ id: t.id, name: t.name, slug: t.slug, plan: t.plan });
      })
      .catch(() => clearAuth())
      .finally(() => setLoading(false));
  }, [accessToken, user, setAuth, setTenant, clearAuth]);

  if (!accessToken) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
};

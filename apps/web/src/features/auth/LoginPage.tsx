// apps/web/src/features/auth/LoginPage.tsx
// Login page — centered card, workspace slug + email + password, redirect on success.

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { authApi } from '../../api/auth.api';
import { usersApi } from '../../api/users.api';
import { tenantsApi } from '../../api/tenants.api';
import { configureClient } from '../../api/client';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Layers } from 'lucide-react';
import { LocaleSwitcher } from '../../components/ui/LocaleSwitcher';
import { useT } from '../../lib/i18n';

// Wire store getters into axios interceptors. workspaceSlugRef let us set it
// before the store action completes (avoids race on first request).
let _pendingSlug = '';

function wireClientToStore() {
  configureClient({
    getAccessToken:   () => useAuthStore.getState().accessToken,
    getRefreshToken:  () => useAuthStore.getState().refreshToken,
    getWorkspaceSlug: () => useAuthStore.getState().workspaceSlug ?? _pendingSlug,
    setTokens:        (a, r) => useAuthStore.getState().setTokens(a, r),
    clearAuth:        () => useAuthStore.getState().clearAuth(),
  });
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth, setTenant, setWorkspaceSlug } = useAuthStore();
  const t = useT();

  const [workspace, setWorkspace] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace.trim() || !email.trim() || !password.trim()) return;
    setError('');
    setLoading(true);

    try {
      // Set slug BEFORE login API call so X-Tenant-Id header is ready
      _pendingSlug = workspace.trim().toLowerCase();
      setWorkspaceSlug(_pendingSlug);
      wireClientToStore();

      const res = await authApi.login({ email: email.trim(), password });
      useAuthStore.getState().setTokens(res.accessToken, res.refreshToken);

      const [user, tenant] = await Promise.all([
        usersApi.getMe(),
        tenantsApi.getCurrent(),
      ]);

      setAuth(
        { id: user.id, email: user.email, fullName: user.fullName, role: user.role, avatarUrl: user.avatarUrl, tenantId: user.tenantId },
        res.accessToken,
        res.refreshToken,
        { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
      );
      setTenant({ id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan });

      navigate('/projects', { replace: true });
    } catch {
      setError(t.login.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={{ position: 'absolute', top: 16, right: 20 }}>
        <LocaleSwitcher />
      </div>
      <form style={s.card} onSubmit={handleSubmit} noValidate>
        <div style={s.logo}>
          <Layers size={28} color="var(--color-accent)" />
          <span style={s.appName}>TaskManager</span>
        </div>

        <div style={s.heading}>
          <h1 style={s.title}>{t.login.title}</h1>
          <p style={s.sub}>{t.login.subtitle}</p>
        </div>

        {error && (
          <div role="alert" style={s.errBox}>{error}</div>
        )}

        <Input
          label={t.login.workspaceLabel}
          value={workspace}
          onChange={(e) => setWorkspace(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="acme-corp"
          autoFocus
          required
          autoComplete="organization"
          hint={t.login.workspaceHint}
        />

        <Input
          label={t.login.emailLabel}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          autoComplete="email"
        />

        <Input
          label={t.login.passwordLabel}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />

        <Button type="submit" variant="primary" size="md" loading={loading} style={{ width: '100%', marginTop: 4 }}>
          {t.login.submit}
        </Button>

        <p style={s.footer}>
          {t.login.noAccount}{' '}
          <Link to="/register" style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
            {t.login.createOrg}
          </Link>
        </p>
      </form>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-bg)',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '36px 32px',
    boxShadow: 'var(--shadow-md)',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' },
  appName: { fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' },
  heading: { textAlign: 'center' },
  title: { fontSize: 18, fontWeight: 600 },
  sub: { fontSize: 12, color: 'var(--color-muted)', marginTop: 4 },
  errBox: {
    background: 'var(--color-danger-subtle)',
    border: '1px solid rgba(229,72,77,0.3)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 12px',
    fontSize: 12,
    color: 'var(--color-danger)',
  },
  footer: { textAlign: 'center', fontSize: 12, color: 'var(--color-muted)' },
};

export default LoginPage;

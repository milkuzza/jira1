// apps/web/src/features/auth/RegisterOrgPage.tsx
// 3-step org registration: name/slug → check availability → admin credentials.

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { tenantsApi } from '../../api/tenants.api';
import { usersApi } from '../../api/users.api';
import { configureClient } from '../../api/client';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LocaleSwitcher } from '../../components/ui/LocaleSwitcher';
import { Layers, CheckCircle, XCircle } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { useT } from '../../lib/i18n';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-')
    .slice(0, 63);
}

const RegisterOrgPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth, setTenant } = useAuthStore();
  const t = useT();

  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const debouncedSlug = useDebounce(slug, 400);

  // Auto-generate slug from org name on step 1
  useEffect(() => {
    if (orgName && step === 1) setSlug(slugify(orgName));
  }, [orgName, step]);

  // Check slug availability on step 2
  useEffect(() => {
    if (step !== 2 || !debouncedSlug) return;
    setCheckingSlug(true);
    setSlugAvailable(null);
    tenantsApi.checkSlug(debouncedSlug)
      .then((r) => setSlugAvailable(r.available))
      .catch(() => setSlugAvailable(null))
      .finally(() => setCheckingSlug(false));
  }, [debouncedSlug, step]);

  const validateStep = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (step === 1 && !orgName.trim()) errs.orgName = t.register.required;
    if (step === 2) {
      if (!slug.trim()) {
        errs.slug = t.register.required;
      } else if (checkingSlug) {
        // Still waiting for the availability check — don't let the user proceed
        errs.slug = t.register.checking;
      } else if (slugAvailable === null) {
        // Check finished with an error (network issue etc.) — also block
        errs.slug = t.register.checking;
      } else if (slugAvailable === false) {
        errs.slug = t.register.slugTaken;
      }
    }
    if (step === 3) {
      if (!adminEmail.trim())  errs.email = t.register.required;
      if (adminPassword.length < 8) errs.password = t.register.minChars;
      if (adminPassword !== confirmPassword) errs.confirm = t.register.passwordMismatch;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [step, orgName, slug, slugAvailable, checkingSlug, adminEmail, adminPassword, confirmPassword, t]);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    if (step < 3) setStep((s) => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    setLoading(true);
    try {
      configureClient({
        getAccessToken:   () => useAuthStore.getState().accessToken,
        getRefreshToken:  () => useAuthStore.getState().refreshToken,
        getWorkspaceSlug: () => useAuthStore.getState().workspaceSlug,
        setTokens:        (a, r) => useAuthStore.getState().setTokens(a, r),
        clearAuth:        () => useAuthStore.getState().clearAuth(),
      });

      const res = await tenantsApi.register({
        orgName: orgName.trim(),
        slug: slug.trim(),
        adminEmail: adminEmail.trim(),
        adminPassword,
      });

      // We have tokens. We must fetch the user and tenant before navigating,
      // just like LoginPage does, because AuthResponse does not contain the full Tenant Entity.
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
    } catch (err: unknown) {
      // Extract the real error message from the API response so the user sees
      // something actionable (e.g. "Slug 'qwe' is already taken") instead of
      // a generic fallback.
      const apiMsg = (
        err as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      const display = Array.isArray(apiMsg)
        ? apiMsg[0]
        : (apiMsg ?? t.register.submitError);
      setErrors({ submit: String(display) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={{ position: 'absolute', top: 16, right: 20 }}>
        <LocaleSwitcher />
      </div>
      <div style={s.card}>
        <div style={s.logo}>
          <Layers size={26} color="var(--color-accent)" />
          <span style={s.appName}>TaskManager</span>
        </div>

        {/* Step indicators */}
        <div style={s.steps}>
          {[1, 2, 3].map((n) => (
            <React.Fragment key={n}>
              <div style={{ ...s.stepDot, background: step >= n ? 'var(--color-accent)' : 'var(--color-border)' }} />
              {n < 3 && <div style={{ ...s.stepLine, background: step > n ? 'var(--color-accent)' : 'var(--color-border)' }} />}
            </React.Fragment>
          ))}
        </div>

        <h1 style={s.title}>
          {step === 1 && t.register.step1}
          {step === 2 && t.register.step2}
          {step === 3 && t.register.step3}
        </h1>

        <form onSubmit={step < 3 ? handleNext : handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {step === 1 && (
            <Input
              label={t.register.orgName}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Corp"
              autoFocus
              error={errors.orgName}
            />
          )}

          {step === 2 && (
            <div>
              <Input
                label={t.register.workspaceUrl}
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="acme-corp"
                autoFocus
                error={errors.slug}
                suffix={
                  checkingSlug ? null :
                  slugAvailable === true  ? <CheckCircle size={14} color="var(--color-success)" /> :
                  slugAvailable === false ? <XCircle size={14} color="var(--color-danger)" /> : null
                }
              />
              <p style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 6 }}>
                app.localhost/{slug || '...'}
              </p>
            </div>
          )}

          {step === 3 && (
            <>
              {errors.submit && <div role="alert" style={s.errBox}>{errors.submit}</div>}
              <Input
                label={t.register.adminEmail}
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                autoFocus
                error={errors.email}
              />
              <Input
                label={t.register.password}
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                hint={t.register.minChars}
                error={errors.password}
              />
              <Input
                label={t.register.confirmPassword}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirm}
              />
            </>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} style={{ flex: 1 }}>
                {t.register.back}
              </Button>
            )}
            <Button type="submit" variant="primary" loading={loading} style={{ flex: 1 }}>
              {step < 3 ? t.register.continue : t.register.createWorkspace}
            </Button>
          </div>
        </form>

        <p style={s.footer}>
          {t.register.hasAccount}{' '}
          <Link to="/login" style={{ color: 'var(--color-accent)', fontWeight: 500 }}>{t.register.signIn}</Link>
        </p>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: 16, position: 'relative' },
  card: { width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '36px 32px', boxShadow: 'var(--shadow-md)' },
  logo: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' },
  appName: { fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' },
  steps: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 },
  stepDot: { width: 8, height: 8, borderRadius: '50%', transition: 'background 200ms' },
  stepLine: { width: 40, height: 2, transition: 'background 200ms' },
  title: { fontSize: 16, fontWeight: 600, textAlign: 'center' },
  errBox: { background: 'var(--color-danger-subtle)', border: '1px solid rgba(229,72,77,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 12, color: 'var(--color-danger)' },
  footer: { textAlign: 'center', fontSize: 12, color: 'var(--color-muted)' },
};

export default RegisterOrgPage;

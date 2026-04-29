// apps/web/src/features/settings/TenantSettingsPage.tsx
// Organization settings: name, plan, YooKassa upgrade with auto-verify on return.

import React, { useRef, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { tenantsApi } from '../../api/tenants.api';
import { billingApi } from '../../api/billing.api';
import { useAuthStore } from '../../stores/auth.store';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { PLAN_LABELS } from '../../lib/constants';
import { Navigate } from 'react-router-dom';
import styles from './SettingsPage.module.css';

const PLAN_BADGE: Record<string, 'info' | 'success' | 'warning'> = {
  FREE:       'info',
  BASIC:      'info',
  PRO:        'success',
  ENTERPRISE: 'warning',
};

const TenantSettingsPage: React.FC = () => {
  const { user, tenant, setTenant } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [name, setName]               = useState(tenant?.name ?? '');
  const [saveSuccess, setSaveSuccess]  = useState('');
  const [checkoutPlan, setCheckoutPlan] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  // ─── Payment verification after YooKassa redirect ────────────────────────
  const isVerifying = searchParams.get('upgraded') === 'true';

  const { data: verifyResult, isLoading: verifyLoading } = useQuery({
    queryKey: ['billing/verify'],
    queryFn:  billingApi.verifyPayment,
    enabled:  isVerifying,
    // retry once more if still pending
    retry: (count, result) =>
      count < 3 && (result as { status?: string })?.status === 'pending',
    retryDelay: 2000,
  });

  // Track whether we already processed this verification result so the effect
  // never fires twice (prevents the infinite-loop caused by setTenant changing
  // the `tenant` object which previously was in the dependency array).
  const verifyHandled = useRef(false);

  useEffect(() => {
    if (!verifyResult || verifyHandled.current) return;

    if (verifyResult.status === 'succeeded' && verifyResult.plan) {
      verifyHandled.current = true;
      // Read the current tenant snapshot directly from the store so we do NOT
      // put `tenant` in the dep array (that would re-trigger this effect every
      // time setTenant() updates it → infinite loop).
      const currentTenant = useAuthStore.getState().tenant;
      if (currentTenant) {
        setTenant({
          id:   currentTenant.id,
          name: currentTenant.name,
          slug: currentTenant.slug,
          plan: verifyResult.plan as typeof currentTenant.plan,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      // Remove ?upgraded=true from URL
      setSearchParams({}, { replace: true });
    } else if (
      verifyResult.status === 'canceled' ||
      verifyResult.status === 'not_found' ||
      verifyResult.status === 'error'
    ) {
      verifyHandled.current = true;
      setSearchParams({}, { replace: true });
    }
  // `tenant` intentionally omitted — we read it via getState() inside the
  // callback to avoid re-triggering the effect after setTenant() updates it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyResult, setTenant, setSearchParams, queryClient]);

  if (user?.role !== 'ADMIN') return <Navigate to="/projects" replace />;

  // ─── Save org name ────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => tenantsApi.update({ name: name.trim() }),
    onSuccess: (updated) => {
      setTenant({ id: updated.id, name: updated.name, slug: updated.slug, plan: updated.plan });
      setSaveSuccess('Настройки сохранены!');
      setTimeout(() => setSaveSuccess(''), 3000);
    },
  });

  // ─── Checkout ─────────────────────────────────────────────────────────────
  const checkoutMutation = useMutation({
    mutationFn: (plan: string) => billingApi.createCheckout(plan),
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: () =>
      setCheckoutError('Ошибка оплаты. Проверьте настройки ЮКассы или повторите позже.'),
  });

  const handleUpgrade = (plan: string) => {
    setCheckoutError('');
    setCheckoutPlan(plan);
    checkoutMutation.mutate(plan);
  };

  // ─── Current plan label ───────────────────────────────────────────────────
  const currentPlan = tenant?.plan ?? 'FREE';
  const planLabel   = PLAN_LABELS[currentPlan as keyof typeof PLAN_LABELS] ?? currentPlan;
  const planBadge   = PLAN_BADGE[currentPlan] ?? 'info';

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Настройки организации</h1>

      {/* ── General ─────────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Общее</h2>

        {saveSuccess && (
          <p style={{ color: 'var(--color-success)', fontSize: 12, marginBottom: 8 }}>
            {saveSuccess}
          </p>
        )}

        <Input
          label="Название организации"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="URL рабочего пространства"
          value={tenant?.slug ?? ''}
          disabled
          hint="URL нельзя изменить после создания."
        />
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          Сохранить
        </Button>
      </div>

      {/* ── Billing & Plan ───────────────────────────────────────────────── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Тариф и оплата</h2>

        {/* Verification banner */}
        {isVerifying && verifyLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: 'var(--color-accent-subtle)',
              borderRadius: 8,
              marginBottom: 14,
              fontSize: 13,
            }}
          >
            <Spinner size="sm" />
            <span>Проверяем статус платежа…</span>
          </div>
        )}

        {verifyResult?.status === 'succeeded' && (
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--color-success-subtle, rgba(16,185,129,0.08))',
              border: '1px solid var(--color-success, #10B981)',
              borderRadius: 8,
              marginBottom: 14,
              fontSize: 13,
              color: 'var(--color-success, #10B981)',
            }}
          >
            ✅ Оплата прошла успешно! Тариф обновлён до{' '}
            <strong>
              {PLAN_LABELS[verifyResult.plan as keyof typeof PLAN_LABELS] ?? verifyResult.plan}
            </strong>
            .
          </div>
        )}

        {verifyResult?.status === 'canceled' && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid var(--color-danger)',
              borderRadius: 8,
              marginBottom: 14,
              fontSize: 13,
              color: 'var(--color-danger)',
            }}
          >
            ❌ Платёж отменён. Тариф не изменён.
          </div>
        )}

        <div className={styles.planCard}>
          {/* Current plan */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Текущий тариф</p>
            <Badge variant={planBadge}>{planLabel}</Badge>
          </div>

          {/* Upgrade options — FREE plan only */}
          {currentPlan === 'FREE' && !isVerifying && (
            <>
              <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 10 }}>
                Неограниченные проекты, пользователи и задачи.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button
                  variant="primary"
                  size="sm"
                  loading={checkoutMutation.isPending && checkoutPlan === 'PRO'}
                  onClick={() => handleUpgrade('PRO')}
                >
                  Перейти на Pro — 1 990 ₽/мес
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  loading={checkoutMutation.isPending && checkoutPlan === 'ENTERPRISE'}
                  onClick={() => handleUpgrade('ENTERPRISE')}
                >
                  Перейти на Enterprise — 9 990 ₽/мес
                </Button>
              </div>
            </>
          )}

          {/* Paid plan — no portal available */}
          {currentPlan !== 'FREE' && (
            <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 8 }}>
              Для управления подпиской или отмены обратитесь в поддержку.
            </p>
          )}

          {checkoutError && (
            <p style={{ color: 'var(--color-danger)', fontSize: 12, marginTop: 10 }}>
              {checkoutError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantSettingsPage;

// apps/web/src/features/members/MembersPage.tsx
// Team members table with invite (ADMIN) and remove functionality.

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/users.api';
import { useAuthStore } from '../../stores/auth.store';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { ROLE_LABELS } from '../../lib/constants';
import { Plus, Users, Trash2 } from 'lucide-react';
import { fmtDistance } from '../../lib/locale';
import { useT } from '../../lib/i18n';
import styles from './MembersPage.module.css';

const MembersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const t = useT();
  const isAdmin = user?.role === 'ADMIN';
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('DEVELOPER');
  const [inviteResult, setInviteResult] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [error, setError] = useState('');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    staleTime: 120_000,
  });

  const inviteMutation = useMutation({
    mutationFn: () => usersApi.invite({ email: inviteEmail.trim(), role: inviteRole }),
    onSuccess: (r) => {
      setInviteResult({ email: r.email, temporaryPassword: r.temporaryPassword });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setInviteEmail(''); setInviteRole('DEVELOPER'); setError('');
    },
    onError: () => setError(t.members.inviteError),
  });

  const removeMutation = useMutation({
    mutationFn: usersApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t.members.title} <span className={styles.count}>({members.length})</span></h1>
        {isAdmin && (
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setInviteOpen(true)}>
            {t.members.invite}
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <EmptyState icon={<Users size={36} />} title={t.members.noMembers} />
      ) : (
        <table className={styles.table} aria-label={t.members.title}>
          <thead>
            <tr>
              <th>{t.members.member}</th><th>{t.members.role}</th><th>{t.members.joined}</th>{isAdmin && <th />}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>
                  <div className={styles.memberCell}>
                    <Avatar name={m.fullName} src={m.avatarUrl} size="sm" />
                    <div>
                      <div className={styles.memberName}>{m.fullName}</div>
                      <div className={styles.memberEmail}>{m.email}</div>
                    </div>
                  </div>
                </td>
                <td><Badge>{ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role}</Badge></td>
                <td className={styles.muted}>{m.createdAt ? fmtDistance(m.createdAt) : '—'}</td>
                {isAdmin && (
                  <td>
                    {m.id !== user?.id && (
                      <Button
                        variant="dangerGhost"
                        size="sm"
                        icon={<Trash2 size={13} />}
                        loading={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(m.id)}
                        aria-label={`Remove ${m.fullName}`}
                      />
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Invite Modal */}
      <Modal open={inviteOpen} onClose={() => { setInviteOpen(false); setInviteResult(null); setError(''); }} title={t.members.inviteTitle} size="sm">
        {inviteResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13 }}>✅ <strong>{inviteResult.email}</strong> {t.members.inviteSuccess}</p>
            <div style={{ background: 'var(--color-surface)', borderRadius: 6, padding: '10px 14px', fontFamily: 'monospace', fontSize: 13 }}>
              {t.members.tempPassword} <strong>{inviteResult.temporaryPassword}</strong>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t.members.tempPasswordHint}</p>
            <Button variant="primary" size="sm" onClick={() => { setInviteOpen(false); setInviteResult(null); }}>{t.members.done}</Button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <p style={{ color: 'var(--color-danger)', fontSize: 12 }}>{error}</p>}
            <Input label="Email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" autoFocus required />
            <Select label={t.members.role} value={inviteRole} onChange={setInviteRole} options={[
              { value: 'VIEWER', label: 'Viewer' },
              { value: 'DEVELOPER', label: 'Developer' },
              { value: 'PROJECT_MANAGER', label: 'Project Manager' },
              { value: 'ADMIN', label: 'Admin' },
            ]} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>{t.members.cancel}</Button>
              <Button type="submit" variant="primary" loading={inviteMutation.isPending}>{t.members.sendInvite}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default MembersPage;

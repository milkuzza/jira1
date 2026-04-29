// apps/web/src/features/settings/ProfilePage.tsx
// User profile: name, email, avatar upload, password change.

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/users.api';
import { useAuthStore } from '../../stores/auth.store';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { useT } from '../../lib/i18n';
import styles from './SettingsPage.module.css';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const t = useT();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const updateMutation = useMutation({
    mutationFn: (dto: Parameters<typeof usersApi.updateMe>[0]) => usersApi.updateMe(dto),
    onSuccess: (u) => {
      updateUser({ fullName: u.fullName, avatarUrl: u.avatarUrl, email: u.email });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setSuccess(t.profile.profileUpdated);
      setTimeout(() => setSuccess(''), 3000);
      setCurrentPassword(''); setNewPassword('');
    },
    onError: () => setError(t.profile.updateFailed),
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const { avatarUrl } = await usersApi.uploadAvatar(file);
      updateUser({ avatarUrl });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const dto: Parameters<typeof usersApi.updateMe>[0] = { fullName: fullName.trim() };
    // Include email if changed
    if (email.trim() && email.trim() !== user?.email) {
      dto.email = email.trim();
    }
    if (newPassword) {
      if (!currentPassword) { setError(t.profile.enterCurrentPassword); return; }
      dto.currentPassword = currentPassword;
      dto.newPassword = newPassword;
    }
    updateMutation.mutate(dto);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t.profile.title}</h1>

      {/* Avatar */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.profile.avatar}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={user?.fullName ?? 'U'} src={user?.avatarUrl} size="lg" />
          <label className={styles.uploadBtn}>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) avatarMutation.mutate(f); }}
              aria-label="Upload avatar"
            />
            {avatarMutation.isPending ? t.profile.uploading : t.profile.changePhoto}
          </label>
          {avatarMutation.isError && <span style={{ color: 'var(--color-danger)', fontSize: 12 }}>{t.profile.uploadFailed}</span>}
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSubmit} className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.profile.personalInfo}</h2>
        {success && <p style={{ color: 'var(--color-success)', fontSize: 12 }}>{success}</p>}
        {error  && <p style={{ color: 'var(--color-danger)',  fontSize: 12 }}>{error}</p>}
        <Input label={t.profile.fullName} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint={t.profile.emailHint}
        />
        <h2 className={styles.sectionTitle} style={{ marginTop: 16 }}>{t.profile.changePassword}</h2>
        <Input
          label={t.profile.currentPassword}
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder={t.profile.keepUnchanged}
        />
        <Input
          label={t.profile.newPassword}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={t.profile.minChars}
        />
        <Button type="submit" variant="primary" size="sm" loading={updateMutation.isPending}>
          {t.profile.saveChanges}
        </Button>
      </form>
    </div>
  );
};

export default ProfilePage;

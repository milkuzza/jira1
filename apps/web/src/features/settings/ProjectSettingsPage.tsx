// apps/web/src/features/settings/ProjectSettingsPage.tsx
// Per-project settings: name, key, description, danger zone delete.

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects.api';
import { useT } from '../../lib/i18n';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import styles from './SettingsPage.module.css';

const ProjectSettingsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useT();
  const [confirmDelete, setConfirmDelete] = useState('');

  const { data: projects, isLoading } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list, staleTime: 60_000 });
  const project = projects?.find((p) => p.id === projectId);

  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [success, setSuccess] = useState('');

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects', { replace: true });
    },
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size="lg" /></div>;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t.projectSettings.title}</h1>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.projectSettings.general}</h2>
        {success && <p style={{ color: 'var(--color-success)', fontSize: 12 }}>{success}</p>}
        <Input label={t.projectSettings.name} value={name} onChange={(e) => setName(e.target.value)} />
        <Input label={t.projectSettings.keyLabel} value={project?.key ?? ''} disabled hint={t.projectSettings.keyHint} />
        <Input label={t.projectSettings.description} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Button variant="primary" size="sm" onClick={() => { setSuccess(t.projectSettings.saved); setTimeout(() => setSuccess(''), 2000); }}>{t.projectSettings.save}</Button>
      </div>

      <div className={styles.section} style={{ borderColor: 'var(--color-danger)' }}>
        <h2 className={styles.sectionTitle} style={{ color: 'var(--color-danger)' }}>{t.projectSettings.dangerZone}</h2>
        <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 12 }}>
          {t.projectSettings.deleteHint(project?.name ?? '')}
        </p>
        <Input
          label={t.projectSettings.confirmLabel}
          value={confirmDelete}
          onChange={(e) => setConfirmDelete(e.target.value)}
          placeholder={project?.name}
        />
        <Button
          variant="danger"
          size="sm"
          disabled={confirmDelete !== project?.name}
          loading={deleteMutation.isPending}
          onClick={() => deleteMutation.mutate()}
        >
          {t.projectSettings.deleteBtn}
        </Button>
      </div>
    </div>
  );
};

export default ProjectSettingsPage;

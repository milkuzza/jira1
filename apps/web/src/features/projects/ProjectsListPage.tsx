// apps/web/src/features/projects/ProjectsListPage.tsx
// Shows grid of project cards or empty state with create button.
// Delete button (ADMIN only) is revealed on hover in the top-right corner.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects.api';
import { useAuthStore } from '../../stores/auth.store';
import { CreateProjectModal } from './CreateProjectModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { useT } from '../../lib/i18n';
import { FolderOpen, Plus, Kanban, Trash2 } from 'lucide-react';
import styles from './ProjectsListPage.module.css';

const ProjectsListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const t = useT();
  const [createOpen, setCreateOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (projectId: string) => projectsApi.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleDelete = (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm(t.projects.deleteConfirm(projectName))) {
      deleteMutation.mutate(projectId);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t.projects.title}</h1>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => setCreateOpen(true)}
        >
          {t.projects.newProject}
        </Button>
      </div>

      {!projects?.length ? (
        <EmptyState
          icon={<FolderOpen size={40} />}
          title={t.projects.noProjects}
          description={t.projects.noProjectsDesc}
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setCreateOpen(true)}
            >
              {t.projects.createFirst}
            </Button>
          }
        />
      ) : (
        <div className={styles.grid}>
          {projects.map((p) => (
            <div
              key={p.id}
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Project card */}
              <button
                className={styles.card}
                style={{ width: '100%' }}
                onClick={() => navigate(`/projects/${p.id}/board`)}
                aria-label={`Открыть проект ${p.name}`}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.cardKey}>{p.key}</span>
                  <span className={styles.cardBoardType}>
                    <Kanban size={11} /> {p.boardType}
                  </span>
                </div>
                <h2 className={styles.cardName}>{p.name}</h2>
                {p.description && (
                  <p className={styles.cardDesc}>{p.description}</p>
                )}
              </button>

              {/* Delete button — ADMIN only, shown on hover */}
              {isAdmin && (
                <button
                  onClick={(e) => handleDelete(e, p.id, p.name)}
                  disabled={deleteMutation.isPending}
                  aria-label={t.projects.deleteConfirm(p.name)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 2,
                    background: hoveredId === p.id
                      ? 'rgba(239, 68, 68, 0.12)'
                      : 'var(--color-surface)',
                    border: '1px solid',
                    borderColor: hoveredId === p.id
                      ? 'rgba(239, 68, 68, 0.3)'
                      : 'var(--color-border)',
                    borderRadius: 6,
                    cursor: deleteMutation.isPending ? 'wait' : 'pointer',
                    color: hoveredId === p.id
                      ? 'rgb(239, 68, 68)'
                      : 'var(--color-muted)',
                    padding: '4px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: hoveredId === p.id ? 1 : 0,
                    transition: 'opacity 0.15s, color 0.15s, background 0.15s, border-color 0.15s',
                    pointerEvents: hoveredId === p.id ? 'auto' : 'none',
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
};

export default ProjectsListPage;

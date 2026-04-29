// apps/web/src/features/board/BoardPage.tsx
// Board route page: loads project board data, shows sprint bar + KanbanBoard.

import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects.api';
import { KanbanBoard } from './KanbanBoard';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Kanban } from 'lucide-react';
import { useT } from '../../lib/i18n';

const BoardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useT();

  const { data: columns, isLoading, isError } = useQuery({
    queryKey: ['board', projectId],
    queryFn: () => projectsApi.getBoard(projectId!),
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const { data: sprints = [] } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => projectsApi.getSprints(projectId!),
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const activeSprint = sprints.find((s) => s.status === 'ACTIVE');

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !columns) {
    return (
      <EmptyState
        icon={<Kanban size={40} />}
        title={t.board.unavailable}
        description={t.board.unavailableDesc}
      />
    );
  }

  // Normalize: API may return [] directly OR {data: [...]} or {columns: [...]}
  const rawData = columns as unknown;
  const normalizedColumns: import('../../api/projects.api').BoardColumnDto[] =
    Array.isArray(rawData)
      ? rawData
      : Array.isArray((rawData as { data?: unknown })?.data)
        ? (rawData as { data: import('../../api/projects.api').BoardColumnDto[] }).data
        : Array.isArray((rawData as { columns?: unknown })?.columns)
          ? (rawData as { columns: import('../../api/projects.api').BoardColumnDto[] }).columns
          : [];

  return (
    <div>
      {/* Sprint bar */}
      {activeSprint && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          fontSize: 12,
        }}>
          <span style={{ fontWeight: 600 }}>{activeSprint.name}</span>
          {activeSprint.goal && (
            <span style={{ color: 'var(--color-muted)' }}>· {activeSprint.goal}</span>
          )}
          {activeSprint.startDate && activeSprint.endDate && (
            <span style={{ color: 'var(--color-muted)', marginLeft: 'auto' }}>
              {new Date(activeSprint.startDate).toLocaleDateString()} –{' '}
              {new Date(activeSprint.endDate).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      <KanbanBoard columns={normalizedColumns} projectId={projectId!} />
    </div>
  );
};

export default BoardPage;

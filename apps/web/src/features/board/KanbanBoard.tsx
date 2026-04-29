// apps/web/src/features/board/KanbanBoard.tsx
// DndContext wrapping all columns + DragOverlay.

import React, { useMemo, useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { KanbanColumn } from './KanbanColumn';
import { IssueCard } from './IssueCard';
import { IssueDetailDrawer } from './IssueDetailDrawer';
import { BoardViewers } from './BoardViewers';
import { useBoardDnd } from './useBoardDnd';
import { useProjectSocket } from '../../hooks/useProjectSocket';
import { projectsApi } from '../../api/projects.api';
import type { BoardColumnDto } from '../../api/projects.api';
import { useT } from '../../lib/i18n';
import { Plus } from 'lucide-react';
import styles from './KanbanBoard.module.css';

interface KanbanBoardProps {
  columns: BoardColumnDto[];
  projectId: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ columns, projectId }) => {
  const t = useT();
  const { sensors, onDragStart, onDragOver, onDragEnd, activeIssue } = useBoardDnd(projectId);
  const { viewers } = useProjectSocket(projectId);
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const issueParam = searchParams.get('issue');
    if (issueParam) {
      setOpenIssueId(issueParam);
      // Clear the param from URL so back-navigation works cleanly
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const queryClient = useQueryClient();
  const addColMutation = useMutation({
    mutationFn: (name: string) => projectsApi.createColumn(projectId, { name, color: '#6B7280' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['board', projectId] })
  });

  // Defensive guard: ensure columns is always iterable
  const sortedColumns = useMemo(
    () => (Array.isArray(columns) ? [...columns] : []).sort((a, b) => a.order - b.order),
    [columns],
  );

  return (
    <>
      {/* Board viewers bar */}
      {viewers.length > 0 && (
        <div className={styles.viewerBar}>
          <BoardViewers viewers={viewers} />
          <span className={styles.viewerLabel}>
            {t.board.viewing(viewers.length)}
          </span>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className={styles.board} role="region" aria-label={t.board.ariaLabel}>
          {sortedColumns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              projectId={projectId}
              onIssueClick={setOpenIssueId}
            />
          ))}
          <div style={{ flexShrink: 0, width: 300, padding: 8 }}>
            <button
              onClick={() => {
                const name = prompt(t.board.newColumnPrompt);
                if (name && name.trim()) addColMutation.mutate(name.trim());
              }}
              style={{
                width: '100%', padding: '12px', background: 'var(--color-surface)',
                border: '1px dashed var(--color-border)', borderRadius: 6,
                color: 'var(--color-text)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13
              }}
            >
              <Plus size={14} /> {t.board.addColumn}
            </button>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeIssue && (
            <IssueCard issue={activeIssue.issue} onOpen={() => undefined} isDragOverlay />
          )}
        </DragOverlay>
      </DndContext>

      <IssueDetailDrawer
        issueId={openIssueId}
        projectId={projectId}
        onClose={() => setOpenIssueId(null)}
      />
    </>
  );
};

// apps/web/src/features/kanban/KanbanBoard.tsx
// Main Kanban board container — DnD context, WebSocket via hook, project selector, presence.
// State: selectedProjectId, selectedIssueId (for drawer), activeIssue (drag overlay)

import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useBoard, useProjects } from '../../api/hooks';
import { useBoardDnd } from './useBoardDnd';
import { useProjectSocket } from '../../hooks/useProjectSocket';
import { KanbanColumn } from './KanbanColumn';
import { IssueCard } from './IssueCard';
import { IssueDetailDrawer } from './IssueDetailDrawer';
import { BoardViewers } from './BoardViewers';
import { NotificationBell } from '../notifications/NotificationBell';
import './kanban.css';

export const KanbanBoard: React.FC = () => {
  const [projectId, setProjectId] = useState<string>('');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const { data: projects } = useProjects();
  const { data: board, isLoading } = useBoard(projectId);
  const { activeIssue, handleDragStart, handleDragEnd } = useBoardDnd(projectId);
  const { viewers } = useProjectSocket(projectId);

  // Auto-select first project
  useEffect(() => {
    if (projects && projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleIssueClick = useCallback((issueId: string) => {
    setSelectedIssueId(issueId);
  }, []);

  return (
    <>
      <header className="app-header">
        <div className="app-header-logo">TaskFlow</div>
        {projects && projects.length > 0 && (
          <select
            className="app-header-project-select"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.key} — {p.name}
              </option>
            ))}
          </select>
        )}
        <BoardViewers viewers={viewers} />
        <NotificationBell />
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {isLoading && (
            <p style={{ color: 'rgba(255,255,255,0.5)', padding: 40 }}>Loading board…</p>
          )}

          {board?.columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onIssueClick={handleIssueClick}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeIssue ? (
            <div className="drag-overlay">
              <IssueCard
                issue={activeIssue}
                columnId=""
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedIssueId && (
        <IssueDetailDrawer
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
        />
      )}
    </>
  );
};

// apps/web/src/features/board/KanbanColumn.tsx
// Droppable column with issue list, counter, and inline add form.

import React, { useState, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IssueCard } from './IssueCard';
import { projectsApi } from '../../api/projects.api';
import { issuesApi } from '../../api/issues.api';
import type { BoardColumnDto } from '../../api/projects.api';
import { Plus, Trash2 } from 'lucide-react';
import { useT } from '../../lib/i18n';
import styles from './KanbanColumn.module.css';

interface KanbanColumnProps {
  column: BoardColumnDto;
  projectId: string;
  onIssueClick: (id: string) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, projectId, onIssueClick }) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });
  const queryClient = useQueryClient();
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(column.name);

  const issueIds = useMemo(() => column.issues.map((i) => i.id), [column.issues]);

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      issuesApi.create(projectId, { title, status: column.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
      setNewTitle('');
      setAdding(false);
    },
  });

  const updateColMutation = useMutation({
    mutationFn: (data: { name?: string; color?: string }) =>
      projectsApi.updateColumn(column.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
    },
  });

  const deleteColMutation = useMutation({
    mutationFn: () => projectsApi.deleteColumn(column.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) { setAdding(false); return; }
    createMutation.mutate(newTitle.trim());
  };

  return (
    <div className={[styles.column, isOver ? styles.over : ''].filter(Boolean).join(' ')}>
      {/* Column header */}
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <span className={styles.dot} style={{ background: column.color }} aria-hidden />
          {editingName ? (
            <input
              autoFocus
              className={styles.nameInput}
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 4, padding: '2px 4px', fontSize: 13, flex: 1 }}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={() => {
                if (nameValue.trim() && nameValue.trim() !== column.name) {
                  updateColMutation.mutate({ name: nameValue.trim() });
                }
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                } else if (e.key === 'Escape') {
                  setNameValue(column.name);
                  setEditingName(false);
                }
              }}
            />
          ) : (
            <span
              className={styles.name}
              onClick={(e) => { e.stopPropagation(); setEditingName(true); }}
              style={{ cursor: 'pointer', ...(!column.name ? { color: 'var(--color-muted)' } : {}) }}
              title={t.column.clickToRename}
            >
              {column.name || t.column.noName}
            </span>
          )}
          <span className={styles.count} aria-label={`${column.issues.length} ${t.column.addIssue}`}>
            {column.issues.length}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(t.column.deleteConfirm(column.name))) {
              deleteColMutation.mutate();
            }
          }}
          style={{ background: 'transparent', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', padding: 4 }}
          title={t.column.deleteColumn}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Issue list */}
      <div ref={setNodeRef} className={styles.issues} role="list" aria-label={`${t.column.addIssue}: ${column.name}`}>
        <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
          {column.issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onOpen={onIssueClick} />
          ))}
        </SortableContext>
      </div>

      {/* Inline add form */}
      {adding ? (
        <form onSubmit={handleAddSubmit} className={styles.addForm}>
          <input
            className={styles.addInput}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t.column.issueTitlePlaceholder}
            autoFocus
            aria-label="Название новой задачи"
            onKeyDown={(e) => { if (e.key === 'Escape') setAdding(false); }}
          />
          <div className={styles.addActions}>
            <button type="submit" className={styles.addConfirm} disabled={!newTitle.trim()}>
              {t.column.add}
            </button>
            <button type="button" className={styles.addCancel} onClick={() => setAdding(false)}>
              {t.column.cancel}
            </button>
          </div>
        </form>
      ) : (
        <button className={styles.addBtn} onClick={() => setAdding(true)} aria-label={`${t.column.addIssue} ${column.name}`}>
          <Plus size={13} aria-hidden /> {t.column.addIssue}
        </button>
      )}
    </div>
  );
};

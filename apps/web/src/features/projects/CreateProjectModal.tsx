// apps/web/src/features/projects/CreateProjectModal.tsx
// Modal to create a new project: name, key, description, board type.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects.api';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';

interface Props { open: boolean; onClose: () => void; }

function toKey(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'PROJ';
}

export const CreateProjectModal: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [boardType, setBoardType] = useState('KANBAN');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => projectsApi.create({ name: name.trim(), key: key.trim(), description: description.trim(), boardType: boardType as 'KANBAN' | 'SCRUM' }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/projects/${project.id}/board`);
      onClose();
      setName(''); setKey(''); setDescription(''); setBoardType('KANBAN');
    },
    onError: () => setErrors({ submit: 'Failed to create project.' }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Required';
    if (!key.trim())  errs.key  = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length === 0) mutation.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create project" size="sm">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {errors.submit && <p style={{ color: 'var(--color-danger)', fontSize: 12 }}>{errors.submit}</p>}

        <Input
          label="Project name"
          value={name}
          onChange={(e) => { setName(e.target.value); setKey(toKey(e.target.value)); }}
          placeholder="My Project"
          autoFocus
          error={errors.name}
        />
        <Input
          label="Key (e.g. PROJ)"
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="PROJ"
          error={errors.key}
        />
        <Input
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project about?"
        />
        <Select
          label="Board type"
          value={boardType}
          onChange={setBoardType}
          options={[{ value: 'KANBAN', label: 'Kanban' }, { value: 'SCRUM', label: 'Scrum' }]}
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={mutation.isPending}>Create</Button>
        </div>
      </form>
    </Modal>
  );
};

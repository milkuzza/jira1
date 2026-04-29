// apps/web/src/features/layout/Sidebar.tsx
// Fixed left sidebar: logo, projects nav, team links, new project, user section.

import React, { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects.api';
import { useAuthStore } from '../../stores/auth.store';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { CreateProjectModal } from '../projects/CreateProjectModal';
import { useT } from '../../lib/i18n';
import {
  Layers, Kanban, List, Users, Settings, User,
  Plus, ChevronDown, ChevronRight, LogOut,
} from 'lucide-react';
import styles from './Sidebar.module.css';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId?: string }>();
  const { user, tenant, clearAuth } = useAuthStore();
  const t = useT();
  const [expandedProject, setExpandedProject] = useState<string | null>(projectId ?? null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
    staleTime: 60_000,
  });

  const handleLogout = () => { clearAuth(); navigate('/login', { replace: true }); };

  return (
    <>
      <aside className={styles.sidebar}>
        {/* Logo / tenant */}
        <div className={styles.logo}>
          <Layers size={18} color="var(--color-accent)" />
          <span className={styles.tenantName}>{tenant?.name ?? 'TaskManager'}</span>
        </div>

        <nav className={styles.nav} aria-label="Main navigation">
          {/* Projects */}
          <p className={styles.sectionLabel}>{t.sidebar.projects}</p>
          {projects.map((p) => {
            const isExpanded = expandedProject === p.id;
            return (
              <div key={p.id}>
                <button
                  className={styles.projectBtn}
                  onClick={() => {
                    setExpandedProject(isExpanded ? null : p.id);
                    navigate(`/projects/${p.id}/board`);
                  }}
                  aria-expanded={isExpanded}
                >
                  <span className={styles.projectKey}>{p.key}</span>
                  <span className={styles.projectName}>{p.name}</span>
                  {isExpanded
                    ? <ChevronDown size={13} className={styles.chevron} />
                    : <ChevronRight size={13} className={styles.chevron} />}
                </button>

                {isExpanded && (
                  <div className={styles.subNav}>
                    <NavLink to={`/projects/${p.id}/board`} className={({ isActive }) => [styles.subLink, isActive ? styles.subLinkActive : ''].join(' ')}>
                      <Kanban size={13} /> {t.sidebar.board}
                    </NavLink>
                    <NavLink to={`/projects/${p.id}/backlog`} className={({ isActive }) => [styles.subLink, isActive ? styles.subLinkActive : ''].join(' ')}>
                      <List size={13} /> {t.sidebar.backlog}
                    </NavLink>
                  </div>
                )}
              </div>
            );
          })}

          <Button
            variant="ghost"
            size="sm"
            icon={<Plus size={13} />}
            style={{ width: '100%', justifyContent: 'flex-start', marginTop: 4, color: 'var(--color-muted)', fontSize: 12 }}
            onClick={() => setCreateOpen(true)}
          >
            {t.sidebar.newProject}
          </Button>

          {/* Team */}
          <p className={styles.sectionLabel} style={{ marginTop: 16 }}>{t.sidebar.team}</p>
          <NavLink to="/members" className={({ isActive }) => [styles.navLink, isActive ? styles.navLinkActive : ''].join(' ')}>
            <Users size={14} /> {t.sidebar.members}
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => [styles.navLink, isActive ? styles.navLinkActive : ''].join(' ')}>
            <Settings size={14} /> {t.sidebar.settings}
          </NavLink>
        </nav>

        {/* User section */}
        <div className={styles.userSection}>
          <NavLink to="/profile" className={styles.userLink}>
            <Avatar name={user?.fullName ?? 'User'} src={user?.avatarUrl} size="sm" />
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.fullName ?? '—'}</span>
              <span className={styles.userRole}>{user?.role}</span>
            </div>
          </NavLink>
          <button className={styles.logoutBtn} onClick={handleLogout} aria-label="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
};

// apps/web/src/lib/router.tsx
// App router — lazy-loaded routes per feature, ProtectedRoute wrapper.

import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../features/layout/ProtectedRoute';
import { AppLayout } from '../features/layout/AppLayout';
import { Spinner } from '../components/ui/Spinner';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

const LoadingFallback = () => (
  <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
    <Spinner size="lg" />
  </div>
);

const wrap = (Component: React.ComponentType) => (
  <Suspense fallback={<LoadingFallback />}>
    <Component />
  </Suspense>
);

// ─── Lazy pages ───────────────────────────────────────────────────────────────
const LandingPage         = lazy(() => import('../features/landing/LandingPage'));
const LoginPage           = lazy(() => import('../features/auth/LoginPage'));
const RegisterOrgPage     = lazy(() => import('../features/auth/RegisterOrgPage'));
const ProjectsListPage    = lazy(() => import('../features/projects/ProjectsListPage'));
const BoardPage           = lazy(() => import('../features/board/BoardPage'));
const BacklogPage         = lazy(() => import('../features/backlog/BacklogPage'));
const MembersPage         = lazy(() => import('../features/members/MembersPage'));
const ProfilePage         = lazy(() => import('../features/settings/ProfilePage'));
const TenantSettingsPage  = lazy(() => import('../features/settings/TenantSettingsPage'));
const ProjectSettingsPage = lazy(() => import('../features/settings/ProjectSettingsPage'));

export const router = createBrowserRouter([
  { path: '/',         element: wrap(LandingPage) },
  { path: '/login',    element: wrap(LoginPage) },
  { path: '/register', element: wrap(RegisterOrgPage) },
  {
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <AppLayout />
        </ErrorBoundary>
      </ProtectedRoute>
    ),
    children: [
      { path: '/projects',                         element: wrap(ProjectsListPage) },
      { path: '/projects/:projectId/board',        element: wrap(BoardPage) },
      { path: '/projects/:projectId/backlog',      element: wrap(BacklogPage) },
      { path: '/projects/:projectId/settings',     element: wrap(ProjectSettingsPage) },
      { path: '/members',                          element: wrap(MembersPage) },
      { path: '/profile',                          element: wrap(ProfilePage) },
      { path: '/settings',                         element: wrap(TenantSettingsPage) },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

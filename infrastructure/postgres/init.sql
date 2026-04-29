-- ============================================================
-- TaskHub SaaS — Database Schema (Iteration 1)
-- PostgreSQL 16
-- ============================================================

-- ─── Extensions ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Enum Types ──────────────────────────────────

CREATE TYPE plan_type AS ENUM ('FREE', 'BASIC', 'PRO', 'ENTERPRISE');
CREATE TYPE user_role AS ENUM ('ADMIN', 'PROJECT_MANAGER', 'DEVELOPER', 'VIEWER');
CREATE TYPE board_type AS ENUM ('KANBAN', 'SCRUM');
CREATE TYPE sprint_status AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED');
CREATE TYPE issue_priority AS ENUM ('LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST');
CREATE TYPE notification_type AS ENUM ('ISSUE_ASSIGNED', 'ISSUE_UPDATED', 'COMMENT_ADDED', 'MENTION', 'SPRINT_STARTED', 'SPRINT_COMPLETED', 'ISSUE_DELETED');

-- ─── Tables ──────────────────────────────────────

-- Tenants (organizations)
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(63)  NOT NULL UNIQUE,
    plan        plan_type    NOT NULL DEFAULT 'FREE',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE tenants IS 'Organizations / workspaces. Each tenant is fully isolated via RLS.';

-- Users
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL DEFAULT '',
    role          user_role    NOT NULL DEFAULT 'DEVELOPER',
    avatar_url    VARCHAR(512),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);
COMMENT ON TABLE users IS 'User accounts scoped to a tenant.';

-- Projects
CREATE TABLE projects (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    key         VARCHAR(10)  NOT NULL,
    description TEXT,
    board_type  board_type   NOT NULL DEFAULT 'KANBAN',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, key)
);
COMMENT ON TABLE projects IS 'Projects within a tenant workspace.';

-- Board Columns
CREATE TABLE board_columns (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    "order"     INT          NOT NULL DEFAULT 0,
    color       VARCHAR(7)   NOT NULL DEFAULT '#6B7280',
    status_key  VARCHAR(100) NOT NULL DEFAULT ''
);
COMMENT ON TABLE board_columns IS 'Columns on the Kanban / Scrum board.';

-- Sprints
CREATE TABLE sprints (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(255)  NOT NULL,
    goal        TEXT,
    start_date  DATE,
    end_date    DATE,
    status      sprint_status NOT NULL DEFAULT 'PLANNED',
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE sprints IS 'Time-boxed iterations within a project.';

-- Issues (tasks / stories / bugs)
CREATE TABLE issues (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id      UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id     UUID           NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sprint_id      UUID           REFERENCES sprints(id) ON DELETE SET NULL,
    parent_id      UUID           REFERENCES issues(id) ON DELETE SET NULL,
    title          VARCHAR(500)   NOT NULL,
    description    TEXT,
    status         VARCHAR(100)   NOT NULL DEFAULT 'BACKLOG',
    priority       issue_priority NOT NULL DEFAULT 'MEDIUM',
    assignee_id    UUID           REFERENCES users(id) ON DELETE SET NULL,
    reporter_id    UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    story_points   INT,
    due_date       DATE,
    "order"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    search_vector  TSVECTOR,
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE issues IS 'Core work items: tasks, stories, bugs, sub-tasks.';

-- Issue Comments
CREATE TABLE issue_comments (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id   UUID        NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE issue_comments IS 'Comments on issues.';

-- Issue Attachments
CREATE TABLE issue_attachments (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id   UUID         NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename   VARCHAR(255) NOT NULL,
    url        VARCHAR(512) NOT NULL,
    size       BIGINT       NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE issue_attachments IS 'File attachments on issues, stored in MinIO/S3.';

-- Issue Changelog
CREATE TABLE issue_changelog (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id   UUID         NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    field      VARCHAR(100) NOT NULL,
    old_value  TEXT,
    new_value  TEXT,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE issue_changelog IS 'Audit trail of field changes on issues.';

-- Labels
CREATE TABLE labels (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name      VARCHAR(100) NOT NULL,
    color     VARCHAR(7)   NOT NULL DEFAULT '#3B82F6'
);
COMMENT ON TABLE labels IS 'Colored labels for categorizing issues.';

-- Issue ↔ Labels (many-to-many)
CREATE TABLE issue_labels (
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (issue_id, label_id)
);
COMMENT ON TABLE issue_labels IS 'Many-to-many link between issues and labels.';

-- Notifications
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id  UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type       notification_type NOT NULL,
    payload    JSONB             NOT NULL DEFAULT '{}',
    read       BOOLEAN           NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE notifications IS 'In-app notifications for users.';

-- ─── Indexes ─────────────────────────────────────

CREATE INDEX idx_issues_tenant_project   ON issues (tenant_id, project_id);
CREATE INDEX idx_issues_assignee         ON issues (assignee_id);
CREATE INDEX idx_issues_sprint           ON issues (sprint_id);
CREATE INDEX idx_issues_search_vector    ON issues USING GIN (search_vector);
CREATE INDEX idx_users_tenant_email      ON users (tenant_id, email);
CREATE INDEX idx_notifications_user      ON notifications (user_id, read, created_at DESC);
CREATE INDEX idx_issue_comments_issue    ON issue_comments (issue_id, created_at);
CREATE INDEX idx_issue_changelog_issue   ON issue_changelog (issue_id, created_at);

-- ─── Full-Text Search Trigger ────────────────────

CREATE OR REPLACE FUNCTION issues_search_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        to_tsvector('russian', coalesce(NEW.title, ''))
        || to_tsvector('english', coalesce(NEW.title, ''))
        || to_tsvector('russian', coalesce(NEW.description, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issues_search_trigger
    BEFORE INSERT OR UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION issues_search_update();

-- ─── Row-Level Security ──────────────────────────

-- Helper: allow the application to set tenant context per transaction
-- Usage: SELECT set_config('app.tenant_id', '<uuid>', true);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_projects ON projects
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_issues ON issues
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_board_columns ON board_columns
    USING (project_id IN (
        SELECT id FROM projects WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
    ));

ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_sprints ON sprints
    USING (project_id IN (
        SELECT id FROM projects WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
    ));

ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_issue_comments ON issue_comments
    USING (issue_id IN (
        SELECT id FROM issues WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
    ));

ALTER TABLE issue_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_issue_attachments ON issue_attachments
    USING (issue_id IN (
        SELECT id FROM issues WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
    ));

ALTER TABLE issue_changelog ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_issue_changelog ON issue_changelog
    USING (issue_id IN (
        SELECT id FROM issues WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
    ));

ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_labels ON labels
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_notifications ON notifications
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── Grant privileges to app user ────────────────
-- (The postgres superuser bypasses RLS; the app should connect
--  as a non-superuser for RLS to take effect in production.)

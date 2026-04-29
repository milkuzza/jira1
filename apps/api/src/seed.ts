// apps/api/src/seed.ts
// Seed script — populates the database with demo data.
// Run: npm run seed

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  TenantEntity,
  UserEntity,
  ProjectEntity,
  BoardColumnEntity,
  SprintEntity,
  IssueEntity,
  IssueCommentEntity,
  IssueAttachmentEntity,
  IssueChangelogEntity,
  LabelEntity,
  NotificationEntity,
} from './entities';
import { BCRYPT_SALT_ROUNDS, DEFAULT_BOARD_COLUMNS, SET_TENANT_QUERY } from './constants';
import { Logger } from '@nestjs/common';

const logger = new Logger('Seed');

// ─── DataSource for direct connection ───────────
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env['POSTGRES_HOST'] ?? 'localhost',
  port: parseInt(process.env['POSTGRES_PORT'] ?? '5432', 10),
  username: process.env['POSTGRES_USER'] ?? 'jira_user',
  password: process.env['POSTGRES_PASSWORD'] ?? 'jira_secret_password',
  database: process.env['POSTGRES_DB'] ?? 'jira_db',
  entities: [
    TenantEntity,
    UserEntity,
    ProjectEntity,
    BoardColumnEntity,
    SprintEntity,
    IssueEntity,
    IssueCommentEntity,
    IssueAttachmentEntity,
    IssueChangelogEntity,
    LabelEntity,
    NotificationEntity,
  ],
  synchronize: false,
});

// ─── Seed Data ──────────────────────────────────
const USERS_DATA = [
  { email: 'admin@acme.com', fullName: 'Alice Admin', role: 'ADMIN' as const },
  { email: 'pm@acme.com', fullName: 'Peter Manager', role: 'PROJECT_MANAGER' as const },
  { email: 'dev1@acme.com', fullName: 'Diana Developer', role: 'DEVELOPER' as const },
  { email: 'dev2@acme.com', fullName: 'Dave Developer', role: 'DEVELOPER' as const },
  { email: 'viewer@acme.com', fullName: 'Victor Viewer', role: 'VIEWER' as const },
];

const PROJECTS_DATA = [
  { name: 'Platform', key: 'PLAT', description: 'Core platform development', boardType: 'SCRUM' as const },
  { name: 'Mobile App', key: 'MOB', description: 'Mobile application', boardType: 'KANBAN' as const },
];

const ISSUE_TITLES = [
  'Set up CI/CD pipeline',
  'Design database schema',
  'Implement user authentication',
  'Create project dashboard',
  'Add drag-and-drop to board',
  'Write API documentation',
  'Set up error monitoring',
  'Implement email notifications',
  'Optimize search performance',
  'Add dark mode support',
  'Fix login redirect bug',
  'Update onboarding flow',
  'Add file upload to issues',
  'Implement sprint planning view',
  'Create burndown chart',
  'Add Slack integration',
  'Improve mobile responsiveness',
  'Refactor state management',
  'Add keyboard shortcuts',
  'Write end-to-end tests',
];

const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;
const PRIORITIES = ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'] as const;

async function seed(): Promise<void> {
  await dataSource.initialize();
  logger.log('Connected to database');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    // Set RLS context (superuser bypasses RLS, but let's be explicit)
    // We'll set it after creating the tenant

    // ─── Create Tenant ───────────────────────────
    const tenantRepo = queryRunner.manager.getRepository(TenantEntity);
    const tenant = tenantRepo.create({
      name: 'Acme Corp',
      slug: 'acme',
      plan: 'PRO',
    });
    await tenantRepo.save(tenant);
    logger.log(`Created tenant: ${tenant.name} (${tenant.slug})`);

    // Set tenant context for RLS
    await queryRunner.query(SET_TENANT_QUERY, [tenant.id]);

    // ─── Create Users ────────────────────────────
    const userRepo = queryRunner.manager.getRepository(UserEntity);
    const passwordHash = await bcrypt.hash('password123', BCRYPT_SALT_ROUNDS);

    const users: UserEntity[] = [];
    for (const userData of USERS_DATA) {
      const user = userRepo.create({
        tenantId: tenant.id,
        email: userData.email,
        passwordHash,
        fullName: userData.fullName,
        role: userData.role,
      });
      const saved = await userRepo.save(user);
      users.push(saved);
      logger.log(`Created user: ${saved.fullName} (${saved.role})`);
    }

    // ─── Create Projects with Board Columns ──────
    const projectRepo = queryRunner.manager.getRepository(ProjectEntity);
    const columnRepo = queryRunner.manager.getRepository(BoardColumnEntity);

    const projects: ProjectEntity[] = [];
    for (const projData of PROJECTS_DATA) {
      const project = projectRepo.create({
        tenantId: tenant.id,
        name: projData.name,
        key: projData.key,
        description: projData.description,
        boardType: projData.boardType,
      });
      const savedProject = await projectRepo.save(project);
      projects.push(savedProject);
      logger.log(`Created project: ${savedProject.name} (${savedProject.key})`);

      // Create default board columns
      for (const colData of DEFAULT_BOARD_COLUMNS) {
        const column = columnRepo.create({
          projectId: savedProject.id,
          name: colData.name,
          order: colData.order,
          color: colData.color,
        });
        await columnRepo.save(column);
      }
      logger.log(`  Created ${DEFAULT_BOARD_COLUMNS.length} board columns`);
    }

    // ─── Create Sprint ───────────────────────────
    const sprintRepo = queryRunner.manager.getRepository(SprintEntity);
    const sprint = sprintRepo.create({
      projectId: projects[0].id,
      name: 'Sprint 1',
      goal: 'Set up project foundation and core features',
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
      status: 'ACTIVE',
    });
    const savedSprint = await sprintRepo.save(sprint);
    logger.log(`Created sprint: ${savedSprint.name} (${savedSprint.status})`);

    // ─── Create Issues ───────────────────────────
    const issueRepo = queryRunner.manager.getRepository(IssueEntity);
    const devUsers = users.filter((u) => u.role === 'DEVELOPER' || u.role === 'PROJECT_MANAGER');
    const reporter = users[0]; // Admin as default reporter

    for (let i = 0; i < ISSUE_TITLES.length; i++) {
      const projectIndex = i < 12 ? 0 : 1; // First 12 to PLAT, rest to MOB
      const assignee = devUsers[i % devUsers.length];

      const issue = issueRepo.create({
        tenantId: tenant.id,
        projectId: projects[projectIndex].id,
        sprintId: i < 8 ? savedSprint.id : null, // First 8 in sprint
        title: ISSUE_TITLES[i],
        description: `Description for: ${ISSUE_TITLES[i]}`,
        status: STATUSES[i % STATUSES.length],
        priority: PRIORITIES[i % PRIORITIES.length],
        assigneeId: assignee.id,
        reporterId: reporter.id,
        storyPoints: [1, 2, 3, 5, 8, 13][i % 6],
        order: (i + 1) * 1000,
      });
      await issueRepo.save(issue);
    }
    logger.log(`Created ${ISSUE_TITLES.length} issues`);

    await queryRunner.commitTransaction();
    logger.log('✅ Seed completed successfully');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    logger.error('❌ Seed failed, transaction rolled back');
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seed().catch((err) => {
  logger.error('Seed error:', err);
  process.exit(1);
});

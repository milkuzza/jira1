// apps/api/src/modules/issues/issues.service.spec.ts
// Unit tests for IssuesService — changelog tracking and order rebalancing.

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IssuesService } from './issues.service';
import { IssueEntity } from '../../entities/issue.entity';
import { IssueCommentEntity } from '../../entities/issue-comment.entity';
import { IssueAttachmentEntity } from '../../entities/issue-attachment.entity';
import { IssueChangelogEntity } from '../../entities/issue-changelog.entity';

// ─── Mocks ───────────────────────────────────────

const mockIssue: Partial<IssueEntity> = {
  id: 'issue-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  reporterId: 'user-1',
  title: 'Original Title',
  description: 'Original description',
  status: 'BACKLOG',
  priority: 'MEDIUM',
  assigneeId: null,
  sprintId: null,
  storyPoints: null,
  dueDate: null,
  order: 1.0,
};

const mockIssueRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((data: Record<string, unknown>) => ({ ...data })),
  save: jest.fn().mockImplementation((entity: Record<string, unknown>) => Promise.resolve({ ...entity })),
  remove: jest.fn(),
};

const mockCommentRepo = {
  create: jest.fn().mockImplementation((data: Record<string, unknown>) => ({ ...data })),
  save: jest.fn().mockImplementation((entity: Record<string, unknown>) => Promise.resolve({ ...entity, id: 'comment-1' })),
};

const mockAttachmentRepo = {};
const mockChangelogRepo = {
  find: jest.fn(),
};

const savedChangelogs: Record<string, unknown>[] = [];
const mockQueryRunnerManager = {
  save: jest.fn().mockImplementation((entityOrEntities: unknown) => {
    if (Array.isArray(entityOrEntities)) {
      savedChangelogs.push(...entityOrEntities);
    }
    return Promise.resolve(entityOrEntities);
  }),
  create: jest.fn().mockImplementation((_Entity: unknown, data: Record<string, unknown>) => data),
};

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: mockQueryRunnerManager,
};

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

// ─── Test Suite ──────────────────────────────────

describe('IssuesService', () => {
  let service: IssuesService;

  beforeEach(async () => {
    savedChangelogs.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssuesService,
        { provide: getRepositoryToken(IssueEntity), useValue: mockIssueRepo },
        { provide: getRepositoryToken(IssueCommentEntity), useValue: mockCommentRepo },
        { provide: getRepositoryToken(IssueAttachmentEntity), useValue: mockAttachmentRepo },
        { provide: getRepositoryToken(IssueChangelogEntity), useValue: mockChangelogRepo },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<IssuesService>(IssuesService);
    jest.clearAllMocks();
    savedChangelogs.length = 0;
  });

  describe('update with changelog', () => {
    it('should create changelog entries for changed fields', async () => {
      mockIssueRepo.findOne.mockResolvedValue({ ...mockIssue });

      await service.update('issue-1', 'user-1', {
        title: 'New Title',
        priority: 'HIGH',
      });

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      // Should have 2 changelog entries: title + priority
      expect(savedChangelogs).toHaveLength(2);
      expect(savedChangelogs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'title', oldValue: 'Original Title', newValue: 'New Title' }),
          expect.objectContaining({ field: 'priority', oldValue: 'MEDIUM', newValue: 'HIGH' }),
        ]),
      );
    });

    it('should NOT create changelog for unchanged fields', async () => {
      mockIssueRepo.findOne.mockResolvedValue({ ...mockIssue });

      await service.update('issue-1', 'user-1', {
        title: 'Original Title', // Same as current
      });

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(savedChangelogs).toHaveLength(0);
    });
  });

  describe('move with rebalance', () => {
    it('should update order without rebalance when gap is large', async () => {
      mockIssueRepo.findOne.mockResolvedValue({ ...mockIssue });
      mockIssueRepo.save.mockResolvedValue({ ...mockIssue, order: 2.5, status: 'IN_PROGRESS' });

      const getCountQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0), // No neighbors close
      };
      mockIssueRepo.createQueryBuilder.mockReturnValue(getCountQb);

      const result = await service.move('issue-1', 'user-1', {
        newOrder: 2.5,
        newStatus: 'IN_PROGRESS',
      }, 'tenant-1');

      expect(result.order).toBe(2.5);
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('should trigger rebalance when gap is too small', async () => {
      mockIssueRepo.findOne.mockResolvedValue({ ...mockIssue });
      mockIssueRepo.save.mockResolvedValue({ ...mockIssue, order: 1.0005, status: 'IN_PROGRESS' });

      // First call: check neighbors — return 1 (too close)
      const getCountQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };

      // Second call: rebalance — get all issues in column
      const rebalanceQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { ...mockIssue, id: 'a', order: 1.0 },
          { ...mockIssue, id: 'b', order: 1.0005 },
          { ...mockIssue, id: 'c', order: 1.001 },
        ]),
      };

      mockIssueRepo.createQueryBuilder
        .mockReturnValueOnce(getCountQb)
        .mockReturnValueOnce(rebalanceQb);

      await service.move('issue-1', 'user-1', {
        newOrder: 1.0005,
        newStatus: 'IN_PROGRESS',
      }, 'tenant-1');

      // Rebalance should have been called and committed in a transaction
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});

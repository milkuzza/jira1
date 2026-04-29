// apps/api/src/modules/projects/projects.service.ts
// Project CRUD, board query with columns + issues, board columns management.

import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectEntity } from '../../entities/project.entity';
import { BoardColumnEntity } from '../../entities/board-column.entity';
import { IssueEntity } from '../../entities/issue.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { DEFAULT_BOARD_COLUMNS, EVENTS } from '../../constants';

export interface BoardColumnWithIssues {
  id: string;
  name: string;
  color: string;
  order: number;
  issues: IssueCardResult[];
}

export interface IssueCardResult {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: { id: string; fullName: string; avatarUrl: string | null } | null;
  storyPoints: number | null;
  labelsCount: number;
  commentsCount: number;
  order: number;
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(BoardColumnEntity)
    private readonly columnRepo: Repository<BoardColumnEntity>,
    @InjectRepository(IssueEntity)
    private readonly issueRepo: Repository<IssueEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(tenantId: string, dto: CreateProjectDto): Promise<ProjectEntity> {
    // Check key uniqueness within tenant
    const existing = await this.projectRepo.findOne({
      where: { tenantId, key: dto.key },
    });
    if (existing) {
      throw new ConflictException(`Project key '${dto.key}' already exists`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create project
      const project = queryRunner.manager.create(ProjectEntity, {
        tenantId,
        name: dto.name,
        key: dto.key,
        description: dto.description ?? null,
        boardType: dto.boardType ?? 'KANBAN',
      });
      const savedProject = await queryRunner.manager.save(project);

      // Create default board columns
      const columns = DEFAULT_BOARD_COLUMNS.map((col) =>
        queryRunner.manager.create(BoardColumnEntity, {
          projectId: savedProject.id,
          name: col.name,
          order: col.order,
          color: col.color,
          statusKey: col.statusKey,
        }),
      );
      await queryRunner.manager.save(columns);

      await queryRunner.commitTransaction();

      this.logger.log(`Project created: ${savedProject.key} (${savedProject.id})`);
      return savedProject;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(tenantId: string): Promise<ProjectEntity[]> {
    return this.projectRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(projectId: string): Promise<ProjectEntity> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['boardColumns'],
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async update(projectId: string, dto: UpdateProjectDto): Promise<ProjectEntity> {
    const project = await this.findOne(projectId);

    if (dto.name !== undefined) project.name = dto.name;
    if (dto.description !== undefined) project.description = dto.description ?? null;

    return this.projectRepo.save(project);
  }

  async remove(projectId: string): Promise<void> {
    const project = await this.findOne(projectId);
    await this.projectRepo.remove(project);
  }

  // ─── Board ───────────────────────────────────────

  async getBoard(projectId: string): Promise<{ columns: BoardColumnWithIssues[] }> {
    // Verify project exists
    await this.findOne(projectId);

    // Get columns ordered
    const columns = await this.columnRepo.find({
      where: { projectId },
      order: { order: 'ASC' },
    });

    // Map statusKey to column ID
    const statusToColumn = new Map<string, string>();

    for (const col of columns) {
      statusToColumn.set(col.statusKey, col.id);
    }

    // Fetch all issues for this project with assignee relation
    const issues = await this.issueRepo
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.assignee', 'assignee')
      .loadRelationCountAndMap('issue.labelsCount', 'issue.labels')
      .loadRelationCountAndMap('issue.commentsCount', 'issue.comments')
      .where('issue.projectId = :projectId', { projectId })
      .orderBy('issue.order', 'ASC')
      .getMany();

    // Group issues by column
    const columnIssuesMap = new Map<string, IssueCardResult[]>();
    for (const col of columns) {
      columnIssuesMap.set(col.id, []);
    }

    for (const issue of issues) {
      const columnId = statusToColumn.get(issue.status);
      if (columnId && columnIssuesMap.has(columnId)) {
        columnIssuesMap.get(columnId)!.push({
          id: issue.id,
          title: issue.title,
          status: issue.status,
          priority: issue.priority,
          assignee: issue.assignee
            ? { id: issue.assignee.id, fullName: issue.assignee.fullName, avatarUrl: issue.assignee.avatarUrl }
            : null,
          storyPoints: issue.storyPoints,
          labelsCount: (issue as unknown as { labelsCount: number }).labelsCount ?? 0,
          commentsCount: (issue as unknown as { commentsCount: number }).commentsCount ?? 0,
          order: issue.order,
        });
      }
    }

    return {
      columns: columns.map((col) => {
        return {
          id: col.id,
          name: col.name,
          color: col.color,
          order: col.order,
          status: col.statusKey,
          issues: columnIssuesMap.get(col.id) ?? [],
        };
      }),
    };
  }

  // ─── Board Columns ──────────────────────────────

  async createColumn(projectId: string, dto: CreateColumnDto): Promise<BoardColumnEntity> {
    await this.findOne(projectId);

    const maxOrder = await this.columnRepo
      .createQueryBuilder('col')
      .select('MAX(col.order)', 'max')
      .where('col.projectId = :projectId', { projectId })
      .getRawOne<{ max: number }>();

    const column = this.columnRepo.create({
      projectId,
      name: dto.name,
      color: dto.color ?? '#6B7280',
      order: (maxOrder?.max ?? -1) + 1,
    });

    const saved = await this.columnRepo.save(column);
    this.eventEmitter.emit(EVENTS.COLUMN_CREATED, { projectId, column: saved });
    return saved;
  }

  async updateColumn(columnId: string, dto: UpdateColumnDto): Promise<BoardColumnEntity> {
    const column = await this.columnRepo.findOne({ where: { id: columnId } });
    if (!column) {
      throw new NotFoundException('Column not found');
    }

    if (dto.name !== undefined) column.name = dto.name;
    if (dto.color !== undefined) column.color = dto.color;

    const saved = await this.columnRepo.save(column);
    this.eventEmitter.emit(EVENTS.COLUMN_UPDATED, { projectId: column.projectId, column: saved });
    return saved;
  }

  async deleteColumn(columnId: string): Promise<void> {
    const column = await this.columnRepo.findOne({ where: { id: columnId } });
    if (!column) {
      throw new NotFoundException('Column not found');
    }
    await this.columnRepo.remove(column);
    this.eventEmitter.emit(EVENTS.COLUMN_DELETED, { projectId: column.projectId, columnId });
  }
}

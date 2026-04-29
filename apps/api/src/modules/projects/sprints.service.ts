// apps/api/src/modules/projects/sprints.service.ts
// Sprint CRUD, start/complete lifecycle with event emission.

import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SprintEntity } from '../../entities/sprint.entity';
import { IssueEntity } from '../../entities/issue.entity';
import { ProjectEntity } from '../../entities/project.entity';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { EVENTS } from '../../constants';

@Injectable()
export class SprintsService {
  private readonly logger = new Logger(SprintsService.name);

  constructor(
    @InjectRepository(SprintEntity)
    private readonly sprintRepo: Repository<SprintEntity>,
    @InjectRepository(IssueEntity)
    private readonly issueRepo: Repository<IssueEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(projectId: string, dto: CreateSprintDto): Promise<SprintEntity> {
    const sprint = this.sprintRepo.create({
      projectId,
      name: dto.name,
      goal: dto.goal ?? null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      status: 'PLANNED',
    });
    return this.sprintRepo.save(sprint);
  }

  async findAll(projectId: string): Promise<SprintEntity[]> {
    return this.sprintRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(sprintId: string): Promise<SprintEntity> {
    const sprint = await this.sprintRepo.findOne({ where: { id: sprintId } });
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }
    return sprint;
  }

  async start(sprintId: string): Promise<SprintEntity> {
    const sprint = await this.findOne(sprintId);

    // Check no other active sprint in this project
    const active = await this.sprintRepo.findOne({
      where: {
        projectId: sprint.projectId,
        status: 'ACTIVE',
        id: Not(sprintId),
      },
    });

    if (active) {
      throw new ConflictException(
        `Sprint '${active.name}' is already active in this project. Complete it first.`,
      );
    }

    sprint.status = 'ACTIVE';
    if (!sprint.startDate) {
      sprint.startDate = new Date();
    }

    const saved = await this.sprintRepo.save(sprint);
    this.logger.log(`Sprint started: ${sprint.name} (${sprint.id})`);

    // Emit event for notifications (get tenantId from project)
    try {
      const project = await this.projectRepo.findOne({
        where: { id: sprint.projectId },
        select: ['id', 'tenantId'],
      });
      if (project) {
        this.eventEmitter.emit(EVENTS.SPRINT_STARTED, {
          sprintId: sprint.id,
          sprintName: sprint.name,
          projectId: sprint.projectId,
          tenantId: project.tenantId,
        });
      }
    } catch (err) {
      this.logger.error(`Failed to emit SPRINT_STARTED event: ${String(err)}`);
    }

    return saved;
  }

  async complete(sprintId: string): Promise<SprintEntity> {
    const sprint = await this.findOne(sprintId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let saved!: SprintEntity;
    try {
      // Move incomplete issues to backlog (sprint_id = null)
      await queryRunner.manager
        .createQueryBuilder()
        .update(IssueEntity)
        .set({ sprintId: null, status: 'BACKLOG' })
        .where('sprintId = :sprintId', { sprintId })
        .andWhere('status != :done', { done: 'DONE' })
        .execute();

      // Mark sprint as completed
      sprint.status = 'COMPLETED';
      sprint.endDate = new Date();
      saved = await queryRunner.manager.save(sprint);

      await queryRunner.commitTransaction();
      this.logger.log(`Sprint completed: ${sprint.name} (${sprint.id})`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Emit event for notifications (get tenantId from project)
    try {
      const project = await this.projectRepo.findOne({
        where: { id: sprint.projectId },
        select: ['id', 'tenantId'],
      });
      if (project) {
        this.eventEmitter.emit(EVENTS.SPRINT_COMPLETED, {
          sprintId: sprint.id,
          sprintName: sprint.name,
          projectId: sprint.projectId,
          tenantId: project.tenantId,
        });
      }
    } catch (err) {
      this.logger.error(`Failed to emit SPRINT_COMPLETED event: ${String(err)}`);
    }

    return saved;
  }

  async remove(sprintId: string): Promise<void> {
    const sprint = await this.findOne(sprintId);
    await this.sprintRepo.remove(sprint);
  }
}

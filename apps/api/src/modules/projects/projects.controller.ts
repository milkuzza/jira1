// apps/api/src/modules/projects/projects.controller.ts
// Project REST endpoints: CRUD, board, columns, sprints.

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService, BoardColumnWithIssues } from './projects.service';
import { SprintsService } from './sprints.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../../decorators/current-user.decorator';
import { PlanGuard, PLAN_RESOURCE_KEY } from '../../billing/plan.guard';
import { ProjectEntity } from '../../entities/project.entity';
import { BoardColumnEntity } from '../../entities/board-column.entity';
import { SprintEntity } from '../../entities/sprint.entity';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly sprintsService: SprintsService,
  ) {}

  // ─── Projects CRUD ──────────────────────────────

  @Post()
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @UseGuards(PlanGuard)
  @SetMetadata(PLAN_RESOURCE_KEY, 'projects')
  @ApiOperation({ summary: 'Create a new project' })
  async create(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectEntity> {
    return this.projectsService.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all projects in tenant' })
  async findAll(@CurrentUser() user: JwtUser): Promise<ProjectEntity[]> {
    return this.projectsService.findAll(user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectEntity> {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Update a project' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectEntity> {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a project (ADMIN only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.projectsService.remove(id);
  }

  // ─── Board ───────────────────────────────────────

  @Get(':id/board')
  @ApiOperation({ summary: 'Get Kanban board (columns with issues)' })
  async getBoard(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ columns: BoardColumnWithIssues[] }> {
    return this.projectsService.getBoard(id);
  }

  // ─── Board Columns ──────────────────────────────

  @Post(':id/board-columns')
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Add a board column' })
  async createColumn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateColumnDto,
  ): Promise<BoardColumnEntity> {
    return this.projectsService.createColumn(id, dto);
  }

  @Patch('board-columns/:columnId')
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Update a board column' })
  async updateColumn(
    @Param('columnId', ParseUUIDPipe) columnId: string,
    @Body() dto: UpdateColumnDto,
  ): Promise<BoardColumnEntity> {
    return this.projectsService.updateColumn(columnId, dto);
  }

  @Delete('board-columns/:columnId')
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Delete a board column' })
  async deleteColumn(
    @Param('columnId', ParseUUIDPipe) columnId: string,
  ): Promise<void> {
    return this.projectsService.deleteColumn(columnId);
  }

  // ─── Sprints ─────────────────────────────────────

  @Get(':id/sprints')
  @ApiOperation({ summary: 'List sprints for a project' })
  async listSprints(@Param('id', ParseUUIDPipe) id: string): Promise<SprintEntity[]> {
    return this.sprintsService.findAll(id);
  }

  @Post(':id/sprints')
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Create a sprint' })
  async createSprint(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSprintDto,
  ): Promise<SprintEntity> {
    return this.sprintsService.create(id, dto);
  }

  @Post('sprints/:sprintId/start')
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Start a sprint' })
  async startSprint(
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
  ): Promise<SprintEntity> {
    return this.sprintsService.start(sprintId);
  }

  @Post('sprints/:sprintId/complete')
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Complete a sprint' })
  async completeSprint(
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
  ): Promise<SprintEntity> {
    return this.sprintsService.complete(sprintId);
  }

  @Delete('sprints/:sprintId')
  @Roles('ADMIN', 'PROJECT_MANAGER')
  @ApiOperation({ summary: 'Delete a sprint' })
  async removeSprint(
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
  ): Promise<void> {
    return this.sprintsService.remove(sprintId);
  }
}

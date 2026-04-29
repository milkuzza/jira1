// apps/api/src/modules/projects/projects.module.ts
// Projects module: CRUD, board, columns, sprints.

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from '../../entities/project.entity';
import { BoardColumnEntity } from '../../entities/board-column.entity';
import { SprintEntity } from '../../entities/sprint.entity';
import { IssueEntity } from '../../entities/issue.entity';
import { ProjectsService } from './projects.service';
import { SprintsService } from './sprints.service';
import { ProjectsController } from './projects.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectEntity, BoardColumnEntity, SprintEntity, IssueEntity]),
  ],
  providers: [ProjectsService, SprintsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}

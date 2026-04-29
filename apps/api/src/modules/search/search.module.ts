// apps/api/src/modules/search/search.module.ts
// Search module: full-text search with PostgreSQL tsvector.

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssueEntity } from '../../entities/issue.entity';
import { ProjectEntity } from '../../entities/project.entity';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IssueEntity, ProjectEntity])],
  providers: [SearchService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}

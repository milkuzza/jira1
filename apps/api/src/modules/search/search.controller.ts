// apps/api/src/modules/search/search.controller.ts
// GET /search?q=&projectId= endpoint.

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SearchService, SearchResponse } from './search.service';
import { CurrentUser, JwtUser } from '../../decorators/current-user.decorator';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Full-text search across issues and projects' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  async search(
    @CurrentUser() user: JwtUser,
    @Query('q') q?: string,
    @Query('projectId') projectId?: string,
  ): Promise<SearchResponse> {
    return this.searchService.search(user.tenantId, user.sub, q ?? '', projectId);
  }
}

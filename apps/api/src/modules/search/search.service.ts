// apps/api/src/modules/search/search.service.ts
// Full-text search: tsvector issues, ILIKE projects, Redis recent views.

import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { IssueEntity } from '../../entities/issue.entity';
import { ProjectEntity } from '../../entities/project.entity';
import {
  REDIS_CLIENT,
  SEARCH_LIMIT_ISSUES,
  SEARCH_LIMIT_PROJECTS,
  RECENT_VIEWS_PREFIX,
  RECENT_VIEWS_MAX,
} from '../../constants';

export interface SearchIssueResult {
  id: string;
  title: string;
  headline: string;
  priority: string;
  status: string;
  projectId: string;
  rank: number;
}

export interface SearchProjectResult {
  id: string;
  name: string;
  key: string;
}

export interface SearchResponse {
  issues: SearchIssueResult[];
  projects: SearchProjectResult[];
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(IssueEntity)
    private readonly issueRepo: Repository<IssueEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async search(tenantId: string, userId: string, query: string, projectId?: string): Promise<SearchResponse> {
    if (!query || query.trim().length === 0) {
      return this.getRecentViews(userId, tenantId);
    }

    const [issues, projects] = await Promise.all([
      this.searchIssues(tenantId, query, projectId),
      this.searchProjects(tenantId, query),
    ]);

    return { issues, projects };
  }

  private async searchIssues(
    tenantId: string,
    query: string,
    projectId?: string,
  ): Promise<SearchIssueResult[]> {
    let qb = this.issueRepo
      .createQueryBuilder('issue')
      .select([
        'issue.id AS id',
        'issue.title AS title',
        'issue.priority AS priority',
        'issue.status AS status',
        'issue.project_id AS "projectId"',
        "ts_headline('english', issue.title, plainto_tsquery('english', :q)) AS headline",
        "ts_rank(issue.search_vector, plainto_tsquery('english', :q)) AS rank",
      ])
      .where('issue.tenant_id = :tenantId', { tenantId })
      .andWhere("issue.search_vector @@ plainto_tsquery('english', :q)", { q: query });

    if (projectId) {
      qb = qb.andWhere('issue.project_id = :projectId', { projectId });
    }

    const results = await qb
      .orderBy('rank', 'DESC')
      .limit(SEARCH_LIMIT_ISSUES)
      .getRawMany<SearchIssueResult>();

    return results;
  }

  private async searchProjects(tenantId: string, query: string): Promise<SearchProjectResult[]> {
    return this.projectRepo
      .createQueryBuilder('project')
      .select(['project.id AS id', 'project.name AS name', 'project.key AS key'])
      .where('project.tenant_id = :tenantId', { tenantId })
      .andWhere('project.name ILIKE :q', { q: `%${query}%` })
      .limit(SEARCH_LIMIT_PROJECTS)
      .getRawMany<SearchProjectResult>();
  }

  /** Store that a user recently viewed an issue */
  async trackRecentView(userId: string, issueId: string): Promise<void> {
    const key = `${RECENT_VIEWS_PREFIX}:${userId}`;
    await this.redis.lrem(key, 0, issueId);
    await this.redis.lpush(key, issueId);
    await this.redis.ltrim(key, 0, RECENT_VIEWS_MAX - 1);
  }

  /** Get recently viewed issues as search results (when query is empty) */
  private async getRecentViews(userId: string, tenantId: string): Promise<SearchResponse> {
    const key = `${RECENT_VIEWS_PREFIX}:${userId}`;
    const recentIds = await this.redis.lrange(key, 0, RECENT_VIEWS_MAX - 1);

    if (recentIds.length === 0) {
      return { issues: [], projects: [] };
    }

    const issues = await this.issueRepo
      .createQueryBuilder('issue')
      .select([
        'issue.id AS id',
        'issue.title AS title',
        'issue.title AS headline',
        'issue.priority AS priority',
        'issue.status AS status',
        'issue.project_id AS "projectId"',
      ])
      .where('issue.tenant_id = :tenantId', { tenantId })
      .andWhere('issue.id IN (:...ids)', { ids: recentIds })
      .getRawMany<Omit<SearchIssueResult, 'rank'>>();

    return {
      issues: issues.map((i) => ({ ...i, rank: 0 })),
      projects: [],
    };
  }
}

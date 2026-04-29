// apps/api/src/billing/plan-limits.service.ts
// SaaS plan limit checker with Redis-cached resource counts.

import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { TenantEntity } from '../entities/tenant.entity';
import { ProjectEntity } from '../entities/project.entity';
import { UserEntity } from '../entities/user.entity';
import { IssueEntity } from '../entities/issue.entity';
import { PlanLimitExceededException } from './plan-limit-exceeded.exception';
import {
  REDIS_CLIENT,
  PLAN_LIMITS,
  PLAN_LIMIT_CACHE_TTL,
  PLAN_LIMIT_PREFIX,
} from '../constants';

@Injectable()
export class PlanLimitsService {
  private readonly logger = new Logger(PlanLimitsService.name);

  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepo: Repository<TenantEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(IssueEntity)
    private readonly issueRepo: Repository<IssueEntity>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async checkLimit(tenantId: string, resource: 'projects' | 'users' | 'issues'): Promise<void> {
    const tenant = await this.tenantRepo.findOne({
      where: { id: tenantId },
      select: ['id', 'plan'],
    });
    if (!tenant) return;

    const plan = tenant.plan ?? 'FREE';
    const limits = PLAN_LIMITS[plan];
    if (!limits) return;

    const limit = limits[resource];
    if (limit === Infinity) return; // Unlimited

    const current = await this.getCachedCount(tenantId, resource);

    if (current >= limit) {
      this.logger.warn(`Plan limit exceeded: tenant=${tenantId} resource=${resource} current=${current} limit=${limit}`);
      throw new PlanLimitExceededException(resource, current, limit);
    }
  }

  private async getCachedCount(tenantId: string, resource: string): Promise<number> {
    const cacheKey = `${PLAN_LIMIT_PREFIX}:${tenantId}:${resource}`;
    const cached = await this.redis.get(cacheKey);

    if (cached !== null) {
      return parseInt(cached, 10);
    }

    let count: number;
    switch (resource) {
      case 'projects':
        count = await this.projectRepo.count({ where: { tenantId } });
        break;
      case 'users':
        count = await this.userRepo.count({ where: { tenantId } });
        break;
      case 'issues':
        count = await this.issueRepo.count({ where: { tenantId } });
        break;
      default:
        count = 0;
    }

    await this.redis.set(cacheKey, count.toString(), 'EX', PLAN_LIMIT_CACHE_TTL);
    return count;
  }
}

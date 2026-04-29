// apps/api/src/modules/health/health.service.ts
// Checks PostgreSQL and Redis connectivity using shared Redis client.

import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { HEALTH_CHECK_QUERY, REDIS_CLIENT } from '../../constants';

export interface HealthStatus {
  status: 'ok' | 'error';
  db: 'ok' | 'error';
  redis: 'ok' | 'error';
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async check(): Promise<HealthStatus> {
    const db = await this.checkDb();
    const redis = await this.checkRedis();

    return {
      status: db === 'ok' && redis === 'ok' ? 'ok' : 'error',
      db,
      redis,
    };
  }

  private async checkDb(): Promise<'ok' | 'error'> {
    try {
      await this.dataSource.query(HEALTH_CHECK_QUERY);
      return 'ok';
    } catch (err) {
      this.logger.error('Database health check failed', err instanceof Error ? err.message : err);
      return 'error';
    }
  }

  private async checkRedis(): Promise<'ok' | 'error'> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' ? 'ok' : 'error';
    } catch (err) {
      this.logger.error('Redis health check failed', err instanceof Error ? err.message : err);
      return 'error';
    }
  }
}

// apps/api/src/middleware/tenant.middleware.ts
// Extracts tenant from subdomain, caches in Redis, sets RLS context.
// Skips public routes that don't require tenant context.

import { Injectable, NestMiddleware, NotFoundException, Logger, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { TenantEntity } from '../entities/tenant.entity';
import {
  TENANT_CACHE_PREFIX,
  TENANT_CACHE_TTL,
  SET_TENANT_QUERY,
  APP_DOMAIN_DEFAULT,
  REQUEST_TENANT_KEY,
  PUBLIC_ROUTES,
  REDIS_CLIENT,
} from '../constants';

// Augment Express Request to include tenant and user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenant?: TenantEntity;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);
  private readonly appDomain: string;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {
    this.appDomain = this.configService.get<string>('APP_DOMAIN', APP_DOMAIN_DEFAULT);
  }

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // Skip tenant resolution for public routes
    if (this.isPublicRoute(req.path)) {
      next();
      return;
    }

    const host = req.headers.host ?? '';
    const headerSlug = req.headers['x-tenant-id'] as string | undefined;
    const slug = headerSlug || this.extractSubdomain(host);

    if (!slug) {
      // No subdomain or header — likely direct API access or health check
      next();
      return;
    }

    const tenant = await this.resolveTenant(slug);

    if (!tenant) {
      throw new NotFoundException(`Tenant '${slug}' not found`);
    }

    req[REQUEST_TENANT_KEY] = tenant;

    // Set RLS tenant context for this transaction
    await this.dataSource.query(SET_TENANT_QUERY, [tenant.id]);

    next();
  }

  private isPublicRoute(path: string): boolean {
    return PUBLIC_ROUTES.some((route) => path.startsWith(route));
  }

  private extractSubdomain(host: string): string | null {
    const hostname = host.split(':')[0];

    if (!hostname.endsWith(this.appDomain)) {
      return null;
    }

    const prefix = hostname.slice(0, -(this.appDomain.length + 1));
    if (!prefix || prefix === 'api' || prefix === 'adminer' || prefix === 'minio') {
      return null;
    }

    return prefix;
  }

  private async resolveTenant(slug: string): Promise<TenantEntity | null> {
    const cacheKey = `${TENANT_CACHE_PREFIX}${slug}`;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as TenantEntity;
    }

    // Query DB
    const repo = this.dataSource.getRepository(TenantEntity);
    const tenant = await repo.findOne({ where: { slug } });

    if (tenant) {
      await this.redis.set(cacheKey, JSON.stringify(tenant), 'EX', TENANT_CACHE_TTL);
      this.logger.debug(`Cached tenant '${slug}' for ${TENANT_CACHE_TTL}s`);
    }

    return tenant;
  }
}

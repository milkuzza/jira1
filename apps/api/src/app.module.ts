// apps/api/src/app.module.ts
// Root application module: config, TypeORM, Redis, JWT, tenant middleware, all feature modules.

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';

// Entities
import {
  TenantEntity,
  UserEntity,
  ProjectEntity,
  BoardColumnEntity,
  SprintEntity,
  IssueEntity,
  IssueCommentEntity,
  IssueAttachmentEntity,
  IssueChangelogEntity,
  LabelEntity,
  NotificationEntity,
} from './entities';

// Infrastructure
import { RedisModule } from './redis/redis.module';

// Middleware
import { TenantMiddleware } from './middleware/tenant.middleware';

// Guards
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

// Modules
import { HealthModule } from './modules/health/health.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { IssuesModule } from './modules/issues/issues.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    // ─── Configuration ─────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().default(5432),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
        APP_DOMAIN: Joi.string().default('app.localhost'),
        API_PORT: Joi.number().default(3000),
        ALLOWED_ORIGINS: Joi.string().default(''),
      }),
    }),

    // ─── Database ──────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('POSTGRES_HOST'),
        port: config.get<number>('POSTGRES_PORT'),
        username: config.get<string>('POSTGRES_USER'),
        password: config.get<string>('POSTGRES_PASSWORD'),
        database: config.get<string>('POSTGRES_DB'),
        entities: [
          TenantEntity,
          UserEntity,
          ProjectEntity,
          BoardColumnEntity,
          SprintEntity,
          IssueEntity,
          IssueCommentEntity,
          IssueAttachmentEntity,
          IssueChangelogEntity,
          LabelEntity,
          NotificationEntity,
        ],
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),

    // ─── Infrastructure ────────────────────────────
    RedisModule,
    EventEmitterModule.forRoot(),

    // ─── Feature Modules ───────────────────────────
    AuthModule,
    HealthModule,
    TenantsModule,
    UsersModule,
    ProjectsModule,
    IssuesModule,
    SearchModule,
    NotificationsModule,
    BillingModule,
  ],
  providers: [
    // ─── Global Guards ─────────────────────────────
    // Order matters: JwtAuthGuard first, then RolesGuard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}

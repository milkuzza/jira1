// apps/api/src/modules/health/health.module.ts
// Health check module — exposes GET /health with DB and Redis status.

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}

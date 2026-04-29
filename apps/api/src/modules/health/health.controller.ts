// apps/api/src/modules/health/health.controller.ts
// GET /health — returns DB and Redis health status.

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService, HealthStatus } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API health (DB + Redis)' })
  async check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}

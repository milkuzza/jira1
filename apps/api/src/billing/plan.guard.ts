// apps/api/src/billing/plan.guard.ts
// Guard that checks SaaS plan limits before resource creation.
// Apply as: @UseGuards(PlanGuard) @SetMetadata('planResource', 'projects')

import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanLimitsService } from './plan-limits.service';

export const PLAN_RESOURCE_KEY = 'planResource';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.get<string>(PLAN_RESOURCE_KEY, context.getHandler());
    if (!resource) return true;

    const request = context.switchToHttp().getRequest<{ user?: { tenantId: string } }>();
    const tenantId = request.user?.tenantId;
    if (!tenantId) return true;

    // checkLimit throws PlanLimitExceededException (HTTP 402) if limit reached
    await this.planLimitsService.checkLimit(
      tenantId,
      resource as 'projects' | 'users' | 'issues',
    );

    return true;
  }
}

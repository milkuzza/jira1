// apps/api/src/billing/billing.module.ts
// Billing module: plan limits checker, guard, and Stripe payments integration.

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantEntity } from '../entities/tenant.entity';
import { ProjectEntity } from '../entities/project.entity';
import { UserEntity } from '../entities/user.entity';
import { IssueEntity } from '../entities/issue.entity';
import { PlanLimitsService } from './plan-limits.service';
import { PlanGuard } from './plan.guard';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([TenantEntity, ProjectEntity, UserEntity, IssueEntity]),
  ],
  providers: [PlanLimitsService, PlanGuard, PaymentsService],
  controllers: [PaymentsController],
  exports: [PlanLimitsService, PlanGuard, PaymentsService],
})
export class BillingModule {}

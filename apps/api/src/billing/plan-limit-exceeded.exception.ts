// apps/api/src/billing/plan-limit-exceeded.exception.ts
// Custom exception for plan limit violations — returns HTTP 402.

import { HttpException, HttpStatus } from '@nestjs/common';

export class PlanLimitExceededException extends HttpException {
  constructor(resource: string, current: number, limit: number) {
    super(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        message: 'Plan limit exceeded',
        resource,
        current,
        limit,
        upgradeUrl: 'https://app.localhost/billing/upgrade',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

// apps/api/src/decorators/current-user.decorator.ts
// @CurrentUser() — extracts the authenticated user from the request.

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface JwtUser {
  sub: string;
  tenantId: string;
  email: string;
  role: string;
  tokenId?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as JwtUser;
  },
);

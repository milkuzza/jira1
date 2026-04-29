// apps/api/src/guards/policy.guard.ts
// Resource-level authorization: checks Action+Resource against role-permission matrix.

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { POLICY_KEY, Action, ROLE_PERMISSIONS } from '../constants';
import { PolicyMeta } from '../decorators/policy.decorator';
import { JwtUser } from '../decorators/current-user.decorator';

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const policy = this.reflector.getAllAndOverride<PolicyMeta | undefined>(POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @CheckPolicy() decorator → allow
    if (!policy) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = request.user;

    if (!user) {
      return false;
    }

    const permissions = ROLE_PERMISSIONS[user.role];
    if (!permissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const allowedActions = permissions[policy.resource];
    if (!allowedActions) {
      throw new ForbiddenException('Insufficient permissions for this resource');
    }

    // Action.Manage grants all actions
    if (allowedActions.includes(Action.Manage)) {
      return true;
    }

    if (!allowedActions.includes(policy.action)) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }

    return true;
  }
}

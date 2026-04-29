// apps/api/src/decorators/policy.decorator.ts
// @CheckPolicy(Action.Create, Resource.Project) — sets policy metadata on a handler.

import { SetMetadata } from '@nestjs/common';
import { Action, Resource, POLICY_KEY } from '../constants';

export interface PolicyMeta {
  action: Action;
  resource: Resource;
}

export const CheckPolicy = (action: Action, resource: Resource): ReturnType<typeof SetMetadata> =>
  SetMetadata(POLICY_KEY, { action, resource } satisfies PolicyMeta);

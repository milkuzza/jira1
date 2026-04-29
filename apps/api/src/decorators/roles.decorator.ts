// apps/api/src/decorators/roles.decorator.ts
// @Roles('ADMIN', 'PROJECT_MANAGER') — sets required roles metadata on a handler.

import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants';

export const Roles = (...roles: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);

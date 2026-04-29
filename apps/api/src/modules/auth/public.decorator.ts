// apps/api/src/modules/auth/public.decorator.ts
// @Public() — marks a route as publicly accessible, skipping JWT authentication.

import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../../constants';

export const Public = (): ReturnType<typeof SetMetadata> => SetMetadata(IS_PUBLIC_KEY, true);

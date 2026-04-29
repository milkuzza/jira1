// apps/api/src/modules/auth/dto/refresh.dto.ts
// DTO for POST /auth/refresh — validated by class-validator.

import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

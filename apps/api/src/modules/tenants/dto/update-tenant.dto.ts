// apps/api/src/modules/tenants/dto/update-tenant.dto.ts
// DTO for PATCH /tenants/current — validated by class-validator.

import { IsString, IsOptional, MinLength, MaxLength, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'Acme Corporation' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ enum: ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'] })
  @IsOptional()
  @IsEnum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE'])
  plan?: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
}

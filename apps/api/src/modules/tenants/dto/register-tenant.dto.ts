// apps/api/src/modules/tenants/dto/register-tenant.dto.ts
// DTO for POST /tenants/register — validated by class-validator.

import { IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterTenantDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  orgName!: string;

  @ApiProperty({ example: 'acme' })
  @IsString()
  @MinLength(2)
  @MaxLength(63)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  @MaxLength(255)
  adminEmail!: string;

  @ApiProperty({ example: 'securePass123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  adminPassword!: string;
}

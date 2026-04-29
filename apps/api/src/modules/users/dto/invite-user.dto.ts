// apps/api/src/modules/users/dto/invite-user.dto.ts
// DTO for POST /users/invite — validated by class-validator.

import { IsEmail, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteUserDto {
  @ApiProperty({ example: 'newdev@acme.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ enum: ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER', 'VIEWER'] })
  @IsEnum(['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER', 'VIEWER'])
  role!: 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER' | 'VIEWER';
}

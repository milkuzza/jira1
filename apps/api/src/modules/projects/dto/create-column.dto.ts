// apps/api/src/modules/projects/dto/create-column.dto.ts
// DTO for POST /projects/:id/board-columns.

import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateColumnDto {
  @ApiProperty({ example: 'Testing' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: '#8B5CF6' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a hex color code' })
  color?: string;
}

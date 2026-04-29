// apps/api/src/modules/issues/dto/update-issue.dto.ts
// DTO for PATCH /issues/:id.

import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateIssueDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ description: 'Issue status (matches a column)' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  status?: string;

  @ApiPropertyOptional({ enum: ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'] })
  @IsOptional()
  @IsEnum(['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'])
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sprintId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  storyPoints?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}

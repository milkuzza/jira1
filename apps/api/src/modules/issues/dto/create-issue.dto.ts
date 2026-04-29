// apps/api/src/modules/issues/dto/create-issue.dto.ts
// DTO for POST /projects/:projectId/issues.

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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIssueDto {
  @ApiProperty({ example: 'Implement user login' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ description: 'Issue status — matches the board column status' })
  @IsOptional()
  @IsString()
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
  @IsUUID()
  parentId?: string | null;

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

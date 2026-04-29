// apps/api/src/modules/projects/dto/create-project.dto.ts
// DTO for POST /projects — validated by class-validator.

import { IsString, IsOptional, MinLength, MaxLength, Matches, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'Backend API' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'API', description: 'Uppercase project key (1-10 chars)' })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  @Matches(/^[A-Z][A-Z0-9]*$/, { message: 'Key must be uppercase letters/numbers, start with a letter' })
  key!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: ['KANBAN', 'SCRUM'] })
  @IsOptional()
  @IsEnum(['KANBAN', 'SCRUM'])
  boardType?: 'KANBAN' | 'SCRUM';
}

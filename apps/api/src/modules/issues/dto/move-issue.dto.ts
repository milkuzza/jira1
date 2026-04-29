// apps/api/src/modules/issues/dto/move-issue.dto.ts
// DTO for PATCH /issues/:id/order — Kanban drag-and-drop.

import { IsNumber, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveIssueDto {
  @ApiProperty({ example: 2.5, description: 'New order position (float between neighbors)' })
  @IsNumber()
  newOrder!: number;

  @ApiProperty({ description: 'Column status identifier (e.g. BACKLOG, IN_PROGRESS, or a custom column status)' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  newStatus!: string;
}

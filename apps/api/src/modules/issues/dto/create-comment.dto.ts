// apps/api/src/modules/issues/dto/create-comment.dto.ts
// DTO for POST /issues/:id/comments.

import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'Looks good! Ready for review.' })
  @IsString()
  @MinLength(1)
  body!: string;
}

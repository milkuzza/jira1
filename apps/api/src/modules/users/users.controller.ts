// apps/api/src/modules/users/users.controller.ts
// User endpoints: profile, list, invite, avatar.

import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  SetMetadata,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService, UserListItem, InviteResult } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { CurrentUser, JwtUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { PlanGuard, PLAN_RESOURCE_KEY } from '../../billing/plan.guard';
import { UserEntity } from '../../entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: JwtUser): Promise<UserEntity> {
    return this.usersService.getMe(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.usersService.updateMe(user.sub, dto);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Upload avatar image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser() user: JwtUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ avatarUrl: string }> {
    return this.usersService.uploadAvatar(user.sub, file);
  }

  @Get()
  @ApiOperation({ summary: 'List all users in the current tenant (for assignee picker)' })
  async list(@CurrentUser() user: JwtUser): Promise<UserListItem[]> {
    return this.usersService.list(user.tenantId);
  }

  @Post('invite')
  @Roles('ADMIN')
  @UseGuards(PlanGuard)
  @SetMetadata(PLAN_RESOURCE_KEY, 'users')
  @ApiOperation({ summary: 'Invite a new user to the tenant (ADMIN only)' })
  async invite(
    @CurrentUser() user: JwtUser,
    @Body() dto: InviteUserDto,
  ): Promise<InviteResult> {
    return this.usersService.invite(user.tenantId, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a user from the tenant (ADMIN only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}

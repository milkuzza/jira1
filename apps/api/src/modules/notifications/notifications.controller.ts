// apps/api/src/modules/notifications/notifications.controller.ts
// Notification REST endpoints: list, read, read-all, unread-count.

import {
  Controller,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser, JwtUser } from '../../decorators/current-user.decorator';
import { NotificationEntity } from '../../entities/notification.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List last 20 notifications' })
  async findAll(@CurrentUser() user: JwtUser): Promise<NotificationEntity[]> {
    return this.notificationsService.findAll(user.sub);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() user: JwtUser): Promise<{ count: number }> {
    return this.notificationsService.getUnreadCount(user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ): Promise<void> {
    return this.notificationsService.markRead(id, user.sub);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: JwtUser): Promise<void> {
    return this.notificationsService.markAllRead(user.sub);
  }
}

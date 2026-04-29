// apps/api/src/modules/auth/auth.controller.ts
// Auth endpoints: login, refresh, logout.

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, AuthResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from './public.decorator';
import { CurrentUser, JwtUser } from '../../decorators/current-user.decorator';
import { Request } from 'express';
import { Req } from '@nestjs/common';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponse> {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      // Login requires tenant context (subdomain routing)
      throw new (await import('@nestjs/common')).BadRequestException(
        'Tenant context required. Use subdomain routing (e.g., acme.app.localhost).',
      );
    }
    return this.authService.login(dto.email, dto.password, tenantId);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token (rotation with reuse detection)' })
  async refresh(@Body() dto: RefreshDto): Promise<AuthResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout — invalidate refresh token' })
  async logout(@CurrentUser() user: JwtUser): Promise<void> {
    if (user.tokenId) {
      await this.authService.logout(user.sub, user.tokenId);
    }
  }
}

// apps/api/src/modules/tenants/tenants.controller.ts
// Tenant endpoints: register (public), get current, update current (ADMIN only).

import { Controller, Post, Get, Patch, Body, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { TenantsService } from './tenants.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Public } from '../auth/public.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../../decorators/current-user.decorator';
import { TenantEntity } from '../../entities/tenant.entity';
import { AuthResponse } from '../auth/auth.service';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new tenant (organization) with admin user' })
  async register(@Body() dto: RegisterTenantDto): Promise<AuthResponse> {
    return this.tenantsService.register(dto);
  }

  @Get('check-slug')
  @Public()
  @ApiOperation({ summary: 'Check if a tenant slug is available' })
  async checkSlug(@Query('slug') slug: string): Promise<{ available: boolean }> {
    return this.tenantsService.checkSlug(slug);
  }

  @Get('current')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current tenant info' })
  async getCurrent(@Req() req: Request): Promise<TenantEntity> {
    // Prefer req.tenant set by TenantMiddleware (no extra DB query)
    if (req.tenant) {
      return req.tenant;
    }
    // Fallback: use tenantId from JWT
    const user = req.user as JwtUser;
    return this.tenantsService.getCurrent(user.tenantId);
  }

  @Patch('current')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current tenant (ADMIN only)' })
  async updateCurrent(
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: JwtUser,
  ): Promise<TenantEntity> {
    return this.tenantsService.updateCurrent(user.tenantId, dto);
  }
}

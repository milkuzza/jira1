// apps/api/src/billing/payments.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CurrentUser, JwtUser } from '../decorators/current-user.decorator';
import { Public } from '../modules/auth/public.decorator';
import type { PaymentVerifyResult } from './payments.service';

@ApiTags('Billing')
@Controller('billing')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать платёж в YooKassa для смены тарифа' })
  async checkout(
    @CurrentUser() user: JwtUser,
    @Body() body: { plan: string },
  ): Promise<{ url: string }> {
    if (!body.plan) throw new BadRequestException('Укажите тариф (plan)');
    const appUrl = process.env['APP_PUBLIC_URL'] ?? 'http://app.localhost';
    return this.paymentsService.createPayment(
      user.tenantId,
      body.plan,
      `${appUrl}/settings?upgraded=true`,
    );
  }

  @Get('verify')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Проверить статус последнего платежа тенанта в YooKassa' })
  async verify(@CurrentUser() user: JwtUser): Promise<PaymentVerifyResult> {
    return this.paymentsService.verifyPayment(user.tenantId);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вебхук YooKassa (уведомление о платеже)' })
  async webhook(
    @Body() body: Record<string, unknown>,
  ): Promise<{ ok: boolean }> {
    await this.paymentsService.handleWebhook(body as any);
    return { ok: true };
  }
}

// apps/api/src/billing/payments.service.ts
// YooKassa payment integration for plan upgrades.
// Verification flow (no webhook required):
//   1. createPayment() stores paymentId in Redis keyed by tenantId
//   2. User pays → YooKassa redirects to return_url
//   3. Frontend calls GET /billing/verify → verifyPayment() fetches status from YooKassa API
//   4. If succeeded → plan is updated in DB

import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { TenantEntity } from '../entities/tenant.entity';
import { REDIS_CLIENT } from '../constants';

interface YooKassaPaymentResponse {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled' | string;
  confirmation?: {
    type: string;
    confirmation_url?: string;
  };
  metadata?: Record<string, string>;
}

export type PaymentVerifyStatus = 'succeeded' | 'pending' | 'canceled' | 'not_found' | 'error';

export interface PaymentVerifyResult {
  status: PaymentVerifyStatus;
  plan?: string;
}

interface YooKassaWebhookBody {
  type?: string;
  event?: string;
  object?: YooKassaPaymentResponse;
}

const PLAN_PRICES: Record<string, { value: string; description: string }> = {
  PRO:        { value: '1990.00', description: 'Подписка Pro'        },
  ENTERPRISE: { value: '9990.00', description: 'Подписка Enterprise' },
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly shopId: string;
  private readonly secretKey: string;
  private readonly configured: boolean;

  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepo: Repository<TenantEntity>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {
    this.shopId    = process.env['YUKASSA_SHOP_ID']    ?? '';
    this.secretKey = process.env['YUKASSA_SECRET_KEY'] ?? '';
    this.configured = !!(this.shopId && this.secretKey);

    if (!this.configured) {
      this.logger.warn(
        'YUKASSA_SHOP_ID или YUKASSA_SECRET_KEY не заданы — ' +
        'эндпоинты оплаты вернут ошибку. Задайте переменные окружения для активации.',
      );
    }
  }

  // ─── Public methods ───────────────────────────────────────────────────────

  async createPayment(
    tenantId: string,
    plan: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    if (!this.configured) {
      throw new Error('YooKassa не настроена. Установите YUKASSA_SHOP_ID и YUKASSA_SECRET_KEY.');
    }

    const planConfig = PLAN_PRICES[plan];
    if (!planConfig) {
      throw new Error(`Неизвестный тариф: ${plan}`);
    }

    const idempotenceKey = uuidv4();
    const authHeader = 'Basic ' + Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');

    const body = {
      amount:       { value: planConfig.value, currency: 'RUB' },
      capture:      true,
      confirmation: { type: 'redirect', return_url: returnUrl },
      description:  planConfig.description,
      metadata:     { tenantId, plan },
    };

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization':    authHeader,
        'Idempotence-Key':  idempotenceKey,
        'Content-Type':     'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`YooKassa error: HTTP ${response.status} — ${errorText}`);
      throw new Error(`Ошибка создания платежа: ${response.status}`);
    }

    const payment = await response.json() as YooKassaPaymentResponse;
    const confirmUrl = payment.confirmation?.confirmation_url;

    if (!confirmUrl) {
      this.logger.error('YooKassa: отсутствует confirmation_url в ответе', payment);
      throw new Error('YooKassa не вернула ссылку для оплаты.');
    }

    // Store pending paymentId so verifyPayment() can look it up without a webhook
    await this.redis.set(
      `yookassa:pending:${tenantId}`,
      payment.id,
      'EX',
      7200, // 2 hours — enough for the user to complete payment
    );

    this.logger.log(`YooKassa payment created: ${payment.id} for tenant ${tenantId} plan ${plan}`);
    return { url: confirmUrl };
  }

  // ─── Verify (poll instead of webhook) ────────────────────────────────────

  async verifyPayment(tenantId: string): Promise<PaymentVerifyResult> {
    const paymentId = await this.redis.get(`yookassa:pending:${tenantId}`);
    if (!paymentId) {
      this.logger.debug(`verifyPayment: no pending payment for tenant ${tenantId}`);
      return { status: 'not_found' };
    }

    if (!this.configured) {
      return { status: 'error' };
    }

    const authHeader =
      'Basic ' + Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64');

    let payment: YooKassaPaymentResponse;
    try {
      const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
        headers: { Authorization: authHeader },
      });

      if (!response.ok) {
        this.logger.error(`YooKassa verify HTTP ${response.status} for payment ${paymentId}`);
        return { status: 'error' };
      }

      payment = (await response.json()) as YooKassaPaymentResponse;
    } catch (err) {
      this.logger.error(`YooKassa verify network error: ${err}`);
      return { status: 'error' };
    }

    this.logger.debug(`Payment ${paymentId} status: ${payment.status}`);

    if (payment.status === 'succeeded') {
      const plan = payment.metadata?.['plan'];
      const validPlans: TenantEntity['plan'][] = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];

      if (plan && validPlans.includes(plan as TenantEntity['plan'])) {
        await this.tenantRepo.update({ id: tenantId }, { plan: plan as TenantEntity['plan'] });
        await this.redis.del(`yookassa:pending:${tenantId}`);
        this.logger.log(`Tenant ${tenantId} upgraded to ${plan} via payment verification`);
        return { status: 'succeeded', plan };
      }

      this.logger.warn(`verifyPayment: invalid or missing plan in metadata (${plan})`);
      return { status: 'error' };
    }

    if (payment.status === 'canceled') {
      await this.redis.del(`yookassa:pending:${tenantId}`);
      return { status: 'canceled' };
    }

    // still pending / waiting_for_capture
    return { status: 'pending' };
  }

  async handleWebhook(body: YooKassaWebhookBody): Promise<void> {
    this.logger.debug(`YooKassa webhook received: ${body.event}`);

    if (body.event !== 'payment.succeeded') return;

    const payment = body.object;
    if (!payment || payment.status !== 'succeeded') return;

    const { tenantId, plan } = payment.metadata ?? {};
    if (!tenantId || !plan) {
      this.logger.warn('YooKassa webhook: отсутствует tenantId или plan в metadata');
      return;
    }

    const validPlans: TenantEntity['plan'][] = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
    if (!validPlans.includes(plan as TenantEntity['plan'])) {
      this.logger.warn(`YooKassa webhook: неизвестный план "${plan}"`);
      return;
    }

    await this.tenantRepo.update({ id: tenantId }, { plan: plan as TenantEntity['plan'] });
    this.logger.log(`Тариф тенанта ${tenantId} обновлён до ${plan} (YooKassa)`);
  }
}

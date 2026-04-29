// apps/web/src/api/billing.api.ts
// YooKassa billing API calls: checkout and payment verification.

import api from './client';

export interface PaymentVerifyResult {
  status: 'succeeded' | 'pending' | 'canceled' | 'not_found' | 'error';
  plan?: string;
}

export const billingApi = {
  /**
   * Создаёт платёж в YooKassa и возвращает URL для перенаправления.
   */
  createCheckout: async (plan: string): Promise<{ url: string }> => {
    const { data } = await api.post<{ url: string }>('/billing/checkout', { plan });
    return data;
  },

  /**
   * Проверяет статус последнего платежа тенанта напрямую через YooKassa API.
   * Используется вместо вебхука: вызывается при возврате пользователя после оплаты.
   * Если платёж прошёл успешно — бэкенд автоматически обновляет план тенанта.
   */
  verifyPayment: async (): Promise<PaymentVerifyResult> => {
    const { data } = await api.get<PaymentVerifyResult>('/billing/verify');
    return data;
  },
};

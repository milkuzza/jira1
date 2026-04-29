// apps/web/src/api/notifications.api.ts
// Notifications endpoints.

import api from './client';

export interface NotificationDto {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: async (): Promise<NotificationDto[]> => {
    const { data } = await api.get<NotificationDto[]>('/notifications');
    return data;
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await api.get<{ count: number }>('/notifications/unread-count');
    return data.count;
  },

  markRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },
};

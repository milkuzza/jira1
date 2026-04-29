// apps/web/src/api/client.ts
// Axios instance with JWT interceptors + queued token refresh (one refresh for concurrent 401s).

import { errorBus } from '../lib/errorBus';
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

// ─── Auth store reference (imported lazily to avoid circular deps) ───────────
// We import the store getter directly to avoid importing the module at module-level,
// which would cause circular dependency issues.
let getAccessToken: () => string | null = () => null;
let getRefreshToken: () => string | null = () => null;
let getWorkspaceSlug: () => string | null = () => null;
let setTokensFn: (access: string, refresh: string) => void = () => undefined;
let clearAuthFn: () => void = () => undefined;

export function configureClient(opts: {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  getWorkspaceSlug: () => string | null;
  setTokens: (access: string, refresh: string) => void;
  clearAuth: () => void;
}): void {
  getAccessToken = opts.getAccessToken;
  getRefreshToken = opts.getRefreshToken;
  getWorkspaceSlug = opts.getWorkspaceSlug;
  setTokensFn = opts.setTokens;
  clearAuthFn = opts.clearAuth;
}

// ─── Instance ─────────────────────────────────────────────────────────────────
export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://api.app.localhost',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach Bearer token + X-Tenant-Id ──────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = config.headers ? getAccessToken() : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const slug = getWorkspaceSlug();
  if (slug && config.headers) {
    config.headers['X-Tenant-Id'] = slug;
  }
  return config;
});

// ─── Refresh queue ────────────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  failedQueue = [];
}

// ─── Response interceptor: 401 → refresh → retry ──────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Broadcast non-401 errors to the UI via errorBus so toasts can be shown globally.
    if (error.response && error.response.status !== 401) {
      const data = error.response.data as { message?: string | string[] } | undefined;
      const msg = Array.isArray(data?.message)
        ? data.message[0]
        : (data?.message ?? `Error ${error.response.status}`);
      errorBus.emit(String(msg));
    }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't intercept refresh calls themselves
    if (originalRequest.url?.includes('/auth/refresh')) {
      clearAuthFn();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue concurrent requests while refresh is in progress
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        if (originalRequest.headers) {
          (originalRequest as InternalAxiosRequestConfig).headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');

      const response = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${import.meta.env.VITE_API_URL ?? 'http://api.app.localhost'}/auth/refresh`,
        { refreshToken },
      );

      const { accessToken, refreshToken: newRefresh } = response.data;
      setTokensFn(accessToken, newRefresh);
      processQueue(null, accessToken);

      if (originalRequest.headers) {
        (originalRequest as InternalAxiosRequestConfig).headers.Authorization = `Bearer ${accessToken}`;
      }
      return api(originalRequest);
    } catch (refreshError: unknown) {
      const data = (refreshError as { response?: { data?: { code?: string } } })?.response?.data;
      processQueue(refreshError, null);

      // Token reuse detected or refresh failed → full logout
      if (data?.code === 'TOKEN_REUSE_DETECTED' || data?.code === 'TOKEN_EXPIRED') {
        clearAuthFn();
        window.location.href = '/login';
      }

      clearAuthFn();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export async function apiFetch<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const config: import('axios').AxiosRequestConfig = {
    url,
    method: (options?.method as string) ?? 'GET',
    data: options?.body ? JSON.parse(options.body as string) : undefined,
  };
  const response = await api(config);
  return response.data as T;
}

export default api;

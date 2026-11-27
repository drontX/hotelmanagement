import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { ApiEnvelope } from '@/types';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const TOKEN_STORAGE_KEY = 'gsh_access_token';
export const REFRESH_TOKEN_STORAGE_KEY = 'gsh_refresh_token';

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  pendingQueue.forEach((item) => {
    if (error) {
      item.reject(error);
    } else {
      item.resolve(token);
    }
  });
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh-token')
    ) {
      if (typeof window === 'undefined') {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      if (!refreshToken) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (newToken) => {
              if (newToken && originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });
        const payload = unwrapApi<{ accessToken: string; refreshToken?: string }>(res);
        if (payload.accessToken) {
          localStorage.setItem(TOKEN_STORAGE_KEY, payload.accessToken);
          if (payload.refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, payload.refreshToken);
          }
          processQueue(null, payload.accessToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${payload.accessToken}`;
          }
          return api(originalRequest);
        }
        processQueue(error, null);
        return Promise.reject(error);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Unwraps standard backend envelope { success, data, message } or returns raw data.
 */
export function unwrapApi<T>(response: AxiosResponse<ApiEnvelope<T> | T> | ApiEnvelope<T> | T): T {
  if (response && typeof response === 'object' && 'data' in response && 'status' in response && 'headers' in response) {
    const axiosRes = response as AxiosResponse<ApiEnvelope<T> | T>;
    const body = axiosRes.data;
    if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
      return body.data as T;
    }
    return body as T;
  }

  if (response && typeof response === 'object' && 'data' in response) {
    const env = response as ApiEnvelope<T>;
    if (env.data !== undefined) {
      return env.data;
    }
  }

  return response as T;
}

export function extractApiErrorMessage(err: unknown, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string; errors?: Array<{ message?: string }> } | undefined;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (Array.isArray(data?.errors) && data.errors[0]?.message) return data.errors[0].message;
    if (err.code === 'ECONNABORTED') return 'Hết thời gian kết nối máy chủ.';
    if (!err.response) return 'Không thể kết nối đến máy chủ API.';
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

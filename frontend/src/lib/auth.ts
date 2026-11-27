import { API_BASE_URL, api, REFRESH_TOKEN_STORAGE_KEY, TOKEN_STORAGE_KEY, unwrapApi } from '@/lib/api';
import type { AuthResponse, User } from '@/types';

export interface RegisterPayload {
  name: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface SendOtpResponse {
  sent: boolean;
  expiresInSeconds?: number;
  devCode?: string;
  message?: string;
}

export function persistTokens(accessToken: string, refreshToken?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  }
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await api.post('/auth/login', payload);
  const data = unwrapApi<AuthResponse>(res);
  if (data.accessToken) {
    persistTokens(data.accessToken, data.refreshToken);
  }
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await api.post('/auth/register', payload);
  const data = unwrapApi<AuthResponse>(res);
  if (data.accessToken) {
    persistTokens(data.accessToken, data.refreshToken);
  }
  return data;
}

export async function sendOtp(phone: string): Promise<SendOtpResponse> {
  const res = await api.post('/auth/otp/send', { phone });
  return unwrapApi<SendOtpResponse>(res);
}

export async function verifyOtp(payload: {
  phone: string;
  code: string;
  name?: string;
}): Promise<AuthResponse> {
  const res = await api.post('/auth/otp-verify', payload);
  const data = unwrapApi<AuthResponse>(res);
  if (data.accessToken) {
    persistTokens(data.accessToken, data.refreshToken);
  }
  return data;
}

export async function socialLogin(payload: {
  provider: 'GOOGLE' | 'FACEBOOK' | 'ZALO';
  token?: string;
  code?: string;
}): Promise<AuthResponse> {
  const res = await api.post('/auth/social-login', payload);
  const data = unwrapApi<AuthResponse>(res);
  if (data.accessToken) {
    persistTokens(data.accessToken, data.refreshToken);
  }
  return data;
}

export function getSocialOAuthUrl(provider: 'google' | 'facebook' | 'zalo'): string {
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${base}/api/auth/oauth/${provider}`;
}

export async function getProfile(): Promise<User> {
  const res = await api.get('/auth/profile');
  return unwrapApi<User>(res);
}

export async function updateProfile(payload: Partial<Pick<User, 'name' | 'email' | 'phone' | 'idCard' | 'address'>>): Promise<User> {
  const res = await api.patch('/auth/profile', payload);
  return unwrapApi<User>(res);
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore backend logout errors on client token clear
  } finally {
    clearTokens();
  }
}

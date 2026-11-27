import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  AuthTokens,
  Booking,
  ChannelConnection,
  ChannelName,
  ChannelSyncLog,
  CleaningStatus,
  CreateBookingInput,
  DashboardSummary,
  ExtraChargeItem,
  HotelSettings,
  HousekeepingTask,
  Invoice,
  LoginPayload,
  MinibarReportItem,
  OccupancyReportPoint,
  PaymentProvider,
  PaymentType,
  PriceBreakdown,
  RevenueReportPoint,
  Room,
  RoomStatus,
  RoomType,
  StaffMember,
  StaffRole,
  TaxSummaryRow,
  UserProfile,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const TOKEN_STORAGE_KEY = 'hotel_admin_access_token';
export const REFRESH_TOKEN_STORAGE_KEY = 'hotel_admin_refresh_token';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      if (refreshToken && !originalRequest.url?.includes('/auth/login')) {
        originalRequest._retry = true;
        try {
          const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });
          const payload = refreshRes.data?.data ?? refreshRes.data;
          if (payload?.accessToken) {
            localStorage.setItem(TOKEN_STORAGE_KEY, payload.accessToken);
            originalRequest.headers.Authorization = `Bearer ${payload.accessToken}`;
            return apiClient(originalRequest);
          }
        } catch {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        }
      }
    }
    return Promise.reject(error);
  }
);

function unwrap<T>(res: { data: { data?: T } | T }): T {
  const body = res.data as { data?: T } | T;
  if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
    return body.data;
  }
  return body as T;
}

export function extractErrorMessage(err: unknown, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    return data?.message || data?.error || err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthTokens> => {
    const res = await apiClient.post('/auth/login', payload);
    return unwrap<AuthTokens>(res);
  },
  getProfile: async (): Promise<UserProfile> => {
    const res = await apiClient.get('/auth/profile');
    return unwrap<UserProfile>(res);
  },
};

export const roomsApi = {
  list: async (params?: { status?: RoomStatus; floor?: number; roomTypeId?: string }): Promise<Room[]> => {
    const res = await apiClient.get('/rooms', { params });
    return unwrap<Room[]>(res);
  },
  getById: async (id: string): Promise<Room> => {
    const res = await apiClient.get(`/rooms/${id}`);
    return unwrap<Room>(res);
  },
  create: async (payload: Partial<Room>): Promise<Room> => {
    const res = await apiClient.post('/rooms', payload);
    return unwrap<Room>(res);
  },
  update: async (id: string, payload: Partial<Room>): Promise<Room> => {
    const res = await apiClient.put(`/rooms/${id}`, payload);
    return unwrap<Room>(res);
  },
  updateStatus: async (id: string, status: RoomStatus): Promise<Room> => {
    const res = await apiClient.patch(`/rooms/${id}/status`, { status });
    return unwrap<Room>(res);
  },
  listRoomTypes: async (): Promise<RoomType[]> => {
    const res = await apiClient.get('/rooms/types');
    return unwrap<RoomType[]>(res);
  },
};

export const bookingsApi = {
  list: async (params?: { status?: BookingStatus; search?: string; from?: string; to?: string }): Promise<Booking[]> => {
    const res = await apiClient.get('/bookings', { params });
    return unwrap<Booking[]>(res);
  },
  getById: async (id: string): Promise<Booking> => {
    const res = await apiClient.get(`/bookings/${id}`);
    return unwrap<Booking>(res);
  },
  create: async (payload: CreateBookingInput & { extraServices?: ExtraChargeItem[] }): Promise<Booking> => {
    const res = await apiClient.post('/bookings', payload);
    return unwrap<Booking>(res);
  },
  checkAvailability: async (params: { checkIn: string; checkOut: string; guests?: number }): Promise<Room[]> => {
    const res = await apiClient.get('/bookings/availability', { params });
    return unwrap<Room[]>(res);
  },
  calculatePrice: async (payload: {
    roomId?: string;
    roomTypeId?: string;
    checkIn: string;
    checkOut: string;
    bookingType: 'HOURLY' | 'DAILY';
    hours?: number;
    childrenCount?: number;
    extraServices?: ExtraChargeItem[];
    redeemPoints?: number;
  }): Promise<PriceBreakdown> => {
    const res = await apiClient.post('/bookings/calculate-price', payload);
    return unwrap<PriceBreakdown>(res);
  },
  checkIn: async (id: string, payload?: { guestIdCard?: string; notes?: string }): Promise<Booking> => {
    const res = await apiClient.post(`/bookings/${id}/check-in`, payload || {});
    return unwrap<Booking>(res);
  },
  checkOut: async (
    id: string,
    payload?: { extraServices?: ExtraChargeItem[]; paymentMethod?: PaymentProvider }
  ): Promise<Booking> => {
    const res = await apiClient.post(`/bookings/${id}/check-out`, payload || {});
    return unwrap<Booking>(res);
  },
  cancel: async (id: string, reason?: string): Promise<Booking> => {
    const res = await apiClient.post(`/bookings/${id}/cancel`, { reason });
    return unwrap<Booking>(res);
  },
  initPayment: async (payload: {
    bookingId: string;
    provider: PaymentProvider;
    amount: number;
    paymentType: PaymentType;
  }): Promise<{ paymentUrl?: string; paymentId: string; status: string }> => {
    const res = await apiClient.post('/payments/create-intent', payload);
    return unwrap<{ paymentUrl?: string; paymentId: string; status: string }>(res);
  },
};

export const housekeepingApi = {
  listTasks: async (params?: { status?: CleaningStatus }): Promise<HousekeepingTask[]> => {
    const res = await apiClient.get('/housekeeping/tasks', { params });
    return unwrap<HousekeepingTask[]>(res);
  },
  assign: async (payload: {
    roomId: string;
    assignedToId: string;
    priority?: HousekeepingTask['priority'];
    notes?: string;
  }): Promise<HousekeepingTask> => {
    const res = await apiClient.post('/housekeeping/assign', payload);
    return unwrap<HousekeepingTask>(res);
  },
  updateStatus: async (
    id: string,
    payload: {
      status: CleaningStatus;
      notes?: string;
      minibarItems?: MinibarReportItem[];
      damageReport?: string;
    }
  ): Promise<HousekeepingTask> => {
    const res = await apiClient.patch(`/housekeeping/${id}/status`, payload);
    return unwrap<HousekeepingTask>(res);
  },
};

export const staffApi = {
  list: async (): Promise<StaffMember[]> => {
    const res = await apiClient.get('/staff');
    return unwrap<StaffMember[]>(res);
  },
  create: async (payload: {
    name: string;
    email?: string;
    phone?: string;
    password: string;
    staffRole: StaffRole;
  }): Promise<StaffMember> => {
    const res = await apiClient.post('/staff', payload);
    return unwrap<StaffMember>(res);
  },
  updateRole: async (id: string, staffRole: StaffRole): Promise<StaffMember> => {
    const res = await apiClient.put(`/staff/${id}/role`, { staffRole });
    return unwrap<StaffMember>(res);
  },
  deactivate: async (id: string): Promise<void> => {
    await apiClient.delete(`/staff/${id}`);
  },
};

export const channelsApi = {
  getStatus: async (): Promise<{ connections: ChannelConnection[]; logs: ChannelSyncLog[] }> => {
    const res = await apiClient.get('/channels/status');
    return unwrap<{ connections: ChannelConnection[]; logs: ChannelSyncLog[] }>(res);
  },
  sync: async (channel?: ChannelName): Promise<{ message: string; syncedAt: string }> => {
    const res = await apiClient.post('/channels/sync', channel ? { channel } : {});
    return unwrap<{ message: string; syncedAt: string }>(res);
  },
  toggleAutoSync: async (channel: ChannelName, autoSync: boolean): Promise<ChannelConnection> => {
    const res = await apiClient.patch(`/channels/${channel}/config`, { autoSync });
    return unwrap<ChannelConnection>(res);
  },
};

export const invoicesApi = {
  list: async (params?: { status?: string; search?: string }): Promise<Invoice[]> => {
    const res = await apiClient.get('/invoices', { params });
    return unwrap<Invoice[]>(res);
  },
  getByBooking: async (bookingId: string): Promise<Invoice> => {
    const res = await apiClient.get(`/invoices/booking/${bookingId}`);
    return unwrap<Invoice>(res);
  },
  create: async (payload: {
    bookingId: string;
    companyName?: string;
    taxCode?: string;
    companyAddress?: string;
    customerEmail?: string;
    paymentMethod?: PaymentProvider;
  }): Promise<Invoice> => {
    const res = await apiClient.post('/invoices', payload);
    return unwrap<Invoice>(res);
  },
  exportEInvoice: async (
    id: string,
    payload?: { companyName?: string; taxCode?: string; companyAddress?: string; customerEmail?: string }
  ): Promise<Invoice> => {
    const res = await apiClient.post(`/invoices/${id}/export-einvoice`, payload || {});
    return unwrap<Invoice>(res);
  },
};

export const reportsApi = {
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const res = await apiClient.get('/reports/summary');
    return unwrap<DashboardSummary>(res);
  },
  getRevenue: async (params?: { from?: string; to?: string; groupBy?: string }): Promise<RevenueReportPoint[]> => {
    const res = await apiClient.get('/reports/revenue', { params });
    return unwrap<RevenueReportPoint[]>(res);
  },
  getOccupancy: async (params?: { from?: string; to?: string }): Promise<OccupancyReportPoint[]> => {
    const res = await apiClient.get('/reports/occupancy', { params });
    return unwrap<OccupancyReportPoint[]>(res);
  },
  getTaxSummary: async (params?: { year?: number; quarter?: number }): Promise<TaxSummaryRow[]> => {
    const res = await apiClient.get('/reports/tax-summary', { params });
    return unwrap<TaxSummaryRow[]>(res);
  },
};

export const settingsApi = {
  get: async (): Promise<HotelSettings> => {
    const res = await apiClient.get('/settings');
    return unwrap<HotelSettings>(res);
  },
  update: async (payload: Partial<HotelSettings>): Promise<HotelSettings> => {
    const res = await apiClient.put('/settings', payload);
    return unwrap<HotelSettings>(res);
  },
};

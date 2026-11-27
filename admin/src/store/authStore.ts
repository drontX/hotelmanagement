import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  authApi,
  extractErrorMessage,
  REFRESH_TOKEN_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
} from '@/services/api';
import { Role, STAFF_DEFAULT_ROUTES, StaffRole } from '@/types';
import type { LoginPayload, UserProfile } from '@/types';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<UserProfile>;
  loginDemo: (staffRole: StaffRole) => UserProfile;
  fetchProfile: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
  hasRouteAccess: (path: string) => boolean;
  getDefaultRoute: () => string;
}

const DEMO_USERS: Record<StaffRole, UserProfile> = {
  OWNER: {
    id: 'demo-owner-01',
    name: 'Nguyễn Minh Quân',
    email: 'owner@grandsaigon.vn',
    phone: '0901234567',
    role: Role.ADMIN,
    staffRole: StaffRole.OWNER,
    isActive: true,
  },
  FRONTDESK: {
    id: 'demo-frontdesk-01',
    name: 'Trần Thảo Vy',
    email: 'frontdesk@grandsaigon.vn',
    phone: '0902345678',
    role: Role.ADMIN,
    staffRole: StaffRole.FRONTDESK,
    isActive: true,
  },
  ACCOUNTANT: {
    id: 'demo-accountant-01',
    name: 'Lê Hoàng Nam',
    email: 'accountant@grandsaigon.vn',
    phone: '0903456789',
    role: Role.ADMIN,
    staffRole: StaffRole.ACCOUNTANT,
    isActive: true,
  },
  HOUSEKEEPING: {
    id: 'demo-housekeeping-01',
    name: 'Phạm Thị Hoa',
    email: 'housekeeping@grandsaigon.vn',
    phone: '0904567890',
    role: Role.ADMIN,
    staffRole: StaffRole.HOUSEKEEPING,
    isActive: true,
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (payload: LoginPayload) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authApi.login(payload);
          localStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.refreshToken);
          }
          const user: UserProfile = {
            ...data.user,
            staffRole: data.user.staffRole || StaffRole.FRONTDESK,
          };
          set({
            user,
            token: data.accessToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return user;
        } catch (err) {
          const msg = extractErrorMessage(err, 'Đăng nhập thất bại. Vui lòng kiểm tra thông tin.');
          set({ isLoading: false, error: msg });
          throw new Error(msg);
        }
      },

      loginDemo: (staffRole: StaffRole) => {
        const user = DEMO_USERS[staffRole];
        const demoToken = `demo-token-${staffRole.toLowerCase()}`;
        localStorage.setItem(TOKEN_STORAGE_KEY, demoToken);
        set({
          user,
          token: demoToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return user;
      },

      fetchProfile: async () => {
        const token = get().token || localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!token || token.startsWith('demo-token-')) return;
        try {
          const user = await authApi.getProfile();
          set({
            user: {
              ...user,
              staffRole: user.staffRole || StaffRole.FRONTDESK,
            },
            isAuthenticated: true,
          });
        } catch {
          // Keep current state if offline or handle via interceptor
        }
      },

      logout: () => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),

      hasRouteAccess: (path: string) => {
        const user = get().user;
        if (!user) return false;
        const allowedRoutes = STAFF_DEFAULT_ROUTES[user.staffRole] || [];
        return allowedRoutes.includes(path);
      },

      getDefaultRoute: () => {
        const user = get().user;
        if (!user) return '/login';
        const allowedRoutes = STAFF_DEFAULT_ROUTES[user.staffRole];
        return allowedRoutes?.[0] || '/';
      },
    }),
    {
      name: 'hotel-admin-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

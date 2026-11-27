'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { clearTokens, getProfile, logout as apiLogout, persistTokens } from '@/lib/auth';
import { TOKEN_STORAGE_KEY } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken?: string) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  refreshProfile: () => Promise<User | null>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, accessToken, refreshToken) => {
        persistTokens(accessToken, refreshToken);
        set({
          user,
          accessToken,
          refreshToken: refreshToken ?? get().refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      setUser: (user) => {
        set({
          user,
          isAuthenticated: Boolean(user && (get().accessToken || typeof window !== 'undefined' && localStorage.getItem(TOKEN_STORAGE_KEY))),
        });
      },

      setLoading: (isLoading) => set({ isLoading }),

      refreshProfile: async () => {
        const token =
          get().accessToken ||
          (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null);
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return null;
        }
        set({ isLoading: true });
        try {
          const user = await getProfile();
          set({ user, accessToken: token, isAuthenticated: true, isLoading: false });
          return user;
        } catch {
          clearTokens();
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return null;
        }
      },

      logout: async () => {
        await apiLogout();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: 'gsh-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

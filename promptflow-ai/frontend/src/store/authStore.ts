// frontend/src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
          set({ user: data.user, token: data.accessToken, refreshToken: data.refreshToken, isLoading: false });
        } catch (err: any) {
          set({ error: err.response?.data?.error || 'Login failed', isLoading: false });
          throw err;
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/register', { email, password, name });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
          set({ user: data.user, token: data.accessToken, refreshToken: data.refreshToken, isLoading: false });
        } catch (err: any) {
          set({ error: err.response?.data?.error || 'Registration failed', isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout', { refreshToken: get().refreshToken });
        } catch {}
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null, refreshToken: null });
      },

      clearError: () => set({ error: null }),
    }),
    { name: 'auth-storage', partialize: (s) => ({ token: s.token, refreshToken: s.refreshToken, user: s.user }) }
  )
);

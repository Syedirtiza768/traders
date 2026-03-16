import { create } from 'zustand';
import { authApi } from '../lib/api';

interface AuthState {
  isAuthenticated: boolean;
  user: string | null;
  fullName: string | null;
  roles: string[];
  loading: boolean;
  initialized: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  fullName: null,
  roles: [],
  loading: false,
  initialized: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ loading: true, error: null });
    try {
      await authApi.login(username, password);
      const res = await authApi.getLoggedUser();
      const rolesRes = await fetch('/api/method/trader_app.api.settings.get_current_user_roles', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Frappe-CSRF-Token': document.cookie
            .split('; ')
            .find((c) => c.startsWith('csrf_token='))
            ?.split('=')[1] || '',
        },
      }).then((r) => r.json());

      set({
        isAuthenticated: true,
        user: res.data.message,
        fullName: res.data.message,
        roles: rolesRes.message || [],
        loading: false,
        initialized: true,
      });
    } catch (err: any) {
      const message =
        err.response?.data?.message || err.response?.data?.exc || 'Login failed. Please check your credentials.';
      set({ loading: false, error: message, isAuthenticated: false, initialized: true });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    set({ isAuthenticated: false, user: null, fullName: null, roles: [], initialized: true, loading: false });
  },

  checkAuth: async () => {
    set({ loading: true });
    try {
      const res = await authApi.getLoggedUser();
      if (res.data.message && res.data.message !== 'Guest') {
        const rolesRes = await fetch('/api/method/trader_app.api.settings.get_current_user_roles', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'X-Frappe-CSRF-Token': document.cookie
              .split('; ')
              .find((c) => c.startsWith('csrf_token='))
              ?.split('=')[1] || '',
          },
        }).then((r) => r.json());

        set({
          isAuthenticated: true,
          user: res.data.message,
          fullName: res.data.message,
          roles: rolesRes.message || [],
          loading: false,
          initialized: true,
        });
      } else {
        set({ isAuthenticated: false, user: null, fullName: null, roles: [], loading: false, initialized: true });
      }
    } catch {
      set({ isAuthenticated: false, user: null, fullName: null, roles: [], loading: false, initialized: true });
    }
  },

  clearError: () => set({ error: null }),
}));

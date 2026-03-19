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
      const rolesRes = await fetch('/api/method/trader_app.api.settings.get_current_user_roles', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': document.cookie
            .split('; ')
            .find((c) => c.startsWith('csrf_token='))
            ?.split('=')[1] || '',
        },
        body: JSON.stringify({}),
      }).then((r) => r.json());

      const currentUser = document.cookie
        .split('; ')
        .find((c) => c.startsWith('full_name='))
        ?.split('=')[1] || username;

      set({
        isAuthenticated: true,
        user: currentUser,
        fullName: currentUser,
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
      const rolesRes = await fetch('/api/method/trader_app.api.settings.get_current_user_roles', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': document.cookie
            .split('; ')
            .find((c) => c.startsWith('csrf_token='))
            ?.split('=')[1] || '',
        },
        body: JSON.stringify({}),
      }).then((r) => r.json());

      if (Array.isArray(rolesRes.message)) {
        const currentUser = document.cookie
          .split('; ')
          .find((c) => c.startsWith('full_name='))
          ?.split('=')[1] || 'User';

        set({
          isAuthenticated: true,
          user: currentUser,
          fullName: currentUser,
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

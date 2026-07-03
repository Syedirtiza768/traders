import { create } from 'zustand';
import { authApi, settingsApi } from '../lib/api';
import { applyTraderUiTheme, clearTraderUiTheme, normaliseUiPrefs } from '../lib/traderUiTheme';
import { useCompanyStore } from './companyStore';
import { useTenantStore } from './tenantStore';

interface AuthState {
  isAuthenticated: boolean;
  user: string | null;
  fullName: string | null;
  roles: string[];
  initialized: boolean;
  loading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

async function hydrateUiFromServer(): Promise<void> {
  try {
    const res = await settingsApi.get();
    const message = res.data?.message as {
      ui?: Record<string, unknown>;
      tenant?: import('./tenantStore').TenantConfig;
      multitenant_enabled?: boolean;
    };
    if (message?.ui) applyTraderUiTheme(normaliseUiPrefs(message.ui));
    if (message?.tenant) {
      useTenantStore.getState().hydrateFromSettings(message.tenant, message.multitenant_enabled);
    }
  } catch {
    /* settings optional at bootstrap */
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  fullName: null,
  roles: [],
  initialized: false,
  loading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ loading: true, error: null });
    try {
      await authApi.login(username, password);
      const res = await authApi.getLoggedUser();
      let roles: string[] = [];
      try {
        const rolesRes = await authApi.getRoles();
        roles = rolesRes.data.message || [];
      } catch { /* ignore */ }
      set({
        isAuthenticated: true,
        user: res.data.message,
        fullName: res.data.message,
        roles,
        initialized: true,
        loading: false,
      });
      void hydrateUiFromServer();
      void useTenantStore.getState().load();
      void useCompanyStore.getState().load();
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
    clearTraderUiTheme();
    useCompanyStore.setState({
      company: null,
      abbr: null,
      currency: null,
      companies: [],
      initialized: false,
      revision: 0,
    });
    useTenantStore.getState().reset();
    set({ isAuthenticated: false, user: null, fullName: null, roles: [], initialized: true });
  },

  checkAuth: async () => {
    try {
      const res = await authApi.getLoggedUser();
      if (res.data.message && res.data.message !== 'Guest') {
        let roles: string[] = [];
        try {
          const rolesRes = await authApi.getRoles();
          roles = rolesRes.data.message || [];
        } catch { /* ignore */ }
        set({
          isAuthenticated: true,
          user: res.data.message,
          fullName: res.data.message,
          roles,
          initialized: true,
        });
        void hydrateUiFromServer();
        void useTenantStore.getState().load();
        void useCompanyStore.getState().load();
      } else {
        clearTraderUiTheme();
        useTenantStore.getState().reset();
        set({ isAuthenticated: false, user: null, roles: [], initialized: true });
      }
    } catch {
      clearTraderUiTheme();
      useTenantStore.getState().reset();
      set({ isAuthenticated: false, user: null, roles: [], initialized: true });
    }
  },

  clearError: () => set({ error: null }),
}));

import { create } from 'zustand';
import { tenantApi } from '../lib/api';
import { applyTenantBranding, clearTenantBranding, isTenantBlocked } from '../lib/tenantBranding';

export type TenantConfig = {
  tenant_id: string;
  tenant_name: string;
  status: string;
  company?: string;
  subscription_plan?: string;
  billing_status?: string;
  max_users?: number;
  user_count?: number;
  timezone?: string;
  logo?: string;
  branding?: Record<string, unknown>;
  enabled_modules?: string[];
};

interface TenantState {
  enabled: boolean;
  isSuperAdmin: boolean;
  isBlocked: boolean;
  tenant: TenantConfig | null;
  initialized: boolean;
  loading: boolean;

  load: () => Promise<void>;
  hydrateFromSettings: (tenant: TenantConfig | null | undefined, multitenantEnabled?: boolean) => void;
  isModuleEnabled: (moduleKey: string) => boolean;
  reset: () => void;
}

const DEFAULT_MODULES = [
  'dashboard',
  'sales',
  'purchases',
  'inventory',
  'finance',
  'reports',
  'customers',
  'suppliers',
  'operations',
  'settings',
];

export const useTenantStore = create<TenantState>((set, get) => ({
  enabled: false,
  isSuperAdmin: false,
  isBlocked: false,
  tenant: null,
  initialized: false,
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const statusRes = await tenantApi.getStatus();
      const status = statusRes.data.message || {};
      const enabled = Boolean(status.enabled);
      const isSuperAdmin = Boolean(status.is_super_admin);

      if (!enabled) {
        clearTenantBranding();
        set({
          enabled: false,
          isSuperAdmin,
          isBlocked: false,
          tenant: null,
          initialized: true,
          loading: false,
        });
        return;
      }

      let tenant: TenantConfig | null = status.tenant || null;
      if (!tenant && !isSuperAdmin) {
        const configRes = await tenantApi.getConfig();
        const message = configRes.data.message || {};
        if (message.enabled !== false) {
          tenant = message as TenantConfig;
        }
      }

      const isBlocked = Boolean(tenant && isTenantBlocked(tenant.status));
      if (tenant && !isBlocked) {
        applyTenantBranding(tenant);
      } else {
        clearTenantBranding();
      }

      set({
        enabled: true,
        isSuperAdmin,
        isBlocked,
        tenant,
        initialized: true,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to load tenant context:', err);
      set({ initialized: true, loading: false });
    }
  },

  hydrateFromSettings: (tenant, multitenantEnabled = false) => {
    if (!multitenantEnabled || !tenant) {
      return;
    }
    const isBlocked = isTenantBlocked(tenant.status);
    if (!isBlocked) {
      applyTenantBranding(tenant);
    }
    set({
      enabled: true,
      tenant,
      isBlocked,
      initialized: true,
    });
  },

  isModuleEnabled: (moduleKey: string) => {
    const state = get();
    if (!state.enabled) return true;
    const modules = state.tenant?.enabled_modules;
    if (!modules || modules.length === 0) return DEFAULT_MODULES.includes(moduleKey);
    return modules.includes(moduleKey);
  },

  reset: () => {
    clearTenantBranding();
    set({
      enabled: false,
      isSuperAdmin: false,
      isBlocked: false,
      tenant: null,
      initialized: false,
      loading: false,
    });
  },
}));

import { create } from 'zustand';
import { companyApi, registerActiveCompanyGetter } from '../lib/api';
import { setActiveCurrency } from '../lib/utils';

export type CompanyOption = {
  name: string;
  abbr: string;
  default_currency?: string;
  country?: string;
  multi_currency_enabled?: boolean;
  components_enabled?: boolean;
  opportunity_enabled?: boolean;
  ar_enabled?: boolean;
  customer_pack_enabled?: boolean;
};

interface CompanyState {
  company: string | null;
  abbr: string | null;
  currency: string | null;
  multiCurrencyEnabled: boolean;
  componentsEnabled: boolean;
  opportunityEnabled: boolean;
  arEnabled: boolean;
  customerPackEnabled: boolean;
  companies: CompanyOption[];
  initialized: boolean;
  loading: boolean;
  revision: number;

  load: () => Promise<void>;
  setCompany: (company: string) => Promise<void>;
  setComponentsEnabled: (enabled: boolean) => void;
  setOpportunityEnabled: (enabled: boolean) => void;
  setArEnabled: (enabled: boolean) => void;
  setCustomerPackEnabled: (enabled: boolean) => void;
}

registerActiveCompanyGetter(() => useCompanyStore.getState().company || undefined);

export const useCompanyStore = create<CompanyState>((set, get) => ({
  company: null,
  abbr: null,
  currency: null,
  multiCurrencyEnabled: false,
  componentsEnabled: false,
  opportunityEnabled: false,
  arEnabled: false,
  customerPackEnabled: false,
  companies: [],
  initialized: false,
  loading: false,
  revision: 0,

  load: async () => {
    set({ loading: true });
    try {
      const [companiesRes, activeRes] = await Promise.all([
        companyApi.getCompanies(),
        companyApi.getActive(),
      ]);
      const companies = (companiesRes.data.message || []) as CompanyOption[];
      const active = activeRes.data.message || {};
      const company = active.company || companies[0]?.name || null;
      const currency = active.default_currency || companies.find((c) => c.name === company)?.default_currency || null;
      setActiveCurrency(currency);

      set({
        companies,
        company,
        abbr: active.abbr || companies.find((c) => c.name === company)?.abbr || null,
        currency,
        multiCurrencyEnabled: Boolean(active.multi_currency_enabled),
        componentsEnabled: Boolean(active.components_enabled),
        opportunityEnabled: Boolean(active.opportunity_enabled),
        arEnabled: Boolean(active.ar_enabled),
        customerPackEnabled: Boolean(active.customer_pack_enabled),
        initialized: true,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to load company context:', err);
      set({ initialized: true, loading: false });
    }
  },

  setCompany: async (company: string) => {
    if (!company || company === get().company) return;
    set({ loading: true });
    try {
      const res = await companyApi.setActive(company);
      const active = res.data.message?.active || {};
      const currency = active.default_currency || get().companies.find((c) => c.name === company)?.default_currency || null;
      setActiveCurrency(currency);
      set((state) => ({
        company: active.company || company,
        abbr: active.abbr || state.companies.find((c) => c.name === company)?.abbr || null,
        currency,
        multiCurrencyEnabled: Boolean(active.multi_currency_enabled),
        componentsEnabled: Boolean(active.components_enabled),
        opportunityEnabled: Boolean(active.opportunity_enabled),
        arEnabled: Boolean(active.ar_enabled),
        customerPackEnabled: Boolean(active.customer_pack_enabled),
        loading: false,
        revision: state.revision + 1,
      }));
      window.dispatchEvent(new CustomEvent('trader-company-changed', { detail: { company } }));
    } catch (err) {
      console.error('Failed to switch company:', err);
      set({ loading: false });
      throw err;
    }
  },

  setComponentsEnabled: (enabled: boolean) => {
    set({ componentsEnabled: enabled });
  },

  setOpportunityEnabled: (enabled: boolean) => {
    set({ opportunityEnabled: enabled });
  },

  setArEnabled: (enabled: boolean) => {
    set({ arEnabled: enabled });
  },

  setCustomerPackEnabled: (enabled: boolean) => {
    set({ customerPackEnabled: enabled });
  },
}));

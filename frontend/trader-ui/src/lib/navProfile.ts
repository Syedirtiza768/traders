/**
 * Tenant nav profiles — child-level visibility beyond coarse module keys.
 * Backed by Trader Tenant.workflow_prefs JSON.
 */

export type NavProfileId = 'standard' | 'components_daybook';

/** Hideable nav / route features (child-level). */
export type NavFeatureKey =
  | 'sales_invoices'
  | 'pos'
  | 'delivery_challans'
  | 'sales_orders'
  | 'quotations'
  | 'opportunities'
  | 'purchase_invoices'
  | 'purchase_orders'
  | 'requisitions'
  | 'rfqs'
  | 'inventory_items'
  | 'bundles'
  | 'warehouse_stock'
  | 'stock_movements'
  | 'sku_catalog'
  | 'opening_stock'
  | 'stock_valuation'
  | 'stock_take'
  | 'finance_overview'
  | 'payments'
  | 'journals'
  | 'day_book'
  | 'receivables'
  | 'payables'
  | 'day_close'
  | 'operations'
  | 'reports';

export type WorkflowPrefs = {
  nav_profile?: NavProfileId | string;
  hide_nav?: NavFeatureKey[] | string[];
};

/** Features hidden by the components daybook wholesale profile. */
export const COMPONENTS_DAYBOOK_HIDE: NavFeatureKey[] = [
  'sales_invoices',
  'pos',
  'delivery_challans',
  'sales_orders',
  'quotations',
  'opportunities',
  'purchase_invoices',
  'purchase_orders',
  'requisitions',
  'rfqs',
  'inventory_items',
  'bundles',
  'warehouse_stock',
  'stock_movements',
  'finance_overview',
  'payments',
  'journals',
  'operations',
  'reports',
];

/** Modules enabled when applying the daybook profile (backend + UI hint). */
export const COMPONENTS_DAYBOOK_MODULES = [
  'dashboard',
  'sales',
  'purchases',
  'inventory',
  'finance',
  'customers',
  'suppliers',
  'components',
  'settings',
] as const;

const PATH_FEATURE_RULES: Array<{ prefix: string; feature: NavFeatureKey; exact?: boolean }> = [
  { prefix: '/sales/pos', feature: 'pos' },
  { prefix: '/sales/opportunities', feature: 'opportunities' },
  { prefix: '/sales/challans', feature: 'delivery_challans' },
  { prefix: '/sales/orders', feature: 'sales_orders' },
  { prefix: '/sales/quotations', feature: 'quotations' },
  { prefix: '/sales/proforma', feature: 'quotations' },
  { prefix: '/sales/documents', feature: 'sales_invoices' },
  { prefix: '/sales/new', feature: 'sales_invoices' },
  { prefix: '/sales/returns', feature: 'sales_invoices' },
  { prefix: '/sales/dispatches', feature: 'sales_invoices' },
  { prefix: '/sales', feature: 'sales_invoices', exact: true },
  { prefix: '/purchases/orders', feature: 'purchase_orders' },
  { prefix: '/purchases/requisitions', feature: 'requisitions' },
  { prefix: '/purchases/rfqs', feature: 'rfqs' },
  { prefix: '/purchases/documents', feature: 'purchase_invoices' },
  { prefix: '/purchases/new', feature: 'purchase_invoices' },
  { prefix: '/purchases/returns', feature: 'purchase_invoices' },
  { prefix: '/purchases/receipts', feature: 'purchase_invoices' },
  { prefix: '/purchases', feature: 'purchase_invoices', exact: true },
  { prefix: '/inventory/bundles', feature: 'bundles' },
  { prefix: '/inventory/warehouse', feature: 'warehouse_stock' },
  { prefix: '/inventory/movements', feature: 'stock_movements' },
  { prefix: '/inventory/catalog', feature: 'sku_catalog' },
  { prefix: '/inventory/opening-stock', feature: 'opening_stock' },
  { prefix: '/inventory/stock-valuation', feature: 'stock_valuation' },
  { prefix: '/inventory/stock-take', feature: 'stock_take' },
  { prefix: '/inventory/items', feature: 'inventory_items' },
  { prefix: '/inventory', feature: 'inventory_items', exact: true },
  { prefix: '/finance/journals', feature: 'journals' },
  { prefix: '/finance/payments', feature: 'payments' },
  { prefix: '/finance/day-book', feature: 'day_book' },
  { prefix: '/finance/receivables', feature: 'receivables' },
  { prefix: '/finance/payables', feature: 'payables' },
  { prefix: '/finance/day-close', feature: 'day_close' },
  { prefix: '/finance', feature: 'finance_overview', exact: true },
  { prefix: '/operations', feature: 'operations' },
  { prefix: '/reports', feature: 'reports' },
];

export function parseWorkflowPrefs(raw: unknown): WorkflowPrefs {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as WorkflowPrefs;
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') {
    return raw as WorkflowPrefs;
  }
  return {};
}

export function resolveNavProfile(prefs?: WorkflowPrefs | null): NavProfileId {
  const id = prefs?.nav_profile;
  if (id === 'components_daybook') return 'components_daybook';
  return 'standard';
}

export function resolveHiddenNavFeatures(prefs?: WorkflowPrefs | null): Set<string> {
  const profile = resolveNavProfile(prefs);
  const hidden = new Set<string>();
  if (profile === 'components_daybook') {
    for (const key of COMPONENTS_DAYBOOK_HIDE) hidden.add(key);
  }
  for (const key of prefs?.hide_nav || []) {
    if (key) hidden.add(String(key));
  }
  return hidden;
}

export function isNavFeatureHidden(
  feature: NavFeatureKey | string | undefined,
  prefs?: WorkflowPrefs | null,
): boolean {
  if (!feature) return false;
  return resolveHiddenNavFeatures(prefs).has(feature);
}

/** Map a pathname to a hideable nav feature (if any). */
export function navFeatureForPath(path: string): NavFeatureKey | undefined {
  const clean = path.split('?')[0] || path;
  for (const rule of PATH_FEATURE_RULES) {
    if (rule.exact) {
      if (clean === rule.prefix) return rule.feature;
      continue;
    }
    if (clean === rule.prefix || clean.startsWith(rule.prefix + '/')) {
      return rule.feature;
    }
  }
  return undefined;
}

/** Local calendar date YYYY-MM-DD (avoids UTC day-shift). */
export function localTodayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Tenant module keys — must match Trader Tenant Module.options in the backend.
 */
export type TenantModuleKey =
  | 'dashboard'
  | 'sales'
  | 'purchases'
  | 'inventory'
  | 'finance'
  | 'reports'
  | 'customers'
  | 'suppliers'
  | 'operations'
  | 'components'
  | 'pos'
  | 'settings';

export const TENANT_MODULE_KEYS: TenantModuleKey[] = [
  'dashboard',
  'sales',
  'purchases',
  'inventory',
  'finance',
  'reports',
  'customers',
  'suppliers',
  'operations',
  'components',
  'pos',
  'settings',
];

export const MODULE_LABELS: Record<TenantModuleKey, string> = {
  dashboard: 'Dashboard',
  sales: 'Sales',
  purchases: 'Purchases',
  inventory: 'Inventory',
  finance: 'Finance',
  reports: 'Reports',
  customers: 'Customers',
  suppliers: 'Suppliers',
  operations: 'Operations',
  components: 'Components Trading',
  pos: 'POS',
  settings: 'Settings',
};

/** Components-trading paths require the components tenant module. */
export function isComponentsPath(path: string): boolean {
  return (
    path.startsWith('/inventory/catalog') ||
    path.startsWith('/inventory/opening-stock') ||
    path.startsWith('/inventory/stock-valuation') ||
    path.startsWith('/inventory/stock-take') ||
    path.startsWith('/finance/day-book') ||
    path.startsWith('/finance/receivables') ||
    path.startsWith('/finance/payables') ||
    path.startsWith('/finance/day-close') ||
    path.startsWith('/components')
  );
}

/** Primary tenant module for a route path (used by route guards). */
export function moduleForPath(path: string): TenantModuleKey | undefined {
  if (path === '/' || path === '') return 'dashboard';
  if (path.startsWith('/sales/pos')) return 'pos';
  if (path.startsWith('/sales')) return 'sales';
  if (path.startsWith('/purchases')) return 'purchases';
  if (isComponentsPath(path)) return 'components';
  if (path.startsWith('/inventory')) return 'inventory';
  if (path.startsWith('/customers')) return 'customers';
  if (path.startsWith('/suppliers')) return 'suppliers';
  if (path.startsWith('/finance')) return 'finance';
  if (path.startsWith('/operations')) return 'operations';
  if (path.startsWith('/reports')) return 'reports';
  if (path.startsWith('/settings')) return 'settings';
  return undefined;
}

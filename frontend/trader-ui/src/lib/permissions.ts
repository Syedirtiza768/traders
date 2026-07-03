/**
 * Canonical Frappe role names (created by setup/__init__.py).
 * The two legacy aliases below are retained for backward compatibility with
 * sites that were provisioned before the rename (pre-1.1 installations).
 */
export type TraderRole =
  | 'System Manager'
  | 'Trader Super Admin'
  | 'Trader Admin'
  | 'Trader Sales Manager'
  | 'Trader Purchase Manager'
  | 'Trader Inventory Manager'
  | 'Trader Warehouse Manager'   // legacy alias → same caps as Inventory Manager
  | 'Trader Finance Manager'
  | 'Trader Accountant'          // legacy alias → same caps as Finance Manager
  | 'Trader Staff'
  | 'Trader Viewer';

export type AppCapability =
  | 'superadmin:view'
  | 'superadmin:manage_tenants'
  | 'dashboard:view'
  | 'sales:view'
  | 'sales:approve'
  | 'purchases:view'
  | 'purchases:approve'
  | 'inventory:view'
  | 'inventory:execute'
  | 'customers:view'
  | 'suppliers:view'
  | 'finance:view'
  | 'reports:view'
  | 'settings:view'
  | 'operations:view'
  | 'components:view'
  | 'components:execute';

const FULL_ACCESS: AppCapability[] = [
  'dashboard:view',
  'sales:view',
  'sales:approve',
  'purchases:view',
  'purchases:approve',
  'inventory:view',
  'inventory:execute',
  'customers:view',
  'suppliers:view',
  'finance:view',
  'reports:view',
  'settings:view',
  'operations:view',
  'components:view',
  'components:execute',
];

const INVENTORY_MANAGER_CAPS: AppCapability[] = [
  'dashboard:view',
  'inventory:view',
  'inventory:execute',
  'reports:view',
  'operations:view',
  'components:view',
  'components:execute',
];

const FINANCE_MANAGER_CAPS: AppCapability[] = [
  'dashboard:view',
  'finance:view',
  'reports:view',
  'customers:view',
  'suppliers:view',
  'operations:view',
  'components:view',
];

const STAFF_CAPS: AppCapability[] = [
  'dashboard:view',
  'sales:view',
  'purchases:view',
  'inventory:view',
  'customers:view',
  'suppliers:view',
  'operations:view',
  'components:view',
];

const VIEWER_CAPS: AppCapability[] = [
  'dashboard:view',
  'sales:view',
  'purchases:view',
  'inventory:view',
  'customers:view',
  'suppliers:view',
  'finance:view',
  'reports:view',
  'operations:view',
  'components:view',
];

const SUPER_ADMIN_CAPS: AppCapability[] = [
  'superadmin:view',
  'superadmin:manage_tenants',
];

const ROLE_CAPABILITIES: Record<string, AppCapability[]> = {
  /* ── Platform admins ── */
  'Trader Super Admin': SUPER_ADMIN_CAPS,

  /* ── System-level admins (full access) ── */
  'System Manager': FULL_ACCESS,
  'Trader Admin': FULL_ACCESS,

  /* ── Functional roles ── */
  'Trader Sales Manager': [
    'dashboard:view',
    'sales:view',
    'sales:approve',
    'customers:view',
    'finance:view',
    'reports:view',
    'operations:view',
    'components:view',
    'components:execute',
  ],
  'Trader Purchase Manager': [
    'dashboard:view',
    'purchases:view',
    'purchases:approve',
    'suppliers:view',
    'finance:view',
    'reports:view',
    'operations:view',
    'components:view',
    'components:execute',
  ],
  'Trader Inventory Manager': INVENTORY_MANAGER_CAPS,
  'Trader Finance Manager': FINANCE_MANAGER_CAPS,

  /* ── Legacy aliases (pre-1.1 installations) ── */
  'Trader Warehouse Manager': INVENTORY_MANAGER_CAPS,
  'Trader Accountant': FINANCE_MANAGER_CAPS,

  /* ── Tenant-level generic roles ── */
  'Trader Staff': STAFF_CAPS,
  'Trader Viewer': VIEWER_CAPS,
};

export function getCapabilitiesForRoles(roles: string[] | null | undefined): Set<AppCapability> {
  const capabilities = new Set<AppCapability>();
  (roles || []).forEach((role) => {
    (ROLE_CAPABILITIES[role] || []).forEach((capability) => capabilities.add(capability));
  });

  if (capabilities.size === 0) {
    capabilities.add('dashboard:view');
  }

  return capabilities;
}

export function hasCapability(roles: string[] | null | undefined, capability: AppCapability): boolean {
  return getCapabilitiesForRoles(roles).has(capability);
}

export type TraderRole =
  | 'System Manager'
  | 'Trader Admin'
  | 'Trader Sales Manager'
  | 'Trader Purchase Manager'
  | 'Trader Inventory Manager'
  | 'Trader Warehouse Manager'   // DB alias → maps to Inventory Manager
  | 'Trader Finance Manager'
  | 'Trader Accountant';          // DB alias → maps to Finance Manager

export type AppCapability =
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
  | 'operations:view';

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
];

const ROLE_CAPABILITIES: Record<string, AppCapability[]> = {
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
  ],
  'Trader Purchase Manager': [
    'dashboard:view',
    'purchases:view',
    'purchases:approve',
    'suppliers:view',
    'finance:view',
    'reports:view',
    'operations:view',
  ],
  'Trader Inventory Manager': [
    'dashboard:view',
    'inventory:view',
    'inventory:execute',
    'reports:view',
    'operations:view',
  ],
  /* DB alias for Inventory Manager */
  'Trader Warehouse Manager': [
    'dashboard:view',
    'inventory:view',
    'inventory:execute',
    'reports:view',
    'operations:view',
  ],
  'Trader Finance Manager': [
    'dashboard:view',
    'finance:view',
    'reports:view',
    'customers:view',
    'suppliers:view',
    'operations:view',
  ],
  /* DB alias for Finance Manager */
  'Trader Accountant': [
    'dashboard:view',
    'finance:view',
    'reports:view',
    'customers:view',
    'suppliers:view',
    'operations:view',
  ],
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

/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import { isComponentsPath, moduleForPath, TENANT_MODULE_KEYS } from './tenantModules';

describe('tenantModules', () => {
  it('maps core business paths to tenant modules', () => {
    expect(moduleForPath('/')).toBe('dashboard');
    expect(moduleForPath('/sales')).toBe('sales');
    expect(moduleForPath('/sales/pos')).toBe('pos');
    expect(moduleForPath('/purchases/orders')).toBe('purchases');
    expect(moduleForPath('/inventory/items/ABC')).toBe('inventory');
    expect(moduleForPath('/customers/new')).toBe('customers');
    expect(moduleForPath('/suppliers')).toBe('suppliers');
    expect(moduleForPath('/finance/payments')).toBe('finance');
    expect(moduleForPath('/operations')).toBe('operations');
    expect(moduleForPath('/reports')).toBe('reports');
    expect(moduleForPath('/settings/admin/users')).toBe('settings');
  });

  it('maps components-trading paths to components module', () => {
    expect(moduleForPath('/inventory/catalog')).toBe('components');
    expect(moduleForPath('/finance/day-book')).toBe('components');
    expect(isComponentsPath('/finance/receivables')).toBe(true);
    expect(isComponentsPath('/sales')).toBe(false);
  });

  it('lists all standard tenant module keys', () => {
    expect(TENANT_MODULE_KEYS).toContain('dashboard');
    expect(TENANT_MODULE_KEYS).toContain('components');
    expect(TENANT_MODULE_KEYS).toContain('pos');
    expect(TENANT_MODULE_KEYS).toContain('opportunity');
    expect(TENANT_MODULE_KEYS).toContain('settings');
    expect(TENANT_MODULE_KEYS.length).toBe(13);
  });
});

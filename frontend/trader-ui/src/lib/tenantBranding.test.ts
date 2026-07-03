/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  applyTenantBranding,
  clearTenantBranding,
  isTenantBlocked,
  parseTenantBranding,
} from './tenantBranding';

describe('tenantBranding', () => {
  afterEach(() => {
    clearTenantBranding();
  });

  it('detects blocked tenant statuses', () => {
    expect(isTenantBlocked('Active')).toBe(false);
    expect(isTenantBlocked('Suspended')).toBe(true);
    expect(isTenantBlocked('Deactivated')).toBe(true);
    expect(isTenantBlocked('Pending')).toBe(true);
  });

  it('parses branding from tenant config', () => {
    const branding = parseTenantBranding({
      tenant_id: 'TNT-0001',
      tenant_name: 'Acme Trading',
      status: 'Active',
      branding: { primaryColor: '#0f766e', tagline: 'Wholesale experts' },
    });
    expect(branding.appName).toBe('Acme Trading');
    expect(branding.primaryColor).toBe('#0f766e');
    expect(branding.tagline).toBe('Wholesale experts');
  });

  it('injects CSS variables for tenant colors', () => {
    applyTenantBranding({
      tenant_id: 'TNT-0001',
      tenant_name: 'Acme',
      status: 'Active',
      branding: { primaryColor: '#9333ea' },
    });
    const style = document.getElementById('trader-tenant-branding');
    expect(style?.textContent).toContain('#9333ea');
  });
});

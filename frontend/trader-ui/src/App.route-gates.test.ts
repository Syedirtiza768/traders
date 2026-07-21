import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Ensures every business route under DashboardLayout uses GatedRoute with a module prop.
 */
describe('App route module gates', () => {
  const appSource = readFileSync(resolve(__dirname, 'App.tsx'), 'utf8');

  const gatedRouteTags = appSource.match(/<GatedRoute/g) || [];
  const gatedRoutesWithModule = appSource.match(/<GatedRoute[^>]*module="/g) || [];

  it('uses GatedRoute for all primary business paths', () => {
    expect(gatedRouteTags.length).toBeGreaterThan(70);
  });

  it('assigns a module to every GatedRoute', () => {
    expect(gatedRoutesWithModule.length).toBe(gatedRouteTags.length);
    const modules = [...appSource.matchAll(/<GatedRoute[^>]*module="([^"]+)"/g)].map((m) => m[1]);
    const moduleSet = new Set(modules);
    expect(moduleSet.has('dashboard')).toBe(true);
    expect(moduleSet.has('sales')).toBe(true);
    expect(moduleSet.has('purchases')).toBe(true);
    expect(moduleSet.has('inventory')).toBe(true);
    expect(moduleSet.has('components')).toBe(true);
    expect(moduleSet.has('opportunity')).toBe(true);
    expect(moduleSet.has('pos')).toBe(true);
    expect(moduleSet.has('settings')).toBe(true);
  });

  it('does not leave legacy CapabilityRoute in business shell', () => {
    expect(appSource.includes('CapabilityRoute')).toBe(false);
  });
});

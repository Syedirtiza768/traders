/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import { formatCompactCurrency, formatCurrency } from './utils';

describe('currency display formatting', () => {
  it('keeps dashboard-sized amounts compact while retaining a full-precision label', () => {
    const compact = formatCompactCurrency(2_740_000, 'PKR');
    const exact = formatCurrency(2_740_000, 'PKR');

    expect(compact).toContain('M');
    expect(compact.length).toBeLessThan(14);
    expect(exact).toContain('2,740,000');
  });

  it('preserves a negative sign and company currency in compact amounts', () => {
    expect(formatCompactCurrency(-55_540_000, 'PKR')).toMatch(/-.*M/);
    expect(formatCompactCurrency(1_250_000, 'AED')).toContain('M');
  });
});

/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import { getSafePrintReturnPath } from './navigation';

describe('getSafePrintReturnPath', () => {
  it('preserves the internal POS return route used by printing', () => {
    expect(getSafePrintReturnPath('/sales/pos')).toBe('/sales/pos');
  });

  it.each([
    null,
    '',
    'https://attacker.example/',
    '//attacker.example/',
    '\\\\attacker.example\\',
    '/\\attacker.example',
    '/settings',
  ])('rejects unapproved return targets: %s', (candidate) => {
    expect(getSafePrintReturnPath(candidate)).toBe('');
  });
});

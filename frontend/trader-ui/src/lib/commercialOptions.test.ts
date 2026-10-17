import { describe, expect, it } from 'vitest';
import {
  billedAmount,
  effectiveSelection,
  groupByLine,
  hasAlternatives,
  optionAmount,
  packageAmount,
  selectionPayload,
} from './commercialOptions';

const options = [
  { line_no: 1, option_no: 2, package_qty: 2, items: [{ unit_qty: 1, unit_price: 180000, discount_percent: 0 }] },
  { line_no: 1, option_no: 1, package_qty: 2, items: [{ unit_qty: 1, unit_price: 120000, discount_percent: 10 }] },
  { line_no: 2, option_no: 1, package_qty: 2, items: [{ unit_qty: 4, unit_price: 38000, discount_percent: 0 }] },
];

describe('groupByLine', () => {
  it('groups options by line and sorts each line by option number', () => {
    const grouped = groupByLine(options);
    expect([...grouped.keys()]).toEqual([1, 2]);
    expect(grouped.get(1)?.map((o) => o.option_no)).toEqual([1, 2]);
  });
});

describe('effectiveSelection', () => {
  it('bills the lowest option of each line when nothing is accepted', () => {
    expect(effectiveSelection(options)).toEqual({ 1: 1, 2: 1 });
  });

  it('bills the accepted option when one is flagged', () => {
    const flagged = options.map((o) => ({ ...o, is_selected: o.line_no === 1 && o.option_no === 2 ? 1 : 0 }));
    expect(effectiveSelection(flagged)).toEqual({ 1: 2, 2: 1 });
  });

  it('ignores flags for a quotation (valued on its first options)', () => {
    const flagged = options.map((o) => ({ ...o, is_selected: o.option_no === 2 ? 1 : 0 }));
    expect(effectiveSelection(flagged, false)).toEqual({ 1: 1, 2: 1 });
  });
});

describe('amounts', () => {
  it('applies the discount per item and the package quantity to the option total', () => {
    expect(packageAmount(options[1])).toBeCloseTo(108000);
    expect(optionAmount(options[1])).toBeCloseTo(216000);
  });

  it('values only the billed option of each line', () => {
    const flagged = options.map((o) => ({ ...o, is_selected: o.line_no === 1 && o.option_no === 2 ? 1 : 0 }));
    const selection = effectiveSelection(flagged);
    expect(billedAmount(flagged, selection)).toBeCloseTo(2 * 180000 + 4 * 38000 * 2);
  });
});

describe('hasAlternatives', () => {
  it('is true only when some line offers more than one option', () => {
    expect(hasAlternatives(options)).toBe(true);
    expect(hasAlternatives([options[2]])).toBe(false);
  });
});

describe('selectionPayload', () => {
  it('serialises the selection with string line keys, as the API expects', () => {
    expect(selectionPayload({ 1: 2, 2: 1 })).toEqual({ '1': 2, '2': 1 });
  });
});

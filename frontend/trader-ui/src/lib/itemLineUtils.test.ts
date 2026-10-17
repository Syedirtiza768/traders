/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import { createEmptyEntryLine, nextEntryLineId, salesPrefillToEntryLines } from './itemLineUtils';

describe('itemLineUtils line ids', () => {
  it('never reuses an id between empty lines and lines added by ItemLineEntry', () => {
    // CreatePurchaseInvoicePage seeds the grid with createEmptyEntryLine();
    // ItemLineEntry's "Add line" then calls nextEntryLineId(). Both must draw
    // from the same counter or two lines share an id and edit together.
    const first = createEmptyEntryLine();
    const added = nextEntryLineId();
    const second = createEmptyEntryLine();
    const ids = [first.id, added, second.id];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every prefilled line its own id', () => {
    const lines = salesPrefillToEntryLines(
      [{ item_code: 'A', qty: 1, rate: 10 }, { item_code: 'B', qty: 2, rate: 20 }],
      'Main Warehouse',
    );
    const ids = [...lines.map((l) => l.id), nextEntryLineId(), createEmptyEntryLine().id];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

import type { ItemLineEntryLine } from '../components/ItemLineEntry';

let _nextId = 1;

export function createEmptyEntryLine(warehouse = ''): ItemLineEntryLine {
  return {
    id: _nextId++,
    item_code: '',
    item_name: '',
    qty: 1,
    rate: 0,
    warehouse,
    serial_no: '',
    description: '',
    stock_qty: null,
    serial_error: null,
  };
}

export type SalesInvoiceLinePayload = {
  item_code: string;
  description?: string;
  qty: number;
  rate: number;
  warehouse?: string;
  serial_no?: string;
};

export type PurchaseInvoiceLinePayload = {
  item_code: string;
  qty: number;
  rate: number;
  warehouse?: string;
  serial_no?: string;
};

export function entryLinesToSalesPayload(
  lines: ItemLineEntryLine[],
  defaultWarehouse: string,
): SalesInvoiceLinePayload[] {
  return lines
    .filter((l) => l.item_code && Number(l.qty) > 0)
    .map((l) => ({
      item_code: l.item_code,
      description: l.description || l.item_name || undefined,
      qty: l.qty,
      rate: l.rate,
      warehouse: l.warehouse || defaultWarehouse,
      serial_no: l.serial_no?.trim() || undefined,
    }));
}

export function entryLinesToPurchasePayload(
  lines: ItemLineEntryLine[],
  defaultWarehouse: string,
): PurchaseInvoiceLinePayload[] {
  return lines
    .filter((l) => l.item_code && Number(l.qty) > 0)
    .map((l) => ({
      item_code: l.item_code,
      qty: l.qty,
      rate: l.rate,
      warehouse: l.warehouse || defaultWarehouse,
      serial_no: l.serial_no?.trim() || undefined,
    }));
}

export function salesPrefillToEntryLines(
  rows: { item_code?: string; description?: string; qty?: number; rate?: number; warehouse?: string; serial_no?: string }[],
  defaultWarehouse: string,
): ItemLineEntryLine[] {
  if (!rows.length) return [createEmptyEntryLine(defaultWarehouse)];
  return rows.map((line) => ({
    ...createEmptyEntryLine(defaultWarehouse),
    item_code: line.item_code || '',
    item_name: line.description || line.item_code || '',
    description: line.description || '',
    qty: Number(line.qty) || 1,
    rate: Number(line.rate) || 0,
    warehouse: line.warehouse || defaultWarehouse,
    serial_no: line.serial_no || '',
  }));
}

export function getEntryLineIssues(line: Pick<ItemLineEntryLine, 'item_code' | 'qty' | 'rate'>) {
  const issues: string[] = [];
  if (!line.item_code) issues.push('Select an item');
  if (!(Number(line.qty) > 0)) issues.push('Enter a quantity greater than 0');
  if (!(Number(line.rate) > 0)) issues.push('Review the rate');
  return issues;
}

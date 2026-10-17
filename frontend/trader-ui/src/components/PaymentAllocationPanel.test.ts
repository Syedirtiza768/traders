import { describe, expect, it } from 'vitest';
import { buildFifoAllocations, buildTargetAllocations, type OpenInvoice } from './PaymentAllocationPanel';

const invoices: OpenInvoice[] = [
  { name: 'ACC-SINV-OLD', posting_date: '2026-10-01', outstanding_amount: 144044 },
  { name: 'ACC-SINV-NEW', posting_date: '2026-10-15', outstanding_amount: 1370452 },
];

const amounts = (rows: { reference_name: string; allocated_amount: number }[]) =>
  Object.fromEntries(rows.map((r) => [r.reference_name, r.allocated_amount]));

describe('payment allocation defaults', () => {
  it('FIFO still settles the oldest invoice first when no target is given', () => {
    expect(amounts(buildFifoAllocations(invoices, 1000000))).toEqual({
      'ACC-SINV-OLD': 144044,
      'ACC-SINV-NEW': 855956,
    });
  });

  it('a receipt opened from an invoice settles that invoice, not the oldest one', () => {
    expect(amounts(buildTargetAllocations(invoices, 1000000, 'ACC-SINV-NEW'))).toEqual({
      'ACC-SINV-OLD': 0,
      'ACC-SINV-NEW': 1000000,
    });
  });

  it('the target is capped at its outstanding amount', () => {
    expect(amounts(buildTargetAllocations(invoices, 2000000, 'ACC-SINV-OLD'))).toEqual({
      'ACC-SINV-OLD': 144044,
      'ACC-SINV-NEW': 0,
    });
  });
});

import { useEffect, useMemo, useRef } from 'react';

export type OpenInvoice = {
  name: string;
  posting_date?: string;
  outstanding_amount: number;
};

export type InvoiceAllocation = {
  reference_name: string;
  posting_date?: string;
  outstanding_amount: number;
  allocated_amount: number;
};

type Props = {
  invoices: OpenInvoice[];
  amount: number;
  allocations: InvoiceAllocation[];
  onChange: (rows: InvoiceAllocation[]) => void;
  loading?: boolean;
};

/** Distribute payment amount FIFO across open invoices (oldest first). */
export function buildFifoAllocations(
  invoices: OpenInvoice[],
  amount: number,
): InvoiceAllocation[] {
  let remaining = Math.max(0, amount);
  return invoices.map((inv) => {
    const outstanding = Number(inv.outstanding_amount) || 0;
    const allocated = remaining > 0 ? Math.min(remaining, outstanding) : 0;
    remaining -= allocated;
    return {
      reference_name: inv.name,
      posting_date: inv.posting_date,
      outstanding_amount: outstanding,
      allocated_amount: allocated,
    };
  });
}

export default function PaymentAllocationPanel({
  invoices,
  amount,
  allocations,
  onChange,
  loading,
}: Props) {
  const payAmount = Math.max(0, Number(amount) || 0);
  const manualEdit = useRef(false);
  const lastPartyKey = useRef('');

  const partyKey = invoices.map((i) => i.name).join('|');

  useEffect(() => {
    if (loading) return;
    if (invoices.length === 0) {
      onChange([]);
      return;
    }
    if (partyKey !== lastPartyKey.current) {
      lastPartyKey.current = partyKey;
      manualEdit.current = false;
    }
    if (!manualEdit.current) {
      onChange(buildFifoAllocations(invoices, payAmount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, payAmount, loading, partyKey]);

  const totalAllocated = useMemo(
    () => allocations.reduce((sum, row) => sum + (Number(row.allocated_amount) || 0), 0),
    [allocations],
  );
  const unapplied = payAmount - totalAllocated;

  const updateRow = (referenceName: string, allocated: number) => {
    manualEdit.current = true;
    onChange(
      allocations.map((row) =>
        row.reference_name === referenceName
          ? { ...row, allocated_amount: Math.max(0, allocated) }
          : row,
      ),
    );
  };

  const applyFifo = () => {
    manualEdit.current = false;
    onChange(buildFifoAllocations(invoices, payAmount));
  };

  const clearAllocations = () => {
    manualEdit.current = true;
    onChange(
      allocations.map((row) => ({ ...row, allocated_amount: 0 })),
    );
  };

  if (loading) {
    return <p className="text-xs text-gray-400">Loading open invoices…</p>;
  }

  if (invoices.length === 0) {
    return (
      <p className="text-xs text-gray-500 dark:text-slate-400">
        No open invoices — payment will post as advance on the party ledger.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">
          Allocate to invoices
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={applyFifo}
            className="text-[10px] uppercase tracking-wide text-brand-600 hover:underline"
          >
            FIFO
          </button>
          <button
            type="button"
            onClick={clearAllocations}
            className="text-[10px] uppercase tracking-wide text-gray-500 hover:underline"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-1">
        {allocations.map((row) => (
          <div
            key={row.reference_name}
            className="grid grid-cols-[1fr_auto_auto] gap-2 items-center text-xs"
          >
            <div className="min-w-0">
              <p className="font-mono text-gray-700 dark:text-slate-200 truncate">
                {row.reference_name}
              </p>
              <p className="text-gray-400">
                Due {row.outstanding_amount.toFixed(2)}
                {row.posting_date ? ` · ${row.posting_date}` : ''}
              </p>
            </div>
            <input
              type="number"
              min={0}
              max={row.outstanding_amount}
              step="0.01"
              value={row.allocated_amount || ''}
              onChange={(e) => updateRow(row.reference_name, parseFloat(e.target.value) || 0)}
              className="input-field text-xs w-24 text-right py-1"
              aria-label={`Allocate to ${row.reference_name}`}
            />
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 dark:border-slate-700 pt-2 space-y-0.5 text-xs">
        <div className="flex justify-between text-gray-600 dark:text-slate-300">
          <span>Allocated</span>
          <span className="font-medium">{totalAllocated.toFixed(2)}</span>
        </div>
        <div className={`flex justify-between ${unapplied > 0.005 ? 'text-amber-600' : 'text-gray-500'}`}>
          <span>Unapplied (advance)</span>
          <span className="font-medium">{Math.max(0, unapplied).toFixed(2)}</span>
        </div>
        {totalAllocated > payAmount + 0.005 && (
          <p className="text-red-600">Allocated total exceeds payment amount.</p>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { arTrackerApi } from '../lib/api';
import { extractFrappeError, formatCurrency, formatDate } from '../lib/utils';
import { AlertBanner, EmptyState, LoadingBlock } from './ui';

type StatusFilter = '' | 'Unpaid' | 'Part Paid' | 'Paid';

const BUCKET_LABEL: Record<string, string> = {
  settled: 'Settled',
  current: 'Current',
  expected_missed: 'Past expected date',
  overdue: 'Overdue',
};

const BUCKET_CLASS: Record<string, string> = {
  settled: 'bg-green-50 text-green-700 border-green-200',
  current: 'bg-blue-50 text-blue-700 border-blue-200',
  expected_missed: 'bg-amber-50 text-amber-700 border-amber-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
};

/** Paid, part paid and unpaid invoices with due and expected dates and days late. */
export default function InvoicePaymentTracker() {
  const [status, setStatus] = useState<StatusFilter>('');
  const [includeSettled, setIncludeSettled] = useState(false);
  const [data, setData] = useState<{ rows: any[]; summary: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await arTrackerApi.invoicePayments({
        status: status || undefined,
        include_settled: includeSettled ? 1 : 0,
      });
      setData(res.data.message);
    } catch (err) {
      setError(extractFrappeError(err, 'Could not load invoice payments.'));
    } finally {
      setLoading(false);
    }
  }, [status, includeSettled]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = data?.summary;
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-4">
      {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-3">
            <p className="text-xs text-gray-500">Invoices</p>
            <p className="text-lg font-semibold">{summary.invoice_count}</p>
          </div>
          <div className="card p-3">
            <p className="text-xs text-gray-500">Receivable</p>
            <p className="text-lg font-semibold">{formatCurrency(summary.receivable || 0)}</p>
          </div>
          <div className="card p-3">
            <p className="text-xs text-gray-500">Paid</p>
            <p className="text-lg font-semibold">{formatCurrency(summary.paid || 0)}</p>
          </div>
          <div className="card p-3">
            <p className="text-xs text-gray-500">Outstanding</p>
            <p className="text-lg font-semibold">{formatCurrency(summary.outstanding || 0)}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1">
          <span className="text-xs text-gray-500">Payment status</span>
          <select
            className="input-field w-auto"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="">All open invoices</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Part Paid">Part paid</option>
            <option value="Paid">Paid</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={includeSettled}
            onChange={(e) => setIncludeSettled(e.target.checked)}
          />
          Include settled invoices
        </label>
      </div>

      {loading && !data ? (
        <LoadingBlock compact label="Loading invoice payments…" />
      ) : rows.length === 0 ? (
        <EmptyState compact title="No invoices match these filters" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Expected</th>
                <th className="px-3 py-2 text-right">Invoice total</th>
                <th className="px-3 py-2 text-right">Outstanding</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Timing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row: any) => (
                <tr key={row.invoice}>
                  <td className="px-3 py-2 font-medium text-gray-900">{row.invoice}</td>
                  <td className="px-3 py-2">{row.customer_name || row.customer}</td>
                  <td className="px-3 py-2">{formatDate(row.due_date)}</td>
                  <td className="px-3 py-2">{formatDate(row.expected_payment_date)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.grand_total || 0)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.outstanding_amount || 0)}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                        BUCKET_CLASS[row.bucket] ?? ''
                      }`}
                    >
                      {BUCKET_LABEL[row.bucket] ?? row.bucket}
                    </span>
                    {row.days_past_expected > 0 ? (
                      <span className="block text-xs text-gray-500">{row.days_past_expected} days past expected</span>
                    ) : null}
                    {row.days_past_due > 0 ? (
                      <span className="block text-xs text-gray-500">{row.days_past_due} days past due</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

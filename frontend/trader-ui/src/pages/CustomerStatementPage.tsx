import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { reportsApi } from '../lib/api';
import { appendPreservedListQuery, extractFrappeError, formatCurrency, formatDate, getActiveCurrency } from '../lib/utils';
import { LoadingBlock, AlertBanner } from '../components/ui';

type Statement = {
  customer: { name: string; customer_name?: string; default_currency?: string; tax_id?: string; payment_terms?: string; customer_group?: string };
  company: string;
  from_date: string;
  to_date: string;
  opening_balance: number;
  closing_balance: number;
  transactions: any[];
  aging: { '0-30': number; '31-60': number; '61-90': number; '90+': number; total_outstanding: number };
};

const AGING_BUCKETS: { key: keyof Statement['aging']; label: string }[] = [
  { key: '0-30', label: '0–30 days' },
  { key: '31-60', label: '31–60 days' },
  { key: '61-90', label: '61–90 days' },
  { key: '90+', label: '90+ days' },
];

function defaultFrom(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return d.toISOString().slice(0, 10);
}
function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CustomerStatementPage() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const [searchParams] = useSearchParams();
  const listSearch = searchParams.get('list');
  const backPath = listSearch
    ? `/customers/${customerId ? encodeURIComponent(customerId) : ''}?${listSearch}`
    : `/customers/${customerId ? encodeURIComponent(customerId) : ''}`;

  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(defaultFrom());
  const [toDate, setToDate] = useState(defaultTo());

  const load = useCallback(async () => {
    if (!customerId) {
      setError('Customer not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const decoded = decodeURIComponent(customerId);
      const res = await reportsApi.getCustomerStatement(decoded, { from_date: fromDate, to_date: toDate });
      setStatement(res.data.message);
    } catch (err) {
      console.error(err);
      setError(extractFrappeError(err, 'Could not load customer statement.'));
      setStatement(null);
    } finally {
      setLoading(false);
    }
  }, [customerId, fromDate, toDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const cust = statement?.customer;
  const currency = cust?.default_currency || getActiveCurrency();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <button
          type="button"
          onClick={() => navigate(appendPreservedListQuery(backPath, listSearch))}
          className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to customer
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      <div className="card p-6 print:shadow-none print:border-0">
        <div className="flex flex-col gap-1 border-b border-gray-100 pb-4">
          <h1 className="page-title">Customer Statement</h1>
          <p className="text-lg font-semibold text-gray-900">{cust?.customer_name || cust?.name || '—'}</p>
          <p className="text-sm text-gray-500">
            {cust?.name}
            {cust?.customer_group ? ` · ${cust.customer_group}` : ''}
            {cust?.tax_id ? ` · Tax ID ${cust.tax_id}` : ''}
            {cust?.payment_terms ? ` · Terms ${cust.payment_terms}` : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 py-4 print:grid-cols-2 sm:grid-cols-2">
          <label className="block space-y-1 print:hidden">
            <span className="text-xs font-medium text-gray-600">From date</span>
            <input
              type="date"
              className="input-field"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className="block space-y-1 print:hidden">
            <span className="text-xs font-medium text-gray-600">To date</span>
            <input
              type="date"
              className="input-field"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
          <div className="hidden print:block text-sm text-gray-600">
            <span className="font-medium">Period:</span> {formatDate(fromDate)} — {formatDate(toDate)}
          </div>
          <div className="text-right text-sm text-gray-600 print:text-left">
            <span className="font-medium">Company:</span> {statement?.company || '—'}
          </div>
        </div>

        {loading ? (
          <LoadingBlock compact label="Loading statement…" />
        ) : error ? (
          <AlertBanner tone="error">{error}</AlertBanner>
        ) : statement ? (
          <>
            <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-4">
              {AGING_BUCKETS.map((b) => (
                <div key={b.key} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{b.label}</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(statement.aging[b.key], currency)}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4 text-sm">
              <div>
                <span className="text-gray-500">Opening balance ({formatDate(statement.from_date)}): </span>
                <span className="font-semibold text-gray-900">{formatCurrency(statement.opening_balance, currency)}</span>
              </div>
              <div>
                <span className="text-gray-500">Total outstanding: </span>
                <span className="font-semibold text-red-600">{formatCurrency(statement.aging.total_outstanding, currency)}</span>
              </div>
            </div>

            <div className="table-container mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Voucher</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Reference</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Debit</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Credit</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="bg-gray-50/50">
                    <td className="px-4 py-3 text-sm text-gray-500" colSpan={6}>Opening balance</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(statement.opening_balance, currency)}</td>
                  </tr>
                  {statement.transactions.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-gray-400" colSpan={7}>No transactions in this period.</td>
                    </tr>
                  ) : (
                    statement.transactions.map((tx, idx) => (
                      <tr key={`${tx.voucher_no}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">{formatDate(tx.posting_date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{tx.voucher_type}</td>
                        <td className="px-4 py-3 text-sm font-medium text-brand-700">{tx.voucher_no}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{tx.against_voucher || tx.remarks || '—'}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">{tx.debit ? formatCurrency(tx.debit, currency) : ''}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">{tx.credit ? formatCurrency(tx.credit, currency) : ''}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(tx.balance, currency)}</td>
                      </tr>
                    ))
                  )}
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-700" colSpan={6}>Closing balance ({formatDate(statement.to_date)})</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{formatCurrency(statement.closing_balance, currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, Plus, Wallet } from 'lucide-react';
import { financeApi } from '../lib/api';
import { appendPreservedListQuery, debounce, formatCurrency, formatDate, formatCompact } from '../lib/utils';
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
  FilterTabs,
  SearchField,
  PaginationBar,
  StatCard,
} from '../components/ui';

const PAYMENT_TYPES = ['All', 'Receive', 'Pay', 'Internal Transfer'];

export default function PaymentEntriesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const paymentType = searchParams.get('paymentType') || 'All';
  const search = searchParams.get('search') || '';
  const listSearch = searchParams.toString();

  const pageSize = 15;

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    setSearchParams(nextParams);
  };

  const buildDetailPath = (paymentName: string) => {
    return appendPreservedListQuery(`/finance/payments/${encodeURIComponent(paymentName)}`, listSearch);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: pageSize };
      if (paymentType !== 'All') params.payment_type = paymentType;
      if (search) params.search = search;

      const response = await financeApi.getPaymentEntries(params);
      const payload = response.data.message;
      setEntries(payload.data || []);
      setTotal(payload.total || 0);
    } catch (err) {
      console.error('Failed to load payment entries:', err);
    } finally {
      setLoading(false);
    }
  }, [page, paymentType, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      updateSearchParams({ search: value || null, page: null });
    }, 400),
    [searchParams],
  );

  const totalPages = Math.ceil(total / pageSize);
  const visiblePaid = entries.reduce((sum, row) => sum + (row.paid_amount || 0), 0);
  const visibleReceived = entries.reduce((sum, row) => sum + (row.received_amount || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Payment Entries"
        description="Manage inbound and outbound payments across customers, suppliers, and accounts."
        actions={
          <button type="button" onClick={() => navigate(appendPreservedListQuery('/finance/payments/new', listSearch))} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" /> New Payment Entry
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <StatCard icon={CreditCard} label="Visible Entries" display={total.toLocaleString()} color="blue" />
        <StatCard icon={Wallet} label="Paid Amount" display={formatCompact(visiblePaid)} color="green" />
        <StatCard icon={Wallet} label="Received Amount" display={formatCompact(visibleReceived)} color="amber" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          options={[...PAYMENT_TYPES]}
          value={paymentType}
          onChange={(entry) => updateSearchParams({ paymentType: entry === 'All' ? null : entry, page: null })}
          ariaLabel="Payment type"
        />
        <SearchField
          placeholder="Search payments..."
          aria-label="Search payments"
          defaultValue={search}
          onChange={debouncedSearch}
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block table-container">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th scope="col">Payment</th>
              <th scope="col">Date</th>
              <th scope="col">Type</th>
              <th scope="col">Party</th>
              <th scope="col" className="text-right">Paid</th>
              <th scope="col" className="text-right">Received</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><LoadingBlock compact label="Loading payment entries…" /></td></tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    compact
                    title="No payment entries found"
                    description={search || paymentType !== 'All' ? 'Try adjusting filters or search.' : undefined}
                    action={
                      <button type="button" className="btn-primary" onClick={() => navigate(appendPreservedListQuery('/finance/payments/new', listSearch))}>
                        New Payment Entry
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.name}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(buildDetailPath(entry.name))}
                >
                  <td className="font-medium text-brand-700 dark:text-brand-300">{entry.name}</td>
                  <td className="text-gray-500 dark:text-slate-400">{formatDate(entry.posting_date)}</td>
                  <td className="text-gray-700 dark:text-slate-300">{entry.payment_type || '—'}</td>
                  <td className="text-gray-700 dark:text-slate-300">{entry.party_name || entry.party || '—'}</td>
                  <td className="num font-medium text-gray-900 dark:text-gray-100">{formatCurrency(entry.paid_amount)}</td>
                  <td className="num font-medium text-gray-900 dark:text-gray-100">{formatCurrency(entry.received_amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden card divide-y divide-gray-100 dark:divide-slate-800">
        {loading ? (
          <LoadingBlock compact label="Loading payment entries…" />
        ) : entries.length === 0 ? (
          <EmptyState compact title="No payment entries found" description={search || paymentType !== 'All' ? 'Try adjusting filters or search.' : undefined} />
        ) : (
          entries.map((entry) => (
            <div key={entry.name} className="px-4 py-3 space-y-1.5 active:bg-gray-50" onClick={() => navigate(buildDetailPath(entry.name))}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-700">{entry.name}</span>
                <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{entry.payment_type || '—'}</span>
              </div>
              <div className="text-xs text-gray-500 truncate">{entry.party_name || entry.party || '—'}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{formatDate(entry.posting_date)}</span>
                <div className="flex gap-3">
                  {entry.paid_amount > 0 && <span className="font-medium text-gray-900">{formatCurrency(entry.paid_amount)}</span>}
                  {entry.received_amount > 0 && <span className="font-medium text-green-700">{formatCurrency(entry.received_amount)}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={(p) => updateSearchParams({ page: p > 1 ? String(p) : null })}
      />
    </div>
  );
}
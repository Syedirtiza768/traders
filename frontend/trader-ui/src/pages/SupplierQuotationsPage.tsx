import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Plus, Truck } from 'lucide-react';
import { purchasesApi } from '../lib/api';
import { appendPreservedListQuery, debounce, formatCurrency, formatDate } from '../lib/utils';
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
  FilterTabs,
  SearchField,
  StatusBadge,
  PaginationBar,
  StatCard,
} from '../components/ui';

const STATUS_TABS = ['All', 'Draft', 'Open', 'Expired', 'Quoted'];
const PAGE_SIZE = 15;

export default function SupplierQuotationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const status = searchParams.get('status') || 'All';
  const search = searchParams.get('search') || '';
  const listSearch = searchParams.toString();

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: PAGE_SIZE };
      if (status !== 'All') params.status = status;
      if (search) params.search = search;
      const response = await purchasesApi.getRfqs(params);
      const payload = response.data.message;
      setRows(payload.data || []);
      setTotal(payload.total || 0);
    } catch (err) {
      console.error('Failed to load supplier quotations:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { void load(); }, [load]);

  const debouncedSearch = useCallback(debounce((value: string) => updateSearchParams({ search: value || null, page: null }), 400), [searchParams]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Supplier Quotations"
        description="Review RFQs and quoted supplier responses before issuing purchase orders."
        actions={
          <button type="button" onClick={() => navigate('/purchases/rfqs/new')} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New RFQ
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={FileText} label="Visible RFQs" display={String(rows.length)} />
        <StatCard icon={Truck} label="Draft RFQs" display={String(rows.filter((row) => (row.docstatus || 0) === 0).length)} />
        <StatCard icon={FileText} label="Quoted Value" display={formatCurrency(rows.reduce((sum, row) => sum + (row.grand_total || 0), 0))} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          options={STATUS_TABS}
          value={status}
          onChange={(entry) => updateSearchParams({ status: entry === 'All' ? null : entry, page: null })}
          ariaLabel="RFQ status"
        />
        <SearchField
          placeholder="Search RFQs…"
          defaultValue={search}
          onChange={(value) => debouncedSearch(value)}
          aria-label="Search supplier quotations"
        />
      </div>

      <div className="hidden md:block">
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">RFQ</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Valid Till</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={6}><LoadingBlock compact label="Loading RFQs…" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6}><EmptyState compact title="No supplier quotations found" /></td></tr>
              ) : rows.map((row) => (
                <tr key={row.name} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => navigate(appendPreservedListQuery(`/purchases/rfqs/${encodeURIComponent(row.name)}`, listSearch))}>
                  <td className="px-6 py-3 text-sm font-medium text-brand-700 dark:text-brand-300">{row.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 dark:text-slate-200">{row.supplier_name || row.supplier || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatDate(row.transaction_date)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatDate(row.valid_till)}</td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(row.grand_total, row.currency)}</td>
                  <td className="px-6 py-3"><StatusBadge status={row.status || (row.docstatus === 0 ? 'Draft' : 'Open')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900 dark:divide-slate-700">
        {loading ? (
          <LoadingBlock compact label="Loading RFQs…" />
        ) : rows.length === 0 ? (
          <EmptyState compact title="No supplier quotations found" />
        ) : rows.map((row) => (
          <div key={`m-${row.name}`} className="px-4 py-3 active:bg-gray-50 dark:active:bg-slate-800" onClick={() => navigate(appendPreservedListQuery(`/purchases/rfqs/${encodeURIComponent(row.name)}`, listSearch))}>
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-700 dark:text-brand-300 truncate">{row.name}</p>
                <p className="text-xs text-gray-500 truncate">{row.supplier_name || row.supplier || '—'}</p>
              </div>
              <StatusBadge status={row.status || (row.docstatus === 0 ? 'Draft' : 'Open')} />
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">{formatDate(row.transaction_date)}</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(row.grand_total, row.currency)}</span>
            </div>
          </div>
        ))}
      </div>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={(nextPage) => updateSearchParams({ page: nextPage > 1 ? String(nextPage) : null })}
      />
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Plus, ShoppingBag } from 'lucide-react';
import { purchasesApi } from '../lib/api';
import { appendPreservedListQuery, debounce, formatDate } from '../lib/utils';
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
  AlertBanner,
  FilterTabs,
  SearchField,
  StatusBadge,
  PaginationBar,
  StatCard,
} from '../components/ui';

const STATUS_TABS = ['All', 'Draft', 'Pending', 'Partially Ordered', 'Stopped'];
const PAGE_SIZE = 15;

export default function PurchaseRequisitionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const workflow = searchParams.get('workflow');
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const status = searchParams.get('status') || 'All';
  const search = searchParams.get('search') || '';
  const listSearch = searchParams.toString();

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) nextParams.delete(key);
      else nextParams.set(key, value);
    });
    setSearchParams(nextParams);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: PAGE_SIZE };
      if (status !== 'All') params.status = status;
      if (search) params.search = search;
      const response = await purchasesApi.getRequisitions(params);
      const payload = response.data.message;
      setRows(payload.data || []);
      setTotal(payload.total || 0);
    } catch (err) {
      console.error('Failed to load purchase requisitions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const debouncedSearch = useCallback(
    debounce((value: string) => updateSearchParams({ search: value || null, page: null }), 400),
    [searchParams],
  );

  const filtered = workflow === 'approval-review'
    ? rows.filter((row) => (row.docstatus || 0) === 0 || ((row.per_ordered || 0) < 100))
    : rows;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Purchase Requisitions"
        description="Track internal purchase demand before supplier quotation and ordering."
        actions={
          <button type="button" onClick={() => navigate('/purchases/requisitions/new')} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Requisition
          </button>
        }
      />

      {workflow === 'approval-review' && (
        <AlertBanner
          tone="info"
          title="Approval and exception queue active"
          action={
            <button type="button" onClick={() => updateSearchParams({ workflow: null, page: null })} className="btn-secondary whitespace-nowrap">
              Clear Filter
            </button>
          }
        >
          Showing draft or not-fully-ordered requisitions that still need procurement review.
        </AlertBanner>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <StatCard icon={ClipboardList} label="Visible Requisitions" display={String(filtered.length)} />
        <StatCard icon={ShoppingBag} label="Draft Count" display={String(rows.filter((row) => (row.docstatus || 0) === 0).length)} />
        <StatCard icon={ClipboardList} label="Pending Ordering" display={String(rows.filter((row) => (row.per_ordered || 0) < 100).length)} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          options={STATUS_TABS}
          value={status}
          onChange={(entry) => updateSearchParams({ status: entry === 'All' ? null : entry, page: null })}
          ariaLabel="Requisition status"
        />

        <SearchField
          placeholder="Search requisitions…"
          defaultValue={search}
          onChange={(value) => debouncedSearch(value)}
          aria-label="Search purchase requisitions"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block table-container">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Requisition</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Schedule</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5}><LoadingBlock compact label="Loading requisitions…" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5}><EmptyState compact title="No requisitions found" /></td></tr>
            ) : filtered.map((row) => (
              <tr key={row.name} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate(appendPreservedListQuery(`/purchases/requisitions/${encodeURIComponent(row.name)}`, listSearch))}>
                <td className="px-6 py-3 text-sm font-medium text-brand-700">{row.name}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{formatDate(row.transaction_date)}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{formatDate(row.schedule_date)}</td>
                <td className="px-6 py-3"><StatusBadge status={row.status || (row.docstatus === 0 ? 'Draft' : 'Open')} /></td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(appendPreservedListQuery(`/purchases/rfqs/new?materialRequest=${encodeURIComponent(row.name)}&postingDate=${encodeURIComponent(row.transaction_date || '')}`, listSearch));
                    }}
                    className="btn-secondary text-xs"
                  >
                    Create RFQ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden card divide-y divide-gray-100">
        {loading ? (
          <LoadingBlock compact label="Loading requisitions…" />
        ) : filtered.length === 0 ? (
          <EmptyState compact title="No requisitions found" />
        ) : filtered.map((row) => (
          <div key={row.name} className="px-4 py-3 space-y-1.5 active:bg-gray-50" onClick={() => navigate(appendPreservedListQuery(`/purchases/requisitions/${encodeURIComponent(row.name)}`, listSearch))}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-brand-700">{row.name}</span>
              <StatusBadge status={row.status || (row.docstatus === 0 ? 'Draft' : 'Open')} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{formatDate(row.transaction_date)}</span>
              <span className="text-gray-500">Schedule: {formatDate(row.schedule_date)}</span>
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

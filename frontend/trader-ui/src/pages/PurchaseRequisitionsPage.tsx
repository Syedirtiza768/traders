import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ClipboardList, Plus, Search, ShoppingBag } from 'lucide-react';
import { purchasesApi } from '../lib/api';
import { appendPreservedListQuery, debounce, formatDate, getStatusColor } from '../lib/utils';

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
      <div>
        <h1 className="page-title">Purchase Requisitions</h1>
        <p className="mt-1 text-gray-500 text-sm">Track internal purchase demand before supplier quotation and ordering.</p>
      </div>

      {workflow === 'approval-review' && (
        <WorkflowFilterBanner
          title="Approval and exception queue active"
          description="Showing draft or not-fully-ordered requisitions that still need procurement review."
          onClear={() => updateSearchParams({ workflow: null, page: null })}
        />
      )}

      <div className="flex justify-end">
        <button onClick={() => navigate('/purchases/requisitions/new')} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Requisition
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <StatCard icon={ClipboardList} label="Visible Requisitions" value={String(filtered.length)} />
        <StatCard icon={ShoppingBag} label="Draft Count" value={String(rows.filter((row) => (row.docstatus || 0) === 0).length)} />
        <StatCard icon={ClipboardList} label="Pending Ordering" value={String(rows.filter((row) => (row.per_ordered || 0) < 100).length)} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide rounded-lg bg-gray-100 p-1 w-full sm:w-auto">
          {STATUS_TABS.map((entry) => (
            <button
              key={entry}
              onClick={() => updateSearchParams({ status: entry === 'All' ? null : entry, page: null })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${status === entry ? 'bg-white text-brand-700 shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {entry}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search requisitions..." defaultValue={search} onChange={(e) => debouncedSearch(e.target.value)} className="input-field pl-9" />
        </div>
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
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No requisitions found.</td></tr>
            ) : filtered.map((row) => (
              <tr key={row.name} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate(appendPreservedListQuery(`/purchases/requisitions/${encodeURIComponent(row.name)}`, listSearch))}>
                <td className="px-6 py-3 text-sm font-medium text-brand-700">{row.name}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{formatDate(row.transaction_date)}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{formatDate(row.schedule_date)}</td>
                <td className="px-6 py-3"><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(row.status || (row.docstatus === 0 ? 'Draft' : 'Open'))}`}>{row.status || (row.docstatus === 0 ? 'Draft' : 'Open')}</span></td>
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
          <div className="px-4 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-400 text-sm">No requisitions found.</div>
        ) : filtered.map((row) => (
          <div key={row.name} className="px-4 py-3 space-y-1.5 active:bg-gray-50" onClick={() => navigate(appendPreservedListQuery(`/purchases/requisitions/${encodeURIComponent(row.name)}`, listSearch))}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-brand-700">{row.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(row.status || (row.docstatus === 0 ? 'Draft' : 'Open'))}`}>
                {row.status || (row.docstatus === 0 ? 'Draft' : 'Open')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{formatDate(row.transaction_date)}</span>
              <span className="text-gray-500">Schedule: {formatDate(row.schedule_date)}</span>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
          <span>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-1">
            <button onClick={() => updateSearchParams({ page: page > 2 ? String(page - 1) : null })} disabled={page === 1} className="btn-secondary px-2 py-1 text-xs"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => updateSearchParams({ page: String(Math.min(totalPages, page + 1)) })} disabled={page === totalPages} className="btn-secondary px-2 py-1 text-xs"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="rounded-lg bg-blue-50 p-1.5 sm:p-2"><Icon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" /></div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 truncate">{label}</p>
          <p className="text-sm sm:text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function WorkflowFilterBanner({ title, description, onClear }: { title: string; description: string; onClear: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-medium text-brand-900">{title}</div>
        <div className="text-sm text-brand-800">{description}</div>
      </div>
      <button onClick={onClear} className="btn-secondary whitespace-nowrap">Clear Filter</button>
    </div>
  );
}
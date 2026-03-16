import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileText, Plus, Search, Truck } from 'lucide-react';
import { purchasesApi } from '../lib/api';
import { appendPreservedListQuery, debounce, formatCurrency, formatDate, getStatusColor } from '../lib/utils';

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
      if (!value) next.delete(key); else next.set(key, value);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Supplier Quotations</h1>
        <p className="mt-1 text-gray-500">Review RFQs and quoted supplier responses before issuing purchase orders.</p>
      </div>

      <div className="flex justify-end">
        <button onClick={() => navigate('/purchases/rfqs/new')} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" /> New RFQ</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={FileText} label="Visible RFQs" value={String(rows.length)} />
        <StatCard icon={Truck} label="Draft RFQs" value={String(rows.filter((row) => (row.docstatus || 0) === 0).length)} />
        <StatCard icon={FileText} label="Quoted Value" value={formatCurrency(rows.reduce((sum, row) => sum + (row.grand_total || 0), 0))} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
          {STATUS_TABS.map((entry) => (
            <button key={entry} onClick={() => updateSearchParams({ status: entry === 'All' ? null : entry, page: null })} className={`rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${status === entry ? 'bg-white text-brand-700 shadow' : 'text-gray-600 hover:text-gray-900'}`}>{entry}</button>
          ))}
        </div>
        <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search RFQs..." defaultValue={search} onChange={(e) => debouncedSearch(e.target.value)} className="input-field pl-9" /></div>
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">RFQ</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Valid Till</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No supplier quotations found.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.name} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate(appendPreservedListQuery(`/purchases/rfqs/${encodeURIComponent(row.name)}`, listSearch))}>
                <td className="px-6 py-3 text-sm font-medium text-brand-700">{row.name}</td>
                <td className="px-6 py-3 text-sm text-gray-700">{row.supplier_name || row.supplier || '—'}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{formatDate(row.transaction_date)}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{formatDate(row.valid_till)}</td>
                <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(row.grand_total, row.currency)}</td>
                <td className="px-6 py-3"><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(row.status || (row.docstatus === 0 ? 'Draft' : 'Open'))}`}>{row.status || (row.docstatus === 0 ? 'Draft' : 'Open')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
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
  return <div className="card p-5"><div className="flex items-center gap-3"><div className="rounded-lg bg-blue-50 p-2"><Icon className="h-5 w-5 text-blue-600" /></div><div><p className="text-xs text-gray-500">{label}</p><p className="text-lg font-bold text-gray-900">{value}</p></div></div></div>;
}
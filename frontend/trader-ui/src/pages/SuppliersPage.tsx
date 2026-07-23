import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, DollarSign, CreditCard, Package, Plus } from 'lucide-react';
import { suppliersApi } from '../lib/api';
import { formatCurrency, formatCompact, debounce } from '../lib/utils';
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
  SearchField,
  PaginationBar,
} from '../components/ui';

export default function SuppliersPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loading, setLoading] = useState(true);

  const pageSize = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: pageSize };
      if (search) params.search = search;
      if (selectedGroup) params.supplier_group = selectedGroup;

      const [listRes, groupsRes] = await Promise.all([
        suppliersApi.getList(params),
        page === 1 ? suppliersApi.getGroups() : Promise.resolve(null),
      ]);

      const d = listRes.data.message;
      setSuppliers(d.data || []);
      setTotal(d.total || 0);
      if (groupsRes) setGroups(groupsRes.data.message || []);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedGroup]);

  useEffect(() => { load(); }, [load]);

  const debouncedSearch = useCallback(
    debounce((val: string) => { setSearch(val); setPage(1); }, 400),
    [],
  );

  const totalPages = Math.ceil(total / pageSize);

  const totalPurchases = suppliers.reduce((s, c) => s + (c.total_purchases || 0), 0);
  const totalPayable = suppliers.reduce((s, c) => s + (c.outstanding_amount || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage your supplier base"
        actions={
          <button type="button" onClick={() => navigate('/suppliers/new')} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" aria-hidden="true" /> New Supplier
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg"><Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">Total Suppliers</p><p className="text-sm sm:text-lg font-bold dark:text-gray-100">{total}</p></div>
        </div>
        <div className="card p-4 sm:p-5 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-green-50 dark:bg-emerald-950/40 rounded-lg"><DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-emerald-400" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">Total Purchases</p><p className="text-sm sm:text-lg font-bold dark:text-gray-100">{formatCompact(totalPurchases)}</p></div>
        </div>
        <div className="card p-4 sm:p-5 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-red-50 dark:bg-red-950/40 rounded-lg"><CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">Total Payable</p><p className="text-sm sm:text-lg font-bold text-red-700 dark:text-red-400">{formatCompact(totalPayable)}</p></div>
        </div>
        <div className="card p-4 sm:p-5 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-purple-50 dark:bg-violet-950/40 rounded-lg"><Package className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-violet-400" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">Supplier Groups</p><p className="text-sm sm:text-lg font-bold dark:text-gray-100">{groups.length}</p></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <select
          value={selectedGroup}
          onChange={(e) => { setSelectedGroup(e.target.value); setPage(1); }}
          className="input-field w-auto text-sm"
          aria-label="Filter by supplier group"
        >
          <option value="">All Groups</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <SearchField
          placeholder="Search suppliers..."
          aria-label="Search suppliers"
          onChange={debouncedSearch}
        />
      </div>

      <div className="hidden md:block table-container">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th scope="col">Supplier</th>
              <th scope="col">Group</th>
              <th scope="col">Country</th>
              <th scope="col">Contact</th>
              <th scope="col" className="text-right">Purchases</th>
              <th scope="col" className="text-right">Payable</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <LoadingBlock compact label="Loading suppliers…" />
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    compact
                    title="No suppliers found"
                    description={search || selectedGroup ? 'Try adjusting filters or search.' : 'Add a supplier to get started.'}
                    action={
                      <button type="button" className="btn-primary" onClick={() => navigate('/suppliers/new')}>
                        New Supplier
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr
                  key={s.name}
                  className="cursor-pointer"
                  onClick={() => navigate(`/suppliers/${encodeURIComponent(s.name)}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/suppliers/${encodeURIComponent(s.name)}`);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                >
                  <td>
                    <div>
                      <p className="font-medium text-brand-700 dark:text-brand-300">{s.supplier_name || s.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{s.name}</p>
                    </div>
                  </td>
                  <td className="text-gray-500 dark:text-slate-400">{s.supplier_group || '—'}</td>
                  <td className="text-gray-500 dark:text-slate-400">{s.country || '—'}</td>
                  <td className="text-gray-500 dark:text-slate-400">{s.mobile_no || s.email_id || '—'}</td>
                  <td className="num font-medium text-green-700 dark:text-emerald-400">{formatCurrency(s.total_purchases)}</td>
                  <td className="num font-medium text-red-600">{formatCurrency(s.outstanding_amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden card divide-y divide-gray-100 dark:divide-slate-800">
        {loading ? (
          <LoadingBlock compact label="Loading suppliers…" />
        ) : suppliers.length === 0 ? (
          <EmptyState compact title="No suppliers found" description={search || selectedGroup ? 'Try adjusting filters or search.' : undefined} />
        ) : (
          suppliers.map((s) => (
            <button
              type="button"
              key={s.name}
              className="w-full px-4 py-3 space-y-1 text-left active:bg-gray-50 dark:active:bg-slate-800"
              onClick={() => navigate(`/suppliers/${encodeURIComponent(s.name)}`)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-700 dark:text-brand-300 truncate">{s.supplier_name || s.name}</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 shrink-0 ml-2">{s.supplier_group || ''}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-slate-400 truncate">{s.mobile_no || s.email_id || '—'}</span>
                <div className="flex gap-3 shrink-0 tabular-nums">
                  <span className="font-medium text-green-700 dark:text-emerald-400">{formatCurrency(s.total_purchases)}</span>
                  {s.outstanding_amount > 0 && <span className="font-medium text-red-600">{formatCurrency(s.outstanding_amount)}</span>}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}

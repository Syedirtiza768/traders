import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, DollarSign, CreditCard, Package, Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { suppliersApi } from '../lib/api';
import { formatCurrency, formatCompact, debounce } from '../lib/utils';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage your supplier base</p>
        </div>
        <button onClick={() => navigate('/suppliers/new')} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" /> New Supplier
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg"><Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-gray-500">Total Suppliers</p><p className="text-sm sm:text-lg font-bold">{total}</p></div>
        </div>
        <div className="card p-4 sm:p-5 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-green-50 rounded-lg"><DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-gray-500">Total Purchases</p><p className="text-sm sm:text-lg font-bold">{formatCompact(totalPurchases)}</p></div>
        </div>
        <div className="card p-4 sm:p-5 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-red-50 rounded-lg"><CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-gray-500">Total Payable</p><p className="text-sm sm:text-lg font-bold text-red-700">{formatCompact(totalPayable)}</p></div>
        </div>
        <div className="card p-4 sm:p-5 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-purple-50 rounded-lg"><Package className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-gray-500">Supplier Groups</p><p className="text-sm sm:text-lg font-bold">{groups.length}</p></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <select
          value={selectedGroup}
          onChange={(e) => { setSelectedGroup(e.target.value); setPage(1); }}
          className="input-field w-auto text-sm"
        >
          <option value="">All Groups</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search suppliers..."
                 onChange={(e) => debouncedSearch(e.target.value)} className="input-field pl-9" />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block table-container">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Group</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Country</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Purchases</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Payable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></td></tr>
            ) : suppliers.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No suppliers found.</td></tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.name} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => navigate(`/suppliers/${encodeURIComponent(s.name)}`)}>
                  <td className="px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-brand-700">{s.supplier_name || s.name}</p>
                      <p className="text-xs text-gray-400">{s.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">{s.supplier_group || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{s.country || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{s.mobile_no || s.email_id || '—'}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium text-green-700">{formatCurrency(s.total_purchases)}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium text-red-600">{formatCurrency(s.outstanding_amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden card divide-y divide-gray-100">
        {loading ? (
          <div className="px-4 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></div>
        ) : suppliers.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-400 text-sm">No suppliers found.</div>
        ) : (
          suppliers.map((s) => (
            <div key={s.name} className="px-4 py-3 space-y-1 active:bg-gray-50" onClick={() => navigate(`/suppliers/${encodeURIComponent(s.name)}`)}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-700 truncate">{s.supplier_name || s.name}</span>
                <span className="text-[10px] text-gray-400 shrink-0 ml-2">{s.supplier_group || ''}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 truncate">{s.mobile_no || s.email_id || '—'}</span>
                <div className="flex gap-3 shrink-0">
                  <span className="font-medium text-green-700">{formatCurrency(s.total_purchases)}</span>
                  {s.outstanding_amount > 0 && <span className="font-medium text-red-600">{formatCurrency(s.outstanding_amount)}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
          <span>Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary px-2 py-1 text-xs">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-secondary px-2 py-1 text-xs">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

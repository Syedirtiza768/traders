import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, DollarSign, CreditCard, TrendingUp, Plus } from 'lucide-react';
import { customersApi } from '../lib/api';
import { formatCurrency, formatCompact, debounce } from '../lib/utils';
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
  SearchField,
  PaginationBar,
} from '../components/ui';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
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
      if (selectedGroup) params.customer_group = selectedGroup;

      const [listRes, groupsRes] = await Promise.all([
        customersApi.getList(params),
        page === 1 ? customersApi.getGroups() : Promise.resolve(null),
      ]);

      const d = listRes.data.message;
      setCustomers(d.data || []);
      setTotal(d.total || 0);
      if (groupsRes) setGroups(groupsRes.data.message || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
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

  const totalRevenue = customers.reduce((s, c) => s + (c.total_revenue || 0), 0);
  const totalOutstanding = customers.reduce((s, c) => s + (c.outstanding_amount || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Customers"
        description="Manage your customer base"
        actions={
          <button type="button" onClick={() => navigate('/customers/new')} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" aria-hidden="true" /> New Customer
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg"><Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">Total Customers</p><p className="text-sm sm:text-lg font-bold dark:text-gray-100">{total}</p></div>
        </div>
        <div className="card p-4 sm:p-5 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-green-50 dark:bg-emerald-950/40 rounded-lg"><TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-emerald-400" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">Total Revenue</p><p className="text-sm sm:text-lg font-bold dark:text-gray-100">{formatCompact(totalRevenue)}</p></div>
        </div>
        <div className="card p-4 sm:p-5 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-red-50 dark:bg-red-950/40 rounded-lg"><CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">Total Receivable</p><p className="text-sm sm:text-lg font-bold text-red-700 dark:text-red-400">{formatCompact(totalOutstanding)}</p></div>
        </div>
        <div className="card p-4 sm:p-5 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-purple-50 dark:bg-violet-950/40 rounded-lg"><DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-violet-400" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">Customer Groups</p><p className="text-sm sm:text-lg font-bold dark:text-gray-100">{groups.length}</p></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <select
          value={selectedGroup}
          onChange={(e) => { setSelectedGroup(e.target.value); setPage(1); }}
          className="input-field w-auto text-sm"
          aria-label="Filter by customer group"
        >
          <option value="">All Groups</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <SearchField
          placeholder="Search customers..."
          aria-label="Search customers"
          onChange={debouncedSearch}
        />
      </div>

      <div className="hidden md:block table-container">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th scope="col">Customer</th>
              <th scope="col">Group</th>
              <th scope="col">Territory</th>
              <th scope="col">Contact</th>
              <th scope="col" className="text-right">Revenue</th>
              <th scope="col" className="text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <LoadingBlock compact label="Loading customers…" />
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    compact
                    title="No customers found"
                    description={search || selectedGroup ? 'Try adjusting filters or search.' : 'Add a customer to get started.'}
                    action={
                      <button type="button" className="btn-primary" onClick={() => navigate('/customers/new')}>
                        New Customer
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr
                  key={c.name}
                  className="cursor-pointer"
                  onClick={() => navigate(`/customers/${encodeURIComponent(c.name)}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/customers/${encodeURIComponent(c.name)}`);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                >
                  <td>
                    <div>
                      <p className="font-medium text-brand-700 dark:text-brand-300">{c.customer_name || c.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{c.name}</p>
                    </div>
                  </td>
                  <td className="text-gray-500 dark:text-slate-400">{c.customer_group || '—'}</td>
                  <td className="text-gray-500 dark:text-slate-400">{c.territory || '—'}</td>
                  <td className="text-gray-500 dark:text-slate-400">{c.mobile_no || c.email_id || '—'}</td>
                  <td className="num font-medium text-green-700 dark:text-emerald-400">{formatCurrency(c.total_revenue)}</td>
                  <td className="num font-medium text-red-600">{formatCurrency(c.outstanding_amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden card divide-y divide-gray-100 dark:divide-slate-800">
        {loading ? (
          <LoadingBlock compact label="Loading customers…" />
        ) : customers.length === 0 ? (
          <EmptyState compact title="No customers found" description={search || selectedGroup ? 'Try adjusting filters or search.' : undefined} />
        ) : (
          customers.map((c) => (
            <button
              type="button"
              key={c.name}
              className="w-full px-4 py-3 space-y-1 text-left active:bg-gray-50 dark:active:bg-slate-800"
              onClick={() => navigate(`/customers/${encodeURIComponent(c.name)}`)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-700 dark:text-brand-300 truncate">{c.customer_name || c.name}</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 shrink-0 ml-2">{c.customer_group || ''}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-slate-400 truncate">{c.mobile_no || c.email_id || '—'}</span>
                <div className="flex gap-3 shrink-0 tabular-nums">
                  <span className="font-medium text-green-700 dark:text-emerald-400">{formatCurrency(c.total_revenue)}</span>
                  {c.outstanding_amount > 0 && <span className="font-medium text-red-600">{formatCurrency(c.outstanding_amount)}</span>}
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

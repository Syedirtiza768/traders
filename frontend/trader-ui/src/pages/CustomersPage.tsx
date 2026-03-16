import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Users, DollarSign, CreditCard, TrendingUp, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { customersApi } from '../lib/api';
import { appendPreservedListQuery, formatCurrency, formatCompact, debounce } from '../lib/utils';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const search = searchParams.get('search') || '';
  const selectedGroup = searchParams.get('group') || '';
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

  const buildCustomerDetailPath = (customerName: string) => {
    return appendPreservedListQuery(`/customers/${encodeURIComponent(customerName)}`, listSearch);
  };

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
    debounce((val: string) => { updateSearchParams({ search: val || null, page: null }); }, 400),
    [searchParams],
  );

  const totalPages = Math.ceil(total / pageSize);

  const totalRevenue = customers.reduce((s, c) => s + (c.total_revenue || 0), 0);
  const totalOutstanding = customers.reduce((s, c) => s + (c.outstanding_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-500 mt-1">Manage your customer base</p>
      </div>

      <div className="flex justify-end">
        <button onClick={() => navigate('/customers/new')} className="btn-primary flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Add Customer
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-gray-500">Total Customers</p><p className="text-lg font-bold">{total}</p></div>
        </div>
        <div className="card p-5 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-xs text-gray-500">Total Revenue</p><p className="text-lg font-bold">{formatCompact(totalRevenue)}</p></div>
        </div>
        <div className="card p-5 flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg"><CreditCard className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-xs text-gray-500">Total Receivable</p><p className="text-lg font-bold text-red-700">{formatCompact(totalOutstanding)}</p></div>
        </div>
        <div className="card p-5 flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg"><DollarSign className="w-5 h-5 text-purple-600" /></div>
          <div><p className="text-xs text-gray-500">Customer Groups</p><p className="text-lg font-bold">{groups.length}</p></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center">
          <select
            value={selectedGroup}
            onChange={(e) => { updateSearchParams({ group: e.target.value || null, page: null }); }}
            className="input-field w-auto text-sm"
          >
            <option value="">All Groups</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search customers..."
                 defaultValue={search}
                 onChange={(e) => debouncedSearch(e.target.value)} className="input-field pl-9" />
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Group</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Territory</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Outstanding</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No customers found.</td></tr>
            ) : (
              customers.map((c) => (
                <tr
                  key={c.name}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(buildCustomerDetailPath(c.name))}
                >
                  <td className="px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-brand-700">{c.customer_name || c.name}</p>
                      <p className="text-xs text-gray-400">{c.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">{c.customer_group || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{c.territory || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{c.mobile_no || c.email_id || '—'}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium text-green-700">{formatCurrency(c.total_revenue)}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium text-red-600">{formatCurrency(c.outstanding_amount)}</td>
                  <td className="px-6 py-3 text-right">
                    {(c.outstanding_amount || 0) > 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(appendPreservedListQuery(`/finance/payments/new?paymentType=Receive&partyType=Customer&party=${encodeURIComponent(c.name)}&amount=${encodeURIComponent(String(c.outstanding_amount || 0))}`, listSearch));
                        }}
                        className="btn-secondary text-xs"
                      >
                        Collect Payment
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">No balance</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}</span>
          <div className="flex gap-1">
            <button onClick={() => updateSearchParams({ page: page > 2 ? String(page - 1) : null })} disabled={page === 1} className="btn-secondary px-2 py-1 text-xs">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => updateSearchParams({ page: String(Math.min(totalPages, page + 1)) })} disabled={page === totalPages} className="btn-secondary px-2 py-1 text-xs">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Users, Search, Plus, Phone, MapPin } from 'lucide-react';
import { resourceApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => { loadCustomers(); }, [page]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await resourceApi.list({
        doctype: 'Customer',
        fields: ['name', 'customer_name', 'customer_group', 'territory', 'mobile_no', 'email_id'],
        orderBy: 'customer_name asc',
        limit: 20,
        offset: page * 20,
      });
      setCustomers(res.data.data || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter(
    (c) => !search || c.customer_name?.toLowerCase().includes(search.toLowerCase()) || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">Manage your customer relationships</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="input-field pl-9 w-full"
        />
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((customer) => (
          <div key={customer.name} className="card p-5 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-brand-700">
                    {customer.customer_name?.charAt(0) || 'C'}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
                    {customer.customer_name}
                  </h3>
                  <p className="text-xs text-gray-500">{customer.name}</p>
                </div>
              </div>
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {customer.customer_group || 'General'}
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-gray-500">
              {customer.territory && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> {customer.territory}
                </div>
              )}
              {customer.mobile_no && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" /> {customer.mobile_no}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="col-span-full flex justify-center py-8">
            <div className="spinner" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">No customers found</div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="btn-secondary text-sm">Previous</button>
        <span className="text-sm text-gray-500">Page {page + 1}</span>
        <button onClick={() => setPage(page + 1)} disabled={customers.length < 20} className="btn-secondary text-sm">Next</button>
      </div>
    </div>
  );
}

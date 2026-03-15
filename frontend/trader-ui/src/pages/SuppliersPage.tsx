import { useState, useEffect } from 'react';
import { Truck, Search, Plus, Phone, MapPin } from 'lucide-react';
import { resourceApi } from '../lib/api';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => { loadSuppliers(); }, [page]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await resourceApi.list({
        doctype: 'Supplier',
        fields: ['name', 'supplier_name', 'supplier_group', 'supplier_type', 'mobile_no', 'email_id', 'country'],
        orderBy: 'supplier_name asc',
        limit: 20,
        offset: page * 20,
      });
      setSuppliers(res.data.data || []);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = suppliers.filter(
    (s: any) => !search || s.supplier_name?.toLowerCase().includes(search.toLowerCase()) || s.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 mt-1">Manage your supplier network</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers..."
          className="input-field pl-9 w-full"
        />
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Group</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Country</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((sup) => (
                <tr key={sup.name} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <Truck className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{sup.supplier_name}</p>
                        <p className="text-xs text-gray-500">{sup.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{sup.supplier_group}</td>
                  <td className="px-6 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {sup.supplier_type || 'Company'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="space-y-0.5">
                      {sup.mobile_no && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Phone className="w-3 h-3" />{sup.mobile_no}</div>}
                      {sup.email_id && <div className="text-xs text-gray-500 truncate max-w-[180px]">{sup.email_id}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">{sup.country || 'Pakistan'}</td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400"><div className="spinner mx-auto" /></td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No suppliers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="btn-secondary text-sm">Previous</button>
          <span className="text-sm text-gray-500">Page {page + 1}</span>
          <button onClick={() => setPage(page + 1)} disabled={suppliers.length < 20} className="btn-secondary text-sm">Next</button>
        </div>
      </div>
    </div>
  );
}

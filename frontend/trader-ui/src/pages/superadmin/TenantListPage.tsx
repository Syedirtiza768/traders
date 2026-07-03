import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { superAdminApi } from '../../lib/api';

type TenantRow = {
  name: string;
  tenant_name: string;
  status: string;
  company?: string;
  subscription_plan?: string;
  billing_status?: string;
  max_users?: number;
  user_count?: number;
  contact_email?: string;
};

const statusColors: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-800',
  Suspended: 'bg-amber-100 text-amber-800',
  Deactivated: 'bg-red-100 text-red-800',
  Pending: 'bg-slate-100 text-slate-800',
};

export default function TenantListPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.listTenants({ search: search || undefined, page_size: 100 });
      setTenants(res.data.message?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search businesses..."
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm"
        />
        <button type="submit" className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm">
          Search
        </button>
      </form>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Business</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Plan</th>
              <th className="text-left px-4 py-3 font-medium">Users</th>
              <th className="text-left px-4 py-3 font-medium">Contact</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading...</td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No businesses found.</td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <tr key={tenant.name} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/super-admin/tenants/${tenant.name}`} className="font-medium text-brand-700 hover:underline">
                      {tenant.tenant_name}
                    </Link>
                    <p className="text-xs text-slate-400">{tenant.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[tenant.status] || statusColors.Pending}`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{tenant.subscription_plan || '—'}</td>
                  <td className="px-4 py-3">
                    {tenant.user_count ?? 0}/{tenant.max_users ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{tenant.contact_email || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

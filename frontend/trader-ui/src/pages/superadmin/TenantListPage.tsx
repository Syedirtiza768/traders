import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { superAdminApi } from '../../lib/api';
import {
  PageHeader,
  LoadingBlock,
  EmptyState,
  AlertBanner,
  SearchField,
  StatusBadge,
} from '../../components/ui';

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

export default function TenantListPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.listTenants({ search: query || undefined, page_size: 100 });
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Businesses"
        description="Search and manage provisioned tenant businesses."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load(search);
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <SearchField
          placeholder="Search businesses…"
          value={search}
          onChange={setSearch}
          className="flex-1 sm:max-w-md"
          aria-label="Search businesses"
        />
        <button type="submit" className="btn-primary min-h-[44px] px-4">
          Search
        </button>
      </form>

      {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

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
                <td colSpan={5}><LoadingBlock compact label="Loading businesses…" /></td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={5}><EmptyState compact title="No businesses found" /></td>
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
                    <StatusBadge status={tenant.status || 'Pending'} />
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

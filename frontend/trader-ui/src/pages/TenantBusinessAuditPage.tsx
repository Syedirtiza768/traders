import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { tenantApi } from '../lib/api';
import { useTenantStore } from '../stores/tenantStore';

type AuditRow = {
  name: string;
  action: string;
  actor: string;
  actor_role?: string;
  timestamp: string;
  ip_address?: string;
};

export default function TenantBusinessAuditPage() {
  const navigate = useNavigate();
  const multitenantEnabled = useTenantStore((s) => s.enabled);
  const tenant = useTenantStore((s) => s.tenant);
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const pageSize = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tenantApi.getBusinessAuditLog({ page, page_size: pageSize });
      const message = res.data.message || {};
      setRows(message.data || []);
      setTotal(message.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load business audit log');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!multitenantEnabled) {
    return (
      <div className="card p-8 text-center text-gray-500">
        Business audit log is available when multi-tenant mode is enabled.
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 dark:text-brand-400 hover:text-brand-800"
        >
          <ArrowLeft size={16} /> Back to Settings
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
            <Shield size={20} className="text-violet-700 dark:text-violet-300" />
          </div>
          <div>
            <h1 className="page-title">Business Audit Log</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Platform actions for {tenant?.tenant_name || 'your business'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Time</th>
                <th className="text-left px-4 py-3 font-medium">Action</th>
                <th className="text-left px-4 py-3 font-medium">Actor</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Role</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No audit entries yet.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.name} className="border-t border-gray-100 dark:border-slate-700">
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300 whitespace-nowrap">{row.timestamp}</td>
                    <td className="px-4 py-3 capitalize">{row.action?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">{row.actor}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500">{row.actor_role || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} entries)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setSearchParams({ page: String(page - 1) })}
                className="btn-secondary flex items-center gap-1 disabled:opacity-50"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setSearchParams({ page: String(page + 1) })}
                className="btn-secondary flex items-center gap-1 disabled:opacity-50"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Document activity is in the{' '}
        <Link to="/settings/audit" className="text-brand-700 hover:underline">company activity log</Link>.
      </p>
    </div>
  );
}

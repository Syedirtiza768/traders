import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Plus, CheckCircle2, X, Calendar } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { PageHeader, LoadingBlock, AlertBanner, EmptyState } from '../components/ui';

type FiscalYear = {
  name: string;
  year_start_date: string;
  year_end_date: string;
  disabled: number;
  is_active: boolean;
};

export default function FiscalYearPage() {
  const navigate = useNavigate();
  const roles = useAuthStore((s) => s.roles);
  const isAdmin = roles.includes('Trader Admin') || roles.includes('System Manager');

  const [years, setYears] = useState<FiscalYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ year_start_date: '', year_end_date: '' });
  const [creating, setCreating] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getFiscalYears();
      setYears((res.data.message as FiscalYear[]) || []);
    } catch {
      setFeedback({ type: 'error', message: 'Could not load fiscal years.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleCreate = async () => {
    if (!form.year_start_date || !form.year_end_date) {
      setFeedback({ type: 'error', message: 'Both start and end dates are required.' });
      return;
    }
    setCreating(true);
    setFeedback(null);
    try {
      const res = await adminApi.createFiscalYear(form);
      const name = (res.data.message as { name: string }).name;
      setFeedback({ type: 'success', message: `Fiscal year "${name}" created successfully.` });
      setShowCreate(false);
      setForm({ year_start_date: '', year_end_date: '' });
      void load();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.exception || err?.response?.data?.message || 'Could not create fiscal year.' });
    } finally {
      setCreating(false);
    }
  };

  const handleSetActive = async (name: string) => {
    setActivating(name);
    setFeedback(null);
    try {
      await adminApi.setActiveFiscalYear(name);
      setFeedback({ type: 'success', message: `"${name}" is now the active fiscal year.` });
      void load();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.exception || 'Could not set active fiscal year.' });
    } finally {
      setActivating(null);
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return d; }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/settings')} className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
          <ArrowLeft size={16} /> Back to Settings
        </button>
        <div className="card p-8 text-center text-gray-500 dark:text-slate-400">Administrator access required.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Fiscal Year"
        description="Manage accounting periods and set the active fiscal year for your company"
        actions={
          <>
            <button type="button" onClick={() => navigate('/settings')} className="btn-secondary inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Back to Settings
            </button>
            <button type="button" onClick={() => void load()} className="btn-secondary flex items-center gap-2">
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
              <Plus size={14} /> New Fiscal Year
            </button>
          </>
        }
      />

      {feedback ? (
        <AlertBanner tone={feedback.type === 'success' ? 'success' : 'error'} onDismiss={() => setFeedback(null)}>
          {feedback.message}
        </AlertBanner>
      ) : null}

      {/* Create form (inline card) */}
      {showCreate && (
        <div className="card p-6 border-2 border-brand-200 dark:border-brand-700/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">New Fiscal Year</h2>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Year Start Date *</span>
              <input
                type="date"
                value={form.year_start_date}
                onChange={(e) => setForm((f) => ({ ...f, year_start_date: e.target.value }))}
                className="input-field mt-1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Year End Date *</span>
              <input
                type="date"
                value={form.year_end_date}
                onChange={(e) => setForm((f) => ({ ...f, year_end_date: e.target.value }))}
                className="input-field mt-1"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => void handleCreate()} disabled={creating} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              <Plus size={14} /> {creating ? 'Creating…' : 'Create Fiscal Year'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="card overflow-hidden">
        {loading ? (
          <LoadingBlock compact label="Loading fiscal years…" />
        ) : years.length === 0 ? (
          <EmptyState compact title="No fiscal years found" description="Create one above." />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/60">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Name</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Start Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">End Date</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {years.map((y) => (
                    <tr key={y.name} className={`hover:bg-gray-50 dark:hover:bg-slate-800/40 ${y.is_active ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400 dark:text-slate-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{y.name}</span>
                          {y.is_active && (
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600 dark:text-slate-300">{formatDate(y.year_start_date)}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 dark:text-slate-300">{formatDate(y.year_end_date)}</td>
                      <td className="px-5 py-3 text-center">
                        {y.is_active ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Active</span>
                        ) : y.disabled ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400">Disabled</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-400 dark:bg-slate-800 dark:text-slate-500">Inactive</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {!y.is_active && !y.disabled && (
                          <button
                            onClick={() => void handleSetActive(y.name)}
                            disabled={activating === y.name}
                            className="text-xs text-brand-700 dark:text-brand-400 hover:underline disabled:opacity-50"
                          >
                            {activating === y.name ? 'Setting…' : 'Set Active'}
                          </button>
                        )}
                        {y.is_active && <span className="text-xs text-gray-400 dark:text-slate-500">Current</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-slate-700">
              {years.map((y) => (
                <div key={y.name} className={`px-4 py-3 ${y.is_active ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{y.name}</span>
                      {y.is_active && <CheckCircle2 size={13} className="text-emerald-500" />}
                    </div>
                    {y.is_active ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Active</span>
                    ) : !y.disabled ? (
                      <button onClick={() => void handleSetActive(y.name)} disabled={activating === y.name} className="text-xs text-brand-700 dark:text-brand-400 hover:underline">
                        {activating === y.name ? 'Setting…' : 'Set Active'}
                      </button>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {formatDate(y.year_start_date)} → {formatDate(y.year_end_date)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

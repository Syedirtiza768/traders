import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Plus, Building2, X, Save, Pencil, ToggleLeft, ToggleRight, Star } from 'lucide-react';
import { tradingEntityApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { PageHeader, LoadingBlock, AlertBanner, EmptyState } from '../components/ui';

type TradingEntity = {
  name: string;
  trading_name: string;
  company: string;
  code: string;
  letterhead_address: string;
  is_active: number;
  is_default: number;
  logo: string;
  letterhead_header: string;
  letterhead_footer: string;
  customer_count?: number;
};

const EMPTY_FORM = {
  trading_name: '',
  letterhead_address: '',
  code: '',
  is_default: false,
  logo: '',
  letterhead_header: '',
  letterhead_footer: '',
};

export default function TradingEntitiesPage() {
  const navigate = useNavigate();
  const roles = useAuthStore((s) => s.roles);
  const isAdmin = roles.includes('Trader Admin') || roles.includes('System Manager') || roles.includes('Trader Super Admin');

  const [entities, setEntities] = useState<TradingEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [drawer, setDrawer] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<TradingEntity | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await tradingEntityApi.getList({ include_inactive: 1 });
      setEntities((res.data.message as TradingEntity[]) || []);
    } catch {
      setFeedback({ type: 'error', message: 'Could not load Trading Entities.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setDrawer('create');
  };

  const openEdit = (entity: TradingEntity) => {
    setEditTarget(entity);
    setForm({
      trading_name: entity.trading_name,
      letterhead_address: entity.letterhead_address || '',
      code: entity.code || '',
      is_default: !!entity.is_default,
      logo: entity.logo || '',
      letterhead_header: entity.letterhead_header || '',
      letterhead_footer: entity.letterhead_footer || '',
    });
    setDrawer('edit');
  };

  const handleSave = async () => {
    if (!form.trading_name.trim() || !form.letterhead_address.trim()) {
      setFeedback({ type: 'error', message: 'Trading name and letterhead address are required.' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      if (drawer === 'create') {
        await tradingEntityApi.create({
          trading_name: form.trading_name.trim(),
          letterhead_address: form.letterhead_address.trim(),
          code: form.code.trim() || undefined,
          is_default: form.is_default ? 1 : 0,
          logo: form.logo || undefined,
          letterhead_header: form.letterhead_header || undefined,
          letterhead_footer: form.letterhead_footer || undefined,
        });
        setFeedback({ type: 'success', message: `Trading Entity "${form.trading_name}" created.` });
      } else if (drawer === 'edit' && editTarget) {
        await tradingEntityApi.update({
          name: editTarget.name,
          trading_name: form.trading_name.trim(),
          letterhead_address: form.letterhead_address.trim(),
          code: form.code.trim(),
          is_default: form.is_default ? 1 : 0,
          logo: form.logo,
          letterhead_header: form.letterhead_header,
          letterhead_footer: form.letterhead_footer,
        });
        setFeedback({ type: 'success', message: 'Trading Entity updated.' });
      }
      setDrawer(null);
      void load();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.exception || err?.response?.data?.message || 'Could not save Trading Entity.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (entity: TradingEntity) => {
    setToggling(entity.name);
    try {
      await tradingEntityApi.update({
        name: entity.name,
        is_active: entity.is_active ? 0 : 1,
      });
      setFeedback({
        type: 'success',
        message: `"${entity.trading_name}" ${entity.is_active ? 'deactivated' : 'activated'}.`,
      });
      void load();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.exception || 'Could not update Trading Entity.',
      });
    } finally {
      setToggling(null);
    }
  };

  const handleSeed = async () => {
    try {
      const res = await tradingEntityApi.seedDefault();
      const seeded = res.data.message?.seeded;
      setFeedback({
        type: 'success',
        message: seeded
          ? 'Default Trading Entity seeded from company branding.'
          : 'A Trading Entity already exists — nothing seeded.',
      });
      void load();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.exception || 'Could not seed default entity.',
      });
    }
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
        title="Trading Entities"
        description="Commercial identities (DBA) for letterhead branding and customer scoping under one company"
        actions={
          <>
            <button type="button" onClick={() => navigate('/settings')} className="btn-secondary inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Back to Settings
            </button>
            <button type="button" onClick={() => void load()} className="btn-secondary flex items-center gap-2">
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" onClick={() => void handleSeed()} className="btn-secondary flex items-center gap-2">
              Seed Default
            </button>
            <button type="button" onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus size={14} /> New Entity
            </button>
          </>
        }
      />

      {feedback ? (
        <AlertBanner tone={feedback.type === 'success' ? 'success' : 'error'} onDismiss={() => setFeedback(null)}>
          {feedback.message}
        </AlertBanner>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: entities.length, color: 'text-gray-700 dark:text-gray-200' },
          { label: 'Active', value: entities.filter((e) => e.is_active).length, color: 'text-emerald-700 dark:text-emerald-300' },
          { label: 'Inactive', value: entities.filter((e) => !e.is_active).length, color: 'text-red-600 dark:text-red-400' },
          { label: 'Customers tagged', value: entities.reduce((n, e) => n + (e.customer_count || 0), 0), color: 'text-violet-600 dark:text-violet-400' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <LoadingBlock label="Loading Trading Entities…" />
      ) : entities.length === 0 ? (
        <EmptyState
          title="No Trading Entities yet"
          description="Create a commercial identity, or seed one from the company letterhead."
          action={
            <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
              <Plus size={14} /> New Entity
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/60 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Trading Name</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Customers</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {entities.map((entity) => (
                  <tr key={entity.name} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                        <Building2 size={14} className="text-brand-600 shrink-0" />
                        {entity.trading_name}
                        {entity.is_default ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-300">
                            <Star size={10} /> Default
                          </span>
                        ) : null}
                      </div>
                      {(entity.logo || entity.letterhead_header) ? (
                        <p className="text-xs text-gray-500 mt-0.5">Logo / letterhead attached</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{entity.code || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300 max-w-xs truncate">{entity.letterhead_address || '—'}</td>
                    <td className="px-4 py-3">{entity.customer_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${entity.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {entity.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => openEdit(entity)} className="btn-secondary p-1.5" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={toggling === entity.name}
                          onClick={() => void handleToggleActive(entity)}
                          className="btn-secondary p-1.5"
                          title={entity.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {entity.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {drawer ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow-xl h-full overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 px-4 py-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {drawer === 'create' ? 'New Trading Entity' : 'Edit Trading Entity'}
              </h3>
              <button type="button" onClick={() => setDrawer(null)} className="p-1.5 text-gray-500 hover:text-gray-800">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Trading Name *</span>
                <input
                  className="input-field"
                  value={form.trading_name}
                  onChange={(e) => setForm((f) => ({ ...f, trading_name: e.target.value }))}
                  placeholder="e.g. Electrence Controls"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Letterhead Address *</span>
                <textarea
                  className="input-field min-h-[88px]"
                  value={form.letterhead_address}
                  onChange={(e) => setForm((f) => ({ ...f, letterhead_address: e.target.value }))}
                  placeholder="Address block printed on documents"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Code</span>
                <input
                  className="input-field font-mono"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="Optional short code"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                />
                Default for new customers
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Logo URL / path</span>
                <input
                  className="input-field font-mono text-xs"
                  value={form.logo}
                  onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))}
                  placeholder="/files/…"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Letterhead Header</span>
                <input
                  className="input-field font-mono text-xs"
                  value={form.letterhead_header}
                  onChange={(e) => setForm((f) => ({ ...f, letterhead_header: e.target.value }))}
                  placeholder="/files/…"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Letterhead Footer</span>
                <input
                  className="input-field font-mono text-xs"
                  value={form.letterhead_footer}
                  onChange={(e) => setForm((f) => ({ ...f, letterhead_footer: e.target.value }))}
                  placeholder="/files/…"
                />
              </label>
            </div>
            <div className="border-t border-gray-100 dark:border-slate-700 px-4 py-3 flex justify-end gap-2">
              <button type="button" onClick={() => setDrawer(null)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
                <Save size={14} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

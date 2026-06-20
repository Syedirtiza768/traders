import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Plus, Warehouse, X, Save, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

type WarehouseItem = {
  name: string;
  warehouse_name: string;
  parent_warehouse: string;
  disabled: number;
  is_group: number;
  warehouse_type: string;
  city: string;
  company: string;
};

const EMPTY_FORM = {
  warehouse_name: '',
  parent_warehouse: '',
  warehouse_type: '',
  city: '',
  is_group: false,
};

const WAREHOUSE_TYPES = ['', 'Transit', 'Fixed Asset Warehouse'];

export default function WarehouseManagementPage() {
  const navigate = useNavigate();
  const roles = useAuthStore((s) => s.roles);
  const isAdmin = roles.includes('Trader Admin') || roles.includes('System Manager');

  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Drawer
  const [drawer, setDrawer] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editTarget, setEditTarget] = useState<WarehouseItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingWh, setTogglingWh] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getWarehouses();
      setWarehouses((res.data.message as WarehouseItem[]) || []);
    } catch {
      setFeedback({ type: 'error', message: 'Could not load warehouses.' });
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

  const openEdit = (wh: WarehouseItem) => {
    setEditTarget(wh);
    setForm({
      warehouse_name: wh.warehouse_name,
      parent_warehouse: wh.parent_warehouse || '',
      warehouse_type: wh.warehouse_type || '',
      city: wh.city || '',
      is_group: !!wh.is_group,
    });
    setDrawer('edit');
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      if (drawer === 'create') {
        await adminApi.createWarehouse({
          warehouse_name: form.warehouse_name,
          parent_warehouse: form.parent_warehouse,
          warehouse_type: form.warehouse_type,
          city: form.city,
          is_group: form.is_group ? 1 : 0,
        });
        setFeedback({ type: 'success', message: `Warehouse "${form.warehouse_name}" created.` });
      } else if (drawer === 'edit' && editTarget) {
        await adminApi.updateWarehouse({
          name: editTarget.name,
          city: form.city,
          warehouse_type: form.warehouse_type,
          disabled: editTarget.disabled,
        });
        setFeedback({ type: 'success', message: 'Warehouse updated.' });
      }
      setDrawer(null);
      void load();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.exception || err?.response?.data?.message || 'Could not save warehouse.' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDisabled = async (wh: WarehouseItem) => {
    setTogglingWh(wh.name);
    try {
      await adminApi.updateWarehouse({ name: wh.name, disabled: wh.disabled ? 0 : 1 });
      setFeedback({ type: 'success', message: `"${wh.warehouse_name}" ${wh.disabled ? 'enabled' : 'disabled'}.` });
      void load();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.exception || 'Could not update warehouse.' });
    } finally {
      setTogglingWh(null);
    }
  };

  // Group warehouses for display (groups first, then their children)
  const groupWarehouses = warehouses.filter((w) => w.is_group);
  const leafWarehouses = warehouses.filter((w) => !w.is_group);

  const parentOptions = warehouses.filter((w) => w.is_group);

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
      {/* Header */}
      <div>
        <button onClick={() => navigate('/settings')} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 dark:text-brand-400 hover:text-brand-800">
          <ArrowLeft size={16} /> Back to Settings
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">Warehouse Management</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Configure warehouse structure, locations, and enable/disable warehouses</p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button onClick={() => void load()} className="btn-secondary flex items-center gap-2">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus size={14} /> New Warehouse
            </button>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-start justify-between gap-3 ${
          feedback.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100'
            : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)}><X size={14} /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: warehouses.length, color: 'text-gray-700 dark:text-gray-200' },
          { label: 'Active', value: warehouses.filter((w) => !w.disabled && !w.is_group).length, color: 'text-emerald-700 dark:text-emerald-300' },
          { label: 'Disabled', value: warehouses.filter((w) => w.disabled).length, color: 'text-red-600 dark:text-red-400' },
          { label: 'Groups', value: groupWarehouses.length, color: 'text-violet-600 dark:text-violet-400' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Warehouse list */}
      {loading ? (
        <div className="card flex items-center justify-center h-48"><div className="spinner" /></div>
      ) : warehouses.length === 0 ? (
        <div className="card py-12 text-center text-sm text-gray-400 dark:text-slate-500">No warehouses found.</div>
      ) : (
        <div className="space-y-3">
          {/* Group nodes */}
          {groupWarehouses.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-violet-50 dark:bg-violet-900/20 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-xs font-semibold uppercase text-violet-600 dark:text-violet-400 tracking-wide">Warehouse Groups</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {groupWarehouses.map((wh) => (
                  <WarehouseRow key={wh.name} wh={wh} onEdit={openEdit} onToggle={handleToggleDisabled} toggling={togglingWh === wh.name} indent={0} />
                ))}
              </div>
            </div>
          )}

          {/* Leaf warehouses, grouped by parent */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 tracking-wide">Warehouses</h3>
            </div>
            {leafWarehouses.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">No warehouses yet.</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {leafWarehouses.map((wh) => (
                  <WarehouseRow key={wh.name} wh={wh} onEdit={openEdit} onToggle={handleToggleDisabled} toggling={togglingWh === wh.name} indent={wh.parent_warehouse ? 1 : 0} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setDrawer(null)} />
          <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {drawer === 'create' ? 'New Warehouse' : `Edit: ${editTarget?.warehouse_name}`}
              </h2>
              <button onClick={() => setDrawer(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
            </div>

            <div className="flex-1 p-6 space-y-5">
              {drawer === 'create' && (
                <>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Warehouse Name *</span>
                    <input type="text" value={form.warehouse_name} onChange={(e) => setForm((f) => ({ ...f, warehouse_name: e.target.value }))} className="input-field mt-1" placeholder="e.g. Main Store" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Parent Warehouse</span>
                    <select value={form.parent_warehouse} onChange={(e) => setForm((f) => ({ ...f, parent_warehouse: e.target.value }))} className="input-field mt-1">
                      <option value="">— None —</option>
                      {parentOptions.map((p) => (
                        <option key={p.name} value={p.name}>{p.warehouse_name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_group}
                      onChange={(e) => setForm((f) => ({ ...f, is_group: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">This is a group / parent warehouse</span>
                  </label>
                </>
              )}

              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Warehouse Type</span>
                <select value={form.warehouse_type} onChange={(e) => setForm((f) => ({ ...f, warehouse_type: e.target.value }))} className="input-field mt-1">
                  {WAREHOUSE_TYPES.map((t) => <option key={t} value={t}>{t || '— Default —'}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">City / Location</span>
                <input type="text" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="input-field mt-1" placeholder="e.g. Karachi" />
              </label>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setDrawer(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => void handleSave()} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
                <Save size={14} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WarehouseRow({
  wh,
  onEdit,
  onToggle,
  toggling,
  indent,
}: {
  wh: WarehouseItem;
  onEdit: (wh: WarehouseItem) => void;
  onToggle: (wh: WarehouseItem) => void;
  toggling: boolean;
  indent: number;
}) {
  return (
    <div className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/40 ${wh.disabled ? 'opacity-60' : ''}`}>
      <div style={{ paddingLeft: indent * 20 }} className="flex items-center gap-2 flex-1 min-w-0">
        <Warehouse size={14} className={`flex-shrink-0 ${wh.is_group ? 'text-violet-500' : 'text-gray-400 dark:text-slate-500'}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{wh.warehouse_name}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            {wh.parent_warehouse && (
              <span className="text-[10px] text-gray-400 dark:text-slate-500">under {wh.parent_warehouse.split(' - ')[0]}</span>
            )}
            {wh.city && <span className="text-[10px] text-gray-400 dark:text-slate-500">{wh.city}</span>}
            {wh.warehouse_type && <span className="text-[10px] text-gray-400 dark:text-slate-500">{wh.warehouse_type}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
          wh.is_group
            ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
            : wh.disabled
            ? 'bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400'
            : 'bg-green-100 text-green-700 dark:bg-emerald-950/30 dark:text-emerald-300'
        }`}>
          {wh.is_group ? 'Group' : wh.disabled ? 'Off' : 'Active'}
        </span>
        {!wh.is_group && (
          <>
            <button onClick={() => onEdit(wh)} title="Edit" className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              <Pencil size={13} />
            </button>
            <button onClick={() => onToggle(wh)} disabled={toggling} title={wh.disabled ? 'Enable' : 'Disable'} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-40">
              {wh.disabled ? <ToggleLeft size={15} className="text-red-400" /> : <ToggleRight size={15} className="text-green-500" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

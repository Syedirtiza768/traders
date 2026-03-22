import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Box, Edit2, Package, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { bundlingApi, inventoryApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import SearchableSelect from '../components/SearchableSelect';

type BundleItem = { item_code: string; qty: number; rate: number };
type Bundle = { name: string; bundle_name: string; description: string; total_rate: number; item_count: number };

const EMPTY_ITEM: BundleItem = { item_code: '', qty: 1, rate: 0 };

export default function ItemBundlesPage() {
  const navigate = useNavigate();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  // Form state
  const [bundleName, setBundleName] = useState('');
  const [description, setDescription] = useState('');
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadBundles = useCallback(async () => {
    setLoading(true);
    try {
      const [bundlesRes, itemsRes] = await Promise.all([
        bundlingApi.getBundles({ search: search || undefined }),
        inventoryApi.getItems({ page: 1, page_size: 200 }),
      ]);
      setBundles(bundlesRes.data.message?.data || []);
      setItems(itemsRes.data.message?.data || []);
    } catch {
      setFeedback({ type: 'error', message: 'Could not load bundles.' });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { void loadBundles(); }, [loadBundles]);

  const total = useMemo(
    () => bundleItems.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0),
    [bundleItems],
  );

  const resetForm = () => {
    setBundleName('');
    setDescription('');
    setBundleItems([{ ...EMPTY_ITEM }]);
    setEditing(null);
    setShowForm(false);
    setError(null);
  };

  const openEdit = async (name: string) => {
    try {
      const res = await bundlingApi.getBundleDetail(name);
      const bundle = res.data.message;
      setBundleName(bundle.bundle_name || '');
      setDescription(bundle.description || '');
      setBundleItems(
        (bundle.items || []).map((i: any) => ({
          item_code: i.item_code,
          qty: Number(i.qty) || 1,
          rate: Number(i.rate) || 0,
        })),
      );
      setEditing(name);
      setShowForm(true);
    } catch {
      setFeedback({ type: 'error', message: 'Could not load bundle details.' });
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Delete bundle "${name}"? This cannot be undone.`)) return;
    try {
      await bundlingApi.deleteBundle(name);
      setFeedback({ type: 'success', message: `Bundle ${name} deleted.` });
      void loadBundles();
    } catch {
      setFeedback({ type: 'error', message: 'Could not delete bundle.' });
    }
  };

  const handleItemChange = (index: number, itemCode: string) => {
    const selected = items.find((item) => item.item_code === itemCode || item.name === itemCode);
    setBundleItems((current) =>
      current.map((line, i) =>
        i === index
          ? { ...line, item_code: itemCode, rate: selected?.standard_rate ?? selected?.valuation_rate ?? 0 }
          : line,
      ),
    );
  };

  const updateItem = (index: number, patch: Partial<BundleItem>) => {
    setBundleItems((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const handleSave = async () => {
    if (!bundleName.trim()) { setError('Bundle name is required.'); return; }
    const validItems = bundleItems.filter((i) => i.item_code);
    if (validItems.length === 0) { setError('Add at least one item.'); return; }

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await bundlingApi.updateBundle({ name: editing, bundle_name: bundleName, description, items: validItems });
        setFeedback({ type: 'success', message: 'Bundle updated.' });
      } else {
        await bundlingApi.createBundle({ bundle_name: bundleName, description, items: validItems });
        setFeedback({ type: 'success', message: 'Bundle created.' });
      }
      resetForm();
      void loadBundles();
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Could not save bundle.');
    } finally {
      setSaving(false);
    }
  };

  const itemOptions = useMemo(
    () => items.map((item) => ({ label: item.item_name || item.item_code || item.name, value: item.item_code || item.name })),
    [items],
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button onClick={() => navigate('/settings')} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft size={16} /> Back to Settings
          </button>
          <h1 className="page-title">Item Bundles</h1>
          <p className="mt-1 text-gray-500">Group multiple items into a single line item for Quotations, Orders, and Invoices.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> New Bundle
        </button>
      </div>

      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm ${feedback.type === 'success' ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bundles…"
          className="input-field pl-10"
        />
      </div>

      {/* Bundle Form Modal */}
      {showForm && (
        <div className="card p-6 space-y-5 border-2 border-brand-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{editing ? 'Edit Bundle' : 'New Bundle'}</h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bundle Name *</label>
              <input type="text" value={bundleName} onChange={(e) => setBundleName(e.target.value)} className="input-field" placeholder="e.g. Standard Office Setup" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (shown on external docs)</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" placeholder="e.g. Complete office furniture set" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Bundle Items</h3>
              <button onClick={() => setBundleItems((c) => [...c, { ...EMPTY_ITEM }])} className="btn-secondary text-xs flex items-center gap-1">
                <Plus size={12} /> Add Item
              </button>
            </div>
            <div className="space-y-2">
              {bundleItems.map((line, i) => (
                <div key={i} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-[2fr_1fr_1fr_auto]">
                  <SearchableSelect
                    value={line.item_code}
                    onChange={(v) => handleItemChange(i, v)}
                    options={itemOptions}
                    placeholder="Select item"
                    className="text-sm"
                  />
                  <input type="number" min={1} step="0.01" value={line.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) || 0 })} className="input-field text-sm" placeholder="Qty" />
                  <input type="number" min={0} step="0.01" value={line.rate} onChange={(e) => updateItem(i, { rate: Number(e.target.value) || 0 })} className="input-field text-sm" placeholder="Rate" />
                  <button onClick={() => setBundleItems((c) => c.length > 1 ? c.filter((_, j) => j !== i) : c)} className="text-red-400 hover:text-red-600 self-center">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between items-center text-sm">
              <span className="text-gray-500">Bundle Total:</span>
              <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={resetForm} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              <Save size={14} /> {saving ? 'Saving…' : editing ? 'Update Bundle' : 'Create Bundle'}
            </button>
          </div>
        </div>
      )}

      {/* Bundles List */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : bundles.length === 0 ? (
        <div className="card p-12 text-center">
          <Box size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No item bundles yet. Create one to group items together.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bundles.map((bundle) => (
            <div key={bundle.name} className="card p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-brand-500" />
                  <span className="font-semibold text-gray-900">{bundle.bundle_name}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{bundle.item_count} items</span>
                </div>
                {bundle.description && <p className="mt-1 text-sm text-gray-500">{bundle.description}</p>}
                <p className="mt-1 text-sm font-medium text-gray-700">{formatCurrency(bundle.total_rate)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(bundle.name)} className="btn-secondary flex items-center gap-1 text-sm">
                  <Edit2 size={13} /> Edit
                </button>
                <button onClick={() => handleDelete(bundle.name)} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

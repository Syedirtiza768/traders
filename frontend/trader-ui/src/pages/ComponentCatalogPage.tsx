import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers, RefreshCw, Search, AlertTriangle, Plus, X, CheckCircle,
  ChevronLeft, ChevronRight, Zap,
} from 'lucide-react';
import { catalogApi } from '../lib/api';
import { useCompanyStore } from '../stores/companyStore';
import { formatAmount } from '../lib/utils';

function fmtAmt(n: number) {
  return formatAmount(n);
}
function fmtQty(n: number) {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}

interface CatalogItem {
  item_code: string;
  item_name: string;
  category: string;
  form_factor: string;
  capacity: string;
  grade: string;
  qty_on_hand: number;
  stock_value: number;
  valuation_rate: number;
  standard_rate: number;
}

interface Taxonomy {
  categories: string[];
  taxonomy: Record<string, { form_factors: string[]; capacities: string[]; grades: string[] }>;
}

interface CreateForm {
  category: string;
  form_factor: string;
  capacity: string;
  grade: string;
  standard_rate: string;
}

interface QuickEntryForm {
  text: string;
  loading: boolean;
  result: any | null;
  error: string | null;
}

export default function ComponentCatalogPage() {
  const navigate = useNavigate();
  const componentsEnabled = useCompanyStore((s) => s.componentsEnabled);
  const company = useCompanyStore((s) => s.company);
  const revision = useCompanyStore((s) => s.revision);
  const currency = useCompanyStore((s) => s.currency) || 'PKR';

  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({ category: '', form_factor: '', capacity: '', grade: '', standard_rate: '' });
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [quickEntry, setQuickEntry] = useState<QuickEntryForm>({ text: '', loading: false, result: null, error: null });

  useEffect(() => {
    catalogApi.getTaxonomy().then((res) => {
      setTaxonomy(res.data.message as Taxonomy);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const res = await catalogApi.getItems({
        category: filterCategory || undefined,
        search: filterSearch || undefined,
        page,
        page_size: 20,
      });
      const msg = res.data.message as any;
      setItems(msg.data || []);
      setTotal(msg.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Failed to load catalog.');
    } finally {
      setLoading(false);
    }
  }, [company, filterCategory, filterSearch, page, revision]);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    if (!createForm.category || !createForm.form_factor || !createForm.capacity || !createForm.grade) return;
    setCreating(true);
    try {
      const res = await catalogApi.findOrCreateSku({
        ...createForm,
        standard_rate: parseFloat(createForm.standard_rate) || 0,
      });
      const msg = res.data.message as any;
      setCreateSuccess(msg.created ? `Created: ${msg.item_code}` : `Already exists: ${msg.item_code}`);
      setShowCreate(false);
      setCreateForm({ category: '', form_factor: '', capacity: '', grade: '', standard_rate: '' });
      void load();
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Failed to create SKU.');
    } finally {
      setCreating(false);
    }
  };

  const handleQuickEntry = async () => {
    if (!quickEntry.text.trim()) return;
    setQuickEntry((q) => ({ ...q, loading: true, result: null, error: null }));
    try {
      const res = await catalogApi.parseQuickEntry(quickEntry.text);
      setQuickEntry((q) => ({ ...q, loading: false, result: res.data.message }));
    } catch (err: any) {
      setQuickEntry((q) => ({ ...q, loading: false, error: err?.response?.data?.exception || 'Parse failed.' }));
    }
  };

  const selectedTaxonomy = taxonomy?.taxonomy[createForm.category];

  if (!componentsEnabled) {
    return (
      <div className="p-8 flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <h2 className="text-lg font-semibold">Components Trading Not Enabled</h2>
        <button onClick={() => navigate('/settings')} className="btn-primary text-sm px-4 py-2">Go to Settings</button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Component Catalog</h1>
          <span className="text-sm text-gray-400">{total} items</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-brand-600">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
            <Plus className="w-4 h-4" /> New SKU
          </button>
        </div>
      </div>

      {/* Quick entry tester */}
      <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quick-Entry Parser</h3>
          <span className="text-xs text-gray-400">try: "1tb pulled 5 300"</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder='e.g. "1tb pulled 5 300" or "pulled 2tb 10 250"'
            value={quickEntry.text}
            onChange={(e) => setQuickEntry((q) => ({ ...q, text: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickEntry()}
            className="input-field flex-1 text-sm font-mono"
          />
          <button onClick={handleQuickEntry} disabled={quickEntry.loading} className="btn-primary text-sm px-4 py-2 disabled:opacity-60">
            {quickEntry.loading ? 'Parsing…' : 'Parse'}
          </button>
        </div>
        {quickEntry.error && <p className="text-xs text-red-600">{quickEntry.error}</p>}
        {quickEntry.result && (
          <div className="text-xs bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[['Category', quickEntry.result.category], ['Capacity', quickEntry.result.capacity], ['Grade', quickEntry.result.grade], ['Form Factor', quickEntry.result.form_factor || 'Auto-detect']].map(([k, v]) => (
                <div key={k}><p className="text-gray-400">{k}</p><p className="font-semibold text-gray-800 dark:text-gray-200">{v || '—'}</p></div>
              ))}
              {[['Qty', quickEntry.result.qty], ['Rate', quickEntry.result.rate]].map(([k, v]) => (
                <div key={k}><p className="text-gray-400">{k}</p><p className="font-semibold text-gray-800 dark:text-gray-200">{v ?? '—'}</p></div>
              ))}
            </div>
            {quickEntry.result.resolved_item && (
              <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                Resolved: {quickEntry.result.resolved_item.item_code}
              </p>
            )}
            {quickEntry.result.warnings?.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {quickEntry.result.warnings.map((w: string, i: number) => (
                  <li key={i} className="text-amber-600 dark:text-amber-400">⚠ {w}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {createSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 flex items-center justify-between text-sm text-green-700 dark:text-green-400">
          <span><CheckCircle className="inline w-4 h-4 mr-1" />{createSuccess}</span>
          <button onClick={() => setCreateSuccess(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search items…" value={filterSearch} onChange={(e) => { setFilterSearch(e.target.value); setPage(1); }} className="input-field pl-9 text-sm" />
        </div>
        <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }} className="input-field text-sm">
          <option value="">All Categories</option>
          {taxonomy?.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Layers className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No component items found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacity</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Form Factor</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {items.map((item) => (
                  <tr key={item.item_code} className="hover:bg-gray-50 dark:hover:bg-slate-900/30">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{item.category}</td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{item.capacity || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{item.form_factor || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        item.grade === 'New' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                        item.grade === 'Pulled' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                        'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>{item.grade || '—'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{fmtQty(item.qty_on_hand)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-400">{fmtAmt(item.valuation_rate)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-purple-600 dark:text-purple-400">{fmtAmt(item.stock_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs text-gray-400">
          <span>{total} items total</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <span>Page {page}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={items.length < 20} className="p-1 rounded disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Create SKU modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Create / Find SKU</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {(['category', 'form_factor', 'capacity', 'grade'] as const).map((field) => {
              const options = field === 'category'
                ? taxonomy?.categories || []
                : field === 'form_factor'
                ? selectedTaxonomy?.form_factors || []
                : field === 'capacity'
                ? selectedTaxonomy?.capacities || []
                : selectedTaxonomy?.grades || [];
              const label = { category: 'Category', form_factor: 'Form Factor', capacity: 'Capacity', grade: 'Grade' }[field];
              return (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <select
                    value={createForm[field]}
                    onChange={(e) => setCreateForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="input-field text-sm"
                  >
                    <option value="">Select {label}…</option>
                    {options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              );
            })}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Standard Rate ({currency})</label>
              <input
                type="number"
                value={createForm.standard_rate}
                onChange={(e) => setCreateForm((f) => ({ ...f, standard_rate: e.target.value }))}
                className="input-field text-sm"
                placeholder="0"
                min={0}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowCreate(false)} className="flex-1 btn-secondary text-sm py-2">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating || !createForm.category || !createForm.form_factor || !createForm.capacity || !createForm.grade}
                className="flex-1 btn-primary text-sm py-2 disabled:opacity-60"
              >
                {creating ? 'Creating…' : 'Find or Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

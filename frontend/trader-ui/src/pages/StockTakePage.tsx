import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, RefreshCw, AlertTriangle, CheckCircle, X, Save } from 'lucide-react';
import { catalogApi, inventoryApi } from '../lib/api';
import { useCompanyStore } from '../stores/companyStore';

function fmtQty(n: number) {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}

interface StockTakeItem {
  item_code: string;
  item_name: string;
  category: string;
  capacity: string;
  grade: string;
  stock_uom: string;
  system_qty: number;
  warehouse: string;
  valuation_rate: number;
  counted_qty: string;
}

export default function StockTakePage() {
  const navigate = useNavigate();
  const componentsEnabled = useCompanyStore((s) => s.componentsEnabled);
  const company = useCompanyStore((s) => s.company);
  const revision = useCompanyStore((s) => s.revision);

  const [warehouses, setWarehouses] = useState<{ name: string }[]>([]);
  const [warehouse, setWarehouse] = useState('');
  const [taxonomy, setTaxonomy] = useState<{ categories: string[] } | null>(null);
  const [category, setCategory] = useState('');
  const [items, setItems] = useState<StockTakeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    inventoryApi.getWarehouses().then((res) => {
      const whs = (res.data.message || []) as { name: string }[];
      setWarehouses(whs);
      if (whs.length) setWarehouse(whs[0].name);
    }).catch(() => {});
    catalogApi.getTaxonomy().then((res) => setTaxonomy(res.data.message as any)).catch(() => {});
  }, [company]);

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const res = await catalogApi.getStockTakeItems({ warehouse: warehouse || undefined, category: category || undefined, page_size: 200 });
      const msg = res.data.message as any;
      setItems((msg.data || []).map((r: any) => ({ ...r, counted_qty: String(r.system_qty) })));
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Failed to load items.');
    } finally {
      setLoading(false);
    }
  }, [company, warehouse, category, revision]);

  useEffect(() => { void load(); }, [load]);

  const handleSubmit = async () => {
    const lines = items.filter((i) => Math.abs((parseFloat(i.counted_qty) || 0) - i.system_qty) >= 0.001);
    if (!lines.length) {
      setError('No variances found — counted quantities match system quantities.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await catalogApi.createStockTake({
        items: lines.map((i) => ({
          item_code: i.item_code,
          counted_qty: parseFloat(i.counted_qty) || 0,
          warehouse: i.warehouse || warehouse,
        })),
        warehouse,
      });
      const msg = res.data.message as any;
      setSuccess(msg.message || `Stock take posted: ${msg.stock_reconciliation} (${msg.adjusted} lines adjusted)`);
      void load();
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Stock take failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const varianceCount = items.filter((i) => Math.abs((parseFloat(i.counted_qty) || 0) - i.system_qty) >= 0.001).length;

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
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stock Take</h1>
          {varianceCount > 0 && (
            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold px-2 py-0.5 rounded-full">
              {varianceCount} variances
            </span>
          )}
        </div>
        <button onClick={() => void load()} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-brand-600">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={warehouse} onChange={(e) => setWarehouse(e.target.value)} className="input-field text-sm flex-1 min-w-[180px]">
          <option value="">All Warehouses</option>
          {warehouses.map((w) => <option key={w.name} value={w.name}>{w.name}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field text-sm flex-1 min-w-[150px]">
          <option value="">All Categories</option>
          {taxonomy?.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 flex items-center justify-between text-sm text-green-700 dark:text-green-400">
          <span><CheckCircle className="inline w-4 h-4 mr-1" />{success}</span>
          <button onClick={() => setSuccess(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">{error}</div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <ClipboardList className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No items found for stock take</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacity</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">System Qty</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Counted Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {items.map((item) => {
                  const counted = parseFloat(item.counted_qty) || 0;
                  const variance = counted - item.system_qty;
                  const hasVariance = Math.abs(variance) >= 0.001;
                  return (
                    <tr key={`${item.item_code}-${item.warehouse}`} className={`${hasVariance ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-900/30'}`}>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.category}</td>
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{item.capacity || '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          item.grade === 'New' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                          item.grade === 'Pulled' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                          'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}>{item.grade || '—'}</span>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{fmtQty(item.system_qty)}</td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          value={item.counted_qty}
                          min={0}
                          onChange={(e) => setItems((prev) => prev.map((i) =>
                            i.item_code === item.item_code && i.warehouse === item.warehouse
                              ? { ...i, counted_qty: e.target.value } : i
                          ))}
                          className={`input-field text-sm text-center w-20 ${hasVariance ? 'border-amber-400 dark:border-amber-500' : ''}`}
                        />
                      </td>
                      <td className={`px-4 py-2 text-right font-semibold ${
                        hasVariance
                          ? variance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          : 'text-gray-400'
                      }`}>
                        {hasVariance ? (variance > 0 ? '+' : '') + fmtQty(variance) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {items.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-sm text-gray-500">{items.length} items loaded · {varianceCount} variances</span>
            <button
              onClick={handleSubmit}
              disabled={submitting || varianceCount === 0}
              className="btn-primary text-sm px-6 py-2 flex items-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Posting…' : `Post ${varianceCount} Adjustment${varianceCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

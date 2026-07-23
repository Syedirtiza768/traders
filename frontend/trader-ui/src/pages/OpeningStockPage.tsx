import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, AlertTriangle, Plus, Trash2, Upload,
} from 'lucide-react';
import { catalogApi, inventoryApi } from '../lib/api';
import { useCompanyStore } from '../stores/companyStore';
import { formatAmount } from '../lib/utils';
import { PageHeader, AlertBanner, EmptyState } from '../components/ui';

function fmtAmt(n: number) {
  return formatAmount(n);
}

interface StockLine {
  id: number;
  item_code: string;
  item_name: string;
  qty: string;
  rate: string;
  warehouse: string;
}

interface Taxonomy {
  categories: string[];
  taxonomy: Record<string, { form_factors: string[]; capacities: string[]; grades: string[] }>;
}

let _id = 1;

export default function OpeningStockPage() {
  const navigate = useNavigate();
  const componentsEnabled = useCompanyStore((s) => s.componentsEnabled);
  const company = useCompanyStore((s) => s.company);

  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [warehouses, setWarehouses] = useState<{ name: string }[]>([]);
  const [defaultWarehouse, setDefaultWarehouse] = useState('');
  const [lines, setLines] = useState<StockLine[]>([]);
  const [skuForm, setSkuForm] = useState({ category: '', form_factor: '', capacity: '', grade: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvingRow, setResolvingRow] = useState(false);

  useEffect(() => {
    catalogApi.getTaxonomy().then((res) => setTaxonomy(res.data.message as Taxonomy)).catch(() => {});
    inventoryApi.getWarehouses().then((res) => {
      const whs = res.data.message as { name: string }[];
      setWarehouses(whs || []);
      if (whs?.length) setDefaultWarehouse(whs[0].name);
    }).catch(() => {});
  }, [company]);

  const addLine = async () => {
    if (!skuForm.category || !skuForm.form_factor || !skuForm.capacity || !skuForm.grade) return;
    setResolvingRow(true);
    try {
      const res = await catalogApi.findOrCreateSku({ ...skuForm });
      const msg = res.data.message as { item_code: string };
      setLines((prev) => [
        ...prev,
        { id: _id++, item_code: msg.item_code, item_name: msg.item_code, qty: '', rate: '', warehouse: defaultWarehouse },
      ]);
      setSkuForm({ category: '', form_factor: '', capacity: '', grade: '' });
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Failed to resolve SKU.');
    } finally {
      setResolvingRow(false);
    }
  };

  const removeLine = (id: number) => setLines((prev) => prev.filter((l) => l.id !== id));

  const updateLine = (id: number, field: keyof StockLine, value: string) => {
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleSubmit = async () => {
    const validLines = lines.filter((l) => l.item_code && parseFloat(l.qty) > 0);
    if (!validLines.length) {
      setError('Add at least one line with item code and quantity > 0.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await catalogApi.importOpeningStock({
        items: validLines.map((l) => ({
          item_code: l.item_code,
          qty: parseFloat(l.qty),
          rate: parseFloat(l.rate) || 0,
          warehouse: l.warehouse || defaultWarehouse,
        })),
        warehouse: defaultWarehouse,
      });
      const msg = res.data.message as any;
      setSuccess(`Opening stock imported: ${msg.stock_entry} (${msg.items_imported} items)`);
      setLines([]);
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Import failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTaxonomy = taxonomy?.taxonomy[skuForm.category];

  const grandTotal = lines.reduce((acc, l) => acc + (parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0), 0);

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
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            <Upload className="w-6 h-6 text-brand-600" aria-hidden="true" />
            Opening Stock Import
          </span>
        }
        description="Creates a single Material Receipt Stock Entry from your hand-written notebook. Run once when you first enable Components."
      />

      {success ? <AlertBanner tone="success" onDismiss={() => setSuccess(null)}>{success}</AlertBanner> : null}
      {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

      {/* SKU picker to add lines */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Add Item</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(['category', 'form_factor', 'capacity', 'grade'] as const).map((field) => {
            const opts = field === 'category' ? taxonomy?.categories || []
              : field === 'form_factor' ? selectedTaxonomy?.form_factors || []
              : field === 'capacity' ? selectedTaxonomy?.capacities || []
              : selectedTaxonomy?.grades || [];
            const lbl = { category: 'Category', form_factor: 'Form Factor', capacity: 'Capacity', grade: 'Grade' }[field];
            return (
              <select key={field} value={skuForm[field]} onChange={(e) => setSkuForm((f) => ({ ...f, [field]: e.target.value }))} className="input-field text-sm">
                <option value="">{lbl}…</option>
                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            );
          })}
        </div>
        <div className="flex justify-end">
          <button
            onClick={addLine}
            disabled={resolvingRow || !skuForm.category || !skuForm.form_factor || !skuForm.capacity || !skuForm.grade}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-2 disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            {resolvingRow ? 'Resolving…' : 'Add Line'}
          </button>
        </div>
      </div>

      {/* Lines table */}
      {lines.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item Code</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Warehouse</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">{l.item_code}</td>
                    <td className="px-4 py-2">
                      <input type="number" value={l.qty} onChange={(e) => updateLine(l.id, 'qty', e.target.value)} className="input-field text-sm text-center w-20" min={0} placeholder="0" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" value={l.rate} onChange={(e) => updateLine(l.id, 'rate', e.target.value)} className="input-field text-sm text-center w-24" min={0} placeholder="0" />
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-800 dark:text-gray-200">
                      {fmtAmt((parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0))}
                    </td>
                    <td className="px-4 py-2">
                      <select value={l.warehouse} onChange={(e) => updateLine(l.id, 'warehouse', e.target.value)} className="input-field text-xs">
                        {warehouses.map((w) => <option key={w.name} value={w.name}>{w.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => removeLine(l.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Total Value: <strong className="text-gray-900 dark:text-gray-100">{fmtAmt(grandTotal)}</strong></span>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary text-sm px-6 py-2 flex items-center gap-2 disabled:opacity-60"
            >
              <Package className="w-4 h-4" />
              {submitting ? 'Importing…' : 'Import Opening Stock'}
            </button>
          </div>
        </div>
      )}

      {lines.length === 0 && !success && (
        <EmptyState
          title="Add items above to begin import"
          icon={<Package className="h-8 w-8" aria-hidden="true" />}
        />
      )}
    </div>
  );
}

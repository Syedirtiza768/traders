import { useEffect, useState } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { catalogApi } from '../lib/api';

export type ComponentLine = {
  id: number;
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
};

type Taxonomy = {
  categories: string[];
  taxonomy: Record<string, { form_factors: string[]; capacities: string[]; grades: string[] }>;
};

let _lineId = 1;

type Props = {
  lines: ComponentLine[];
  onChange: (lines: ComponentLine[]) => void;
};

export default function ComponentLineEntry({ lines, onChange }: Props) {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [quickText, setQuickText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [skuForm, setSkuForm] = useState({
    category: '',
    form_factor: '',
    capacity: '',
    grade: '',
    qty: '1',
    rate: '',
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    catalogApi.getTaxonomy().then((res) => {
      setTaxonomy(res.data.message as Taxonomy);
    }).catch(() => {});
  }, []);

  const selectedTaxonomy = taxonomy?.taxonomy[skuForm.category];

  const addLine = (item_code: string, item_name: string, qty: number, rate: number) => {
    onChange([
      ...lines,
      { id: _lineId++, item_code, item_name, qty, rate },
    ]);
  };

  const handleParse = async () => {
    if (!quickText.trim()) return;
    setParsing(true);
    setParseError(null);
    try {
      const res = await catalogApi.parseQuickEntry(quickText);
      const parsed = res.data.message as any;
      const qty = Number(parsed.qty);
      const rate = Number(parsed.rate);
      if (!parsed.resolved_item?.item_code) {
        setParseError(
          parsed.warnings?.join(' ') || 'Could not resolve item — pick form factor and use Add Line.',
        );
        if (parsed.category) {
          setSkuForm((f) => ({
            ...f,
            category: parsed.category || f.category,
            capacity: parsed.capacity || f.capacity,
            grade: parsed.grade || f.grade,
            qty: qty > 0 ? String(qty) : f.qty,
            rate: rate > 0 ? String(rate) : f.rate,
          }));
        }
        return;
      }
      if (!qty || qty <= 0) {
        setParseError('Quantity is required.');
        return;
      }
      addLine(
        parsed.resolved_item.item_code,
        parsed.resolved_item.item_name || parsed.resolved_item.item_code,
        qty,
        rate || 0,
      );
      setQuickText('');
    } catch (err: any) {
      setParseError(err?.response?.data?.exception || 'Parse failed.');
    } finally {
      setParsing(false);
    }
  };

  const handleAddFromForm = async () => {
    if (!skuForm.category || !skuForm.form_factor || !skuForm.capacity || !skuForm.grade) return;
    const qty = parseFloat(skuForm.qty);
    const rate = parseFloat(skuForm.rate) || 0;
    if (!qty || qty <= 0) return;
    setAdding(true);
    setParseError(null);
    try {
      const res = await catalogApi.findOrCreateSku({
        category: skuForm.category,
        form_factor: skuForm.form_factor,
        capacity: skuForm.capacity,
        grade: skuForm.grade,
        standard_rate: rate,
      });
      const msg = res.data.message as { item_code: string };
      addLine(msg.item_code, msg.item_code, qty, rate);
      setSkuForm({
        category: skuForm.category,
        form_factor: '',
        capacity: '',
        grade: '',
        qty: '1',
        rate: '',
      });
    } catch (err: any) {
      setParseError(err?.response?.data?.exception || 'Failed to resolve SKU.');
    } finally {
      setAdding(false);
    }
  };

  const removeLine = (id: number) => onChange(lines.filter((l) => l.id !== id));

  const lineTotal = lines.reduce((sum, l) => sum + l.qty * l.rate, 0);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-slate-300">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          Quick entry — e.g. &quot;1tb pulled 5 300&quot;
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleParse()}
            className="input-field flex-1 text-sm font-mono"
            placeholder="capacity grade qty rate"
          />
          <button
            type="button"
            onClick={() => void handleParse()}
            disabled={parsing}
            className="btn-primary text-sm px-3 py-2 disabled:opacity-60"
          >
            {parsing ? '…' : 'Add'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={skuForm.category}
          onChange={(e) => setSkuForm({ category: e.target.value, form_factor: '', capacity: '', grade: '', qty: skuForm.qty, rate: skuForm.rate })}
          className="input-field text-sm col-span-2"
        >
          <option value="">Category</option>
          {taxonomy?.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={skuForm.form_factor} onChange={(e) => setSkuForm((f) => ({ ...f, form_factor: e.target.value }))} className="input-field text-sm">
          <option value="">Form factor</option>
          {selectedTaxonomy?.form_factors.map((ff) => <option key={ff} value={ff}>{ff}</option>)}
        </select>
        <select value={skuForm.capacity} onChange={(e) => setSkuForm((f) => ({ ...f, capacity: e.target.value }))} className="input-field text-sm">
          <option value="">Capacity</option>
          {selectedTaxonomy?.capacities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={skuForm.grade} onChange={(e) => setSkuForm((f) => ({ ...f, grade: e.target.value }))} className="input-field text-sm">
          <option value="">Grade</option>
          {selectedTaxonomy?.grades.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <input type="number" min={0} step="1" value={skuForm.qty} onChange={(e) => setSkuForm((f) => ({ ...f, qty: e.target.value }))} className="input-field text-sm" placeholder="Qty" />
        <input type="number" min={0} step="0.01" value={skuForm.rate} onChange={(e) => setSkuForm((f) => ({ ...f, rate: e.target.value }))} className="input-field text-sm" placeholder="Rate" />
        <button
          type="button"
          onClick={() => void handleAddFromForm()}
          disabled={adding}
          className="col-span-2 btn-secondary text-sm py-2 flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add line from picker
        </button>
      </div>

      {parseError && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{parseError}</p>
      )}

      {lines.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-2 py-1.5 text-left text-gray-500">Item</th>
                <th className="px-2 py-1.5 text-right text-gray-500">Qty</th>
                <th className="px-2 py-1.5 text-right text-gray-500">Rate</th>
                <th className="px-2 py-1.5 text-right text-gray-500">Amt</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-2 py-1.5 font-mono text-brand-600">{line.item_code}</td>
                  <td className="px-2 py-1.5 text-right">{line.qty}</td>
                  <td className="px-2 py-1.5 text-right">{line.rate.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right font-medium">{(line.qty * line.rate).toFixed(2)}</td>
                  <td className="px-1">
                    <button type="button" onClick={() => removeLine(line.id)} className="p-1 text-gray-400 hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-2 py-1.5 text-right text-xs font-semibold text-gray-700 dark:text-slate-200 border-t border-gray-100 dark:border-slate-700">
            Total: {lineTotal.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}

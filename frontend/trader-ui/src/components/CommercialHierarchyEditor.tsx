import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { opportunityApi } from '../lib/api';
import { extractFrappeError, formatCurrency } from '../lib/utils';
import { useCompanyStore } from '../stores/companyStore';

export type CommercialItem = {
  item_code: string;
  description?: string;
  unit_qty: number;
  unit_price: number;
  discount_percent?: number;
  amount?: number;
  qty_invoiced?: number;
};

export type CommercialOption = {
  line_no: number;
  client_requirements?: string;
  option_no: number;
  option_text?: string;
  package_qty: number;
  stock_status?: string;
  package_price?: number;
  qty_invoiced?: number;
  items: CommercialItem[];
};

type Props = {
  doctype: 'Quotation' | 'Sales Order' | 'Delivery Note' | 'Sales Invoice';
  name: string;
  initialOptions?: CommercialOption[] | null;
  readOnly?: boolean;
  currency?: string;
  onSaved?: () => void;
};

function emptyItem(): CommercialItem {
  return { item_code: '', unit_qty: 1, unit_price: 0, discount_percent: 0 };
}

function emptyOption(lineNo = 1, optionNo = 1): CommercialOption {
  return {
    line_no: lineNo,
    client_requirements: '',
    option_no: optionNo,
    option_text: '',
    package_qty: 1,
    items: [emptyItem()],
  };
}

function normalizeOptions(raw: unknown): CommercialOption[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((row: any, idx: number) => ({
    line_no: Number(row.line_no) || idx + 1,
    client_requirements: row.client_requirements || '',
    option_no: Number(row.option_no) || 1,
    option_text: row.option_text || '',
    package_qty: Number(row.package_qty) || 1,
    stock_status: row.stock_status || '',
    package_price: Number(row.package_price) || 0,
    qty_invoiced: Number(row.qty_invoiced) || 0,
    items: Array.isArray(row.items) && row.items.length
      ? row.items.map((it: any) => ({
          item_code: it.item_code || '',
          description: it.description || '',
          unit_qty: Number(it.unit_qty) || 1,
          unit_price: Number(it.unit_price ?? it.rate) || 0,
          discount_percent: Number(it.discount_percent) || 0,
          qty_invoiced: Number(it.qty_invoiced) || 0,
        }))
      : [emptyItem()],
  }));
}

function itemAmount(it: CommercialItem, packageQty: number) {
  const qty = (Number(it.unit_qty) || 0) * (Number(packageQty) || 1);
  const rate = Number(it.unit_price) || 0;
  const discount = Number(it.discount_percent) || 0;
  return qty * rate * (1 - discount / 100);
}

export default function CommercialHierarchyEditor({
  doctype,
  name,
  initialOptions,
  readOnly = false,
  currency,
  onSaved,
}: Props) {
  const opportunityEnabled = useCompanyStore((s) => s.opportunityEnabled);
  const [options, setOptions] = useState<CommercialOption[]>(() => normalizeOptions(initialOptions));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setOptions(normalizeOptions(initialOptions));
  }, [initialOptions]);

  const hasData = options.length > 0;
  const show = opportunityEnabled || hasData || Boolean(initialOptions?.length);

  const total = useMemo(
    () =>
      options.reduce(
        (sum, opt) => sum + opt.items.reduce((s, it) => s + itemAmount(it, opt.package_qty), 0),
        0,
      ),
    [options],
  );

  if (!show) return null;

  const updateOption = (index: number, patch: Partial<CommercialOption>) => {
    setOptions((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const updateItem = (optIndex: number, itemIndex: number, patch: Partial<CommercialItem>) => {
    setOptions((prev) =>
      prev.map((row, i) => {
        if (i !== optIndex) return row;
        const items = row.items.map((it, j) => (j === itemIndex ? { ...it, ...patch } : it));
        return { ...row, items };
      }),
    );
  };

  const addOption = () => {
    const nextLine = options.reduce((m, o) => Math.max(m, o.line_no), 0) + 1;
    setOptions((prev) => [...prev, emptyOption(nextLine, 1)]);
  };

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = (optIndex: number) => {
    setOptions((prev) =>
      prev.map((row, i) => (i === optIndex ? { ...row, items: [...row.items, emptyItem()] } : row)),
    );
  };

  const removeItem = (optIndex: number, itemIndex: number) => {
    setOptions((prev) =>
      prev.map((row, i) => {
        if (i !== optIndex) return row;
        const items = row.items.filter((_, j) => j !== itemIndex);
        return { ...row, items: items.length ? items : [emptyItem()] };
      }),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload = options.map((opt) => ({
        ...opt,
        items: opt.items.filter((it) => it.item_code.trim()),
      }));
      await opportunityApi.saveCommercialOptions(doctype, name, payload);
      setFeedback({ type: 'success', message: 'Commercial hierarchy saved. Flat items synced.' });
      onSaved?.();
    } catch (err) {
      setFeedback({ type: 'error', message: extractFrappeError(err, 'Could not save hierarchy.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Commercial Hierarchy</h2>
          <p className="text-sm text-gray-500">
            Line → Option → Item. Effective qty = unit qty × package qty.
          </p>
        </div>
        <div className="text-sm font-medium text-gray-800">
          Hierarchy total: {formatCurrency(total, currency)}
        </div>
      </div>

      <div className="card-body space-y-4">
        {feedback ? (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              feedback.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        {options.length === 0 ? (
          <p className="text-sm text-gray-400">No commercial options yet.</p>
        ) : (
          options.map((opt, optIndex) => (
            <div key={`opt-${optIndex}`} className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">
                  Line {opt.line_no} · Option {opt.option_no}
                </p>
                {!readOnly ? (
                  <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => removeOption(optIndex)}>
                    Remove option
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <label className="block space-y-1">
                  <span className="text-xs text-gray-500">Line no</span>
                  <input
                    className="input-field"
                    type="number"
                    disabled={readOnly}
                    value={opt.line_no}
                    onChange={(e) => updateOption(optIndex, { line_no: Number(e.target.value) || 1 })}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-gray-500">Option no</span>
                  <input
                    className="input-field"
                    type="number"
                    disabled={readOnly}
                    value={opt.option_no}
                    onChange={(e) => updateOption(optIndex, { option_no: Number(e.target.value) || 1 })}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-gray-500">Package qty</span>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={readOnly}
                    value={opt.package_qty}
                    onChange={(e) => updateOption(optIndex, { package_qty: Number(e.target.value) || 0 })}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-gray-500">Invoiced packages</span>
                  <input className="input-field" disabled value={opt.qty_invoiced || 0} readOnly />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs text-gray-500">Client requirements</span>
                <textarea
                  className="input-field min-h-[56px]"
                  disabled={readOnly}
                  value={opt.client_requirements || ''}
                  onChange={(e) => updateOption(optIndex, { client_requirements: e.target.value })}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-gray-500">Option text</span>
                <input
                  className="input-field"
                  disabled={readOnly}
                  value={opt.option_text || ''}
                  onChange={(e) => updateOption(optIndex, { option_text: e.target.value })}
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Items</p>
                  {!readOnly ? (
                    <button type="button" className="inline-flex items-center gap-1 text-xs text-brand-700" onClick={() => addItem(optIndex)}>
                      <Plus className="h-3.5 w-3.5" /> Add item
                    </button>
                  ) : null}
                </div>

                {opt.items.map((it, itemIndex) => {
                  const effQty = (Number(it.unit_qty) || 0) * (Number(opt.package_qty) || 1);
                  const amt = itemAmount(it, opt.package_qty);
                  return (
                    <div key={`it-${optIndex}-${itemIndex}`} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-white p-3 md:grid-cols-12">
                      <label className="md:col-span-3 block space-y-1">
                        <span className="text-xs text-gray-500">Item code</span>
                        <input
                          className="input-field"
                          disabled={readOnly}
                          value={it.item_code}
                          onChange={(e) => updateItem(optIndex, itemIndex, { item_code: e.target.value })}
                        />
                      </label>
                      <label className="md:col-span-2 block space-y-1">
                        <span className="text-xs text-gray-500">Unit qty</span>
                        <input
                          className="input-field"
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={readOnly}
                          value={it.unit_qty}
                          onChange={(e) => updateItem(optIndex, itemIndex, { unit_qty: Number(e.target.value) || 0 })}
                        />
                      </label>
                      <label className="md:col-span-2 block space-y-1">
                        <span className="text-xs text-gray-500">Unit price</span>
                        <input
                          className="input-field"
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={readOnly}
                          value={it.unit_price}
                          onChange={(e) => updateItem(optIndex, itemIndex, { unit_price: Number(e.target.value) || 0 })}
                        />
                      </label>
                      <label className="md:col-span-2 block space-y-1">
                        <span className="text-xs text-gray-500">Discount %</span>
                        <input
                          className="input-field"
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={readOnly}
                          value={it.discount_percent || 0}
                          onChange={(e) => updateItem(optIndex, itemIndex, { discount_percent: Number(e.target.value) || 0 })}
                        />
                      </label>
                      <div className="md:col-span-2 flex items-end justify-between gap-2">
                        <div>
                          <p className="text-xs text-gray-500">Eff. qty / amt</p>
                          <p className="text-sm font-medium text-gray-900">
                            {effQty} · {formatCurrency(amt, currency)}
                          </p>
                        </div>
                        {!readOnly ? (
                          <button
                            type="button"
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            onClick={() => removeItem(optIndex, itemIndex)}
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                      <label className="md:col-span-12 block space-y-1">
                        <span className="text-xs text-gray-500">Description</span>
                        <input
                          className="input-field"
                          disabled={readOnly}
                          value={it.description || ''}
                          onChange={(e) => updateItem(optIndex, itemIndex, { description: e.target.value })}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={addOption}>
              <Plus className="h-4 w-4" /> Add option
            </button>
            <button type="button" className="btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save hierarchy'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

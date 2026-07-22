import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { inventoryApi, opportunityApi } from '../lib/api';
import { extractFrappeError, formatCurrency } from '../lib/utils';
import { useCompanyStore } from '../stores/companyStore';
import SearchableSelect from './SearchableSelect';

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

export type HierarchyItemTarget = { optIndex: number; itemIndex: number };

export type CreatedHierarchyItem = {
  item_code: string;
  description?: string;
  unit_price?: number;
};

type ItemOption = {
  item_code?: string;
  name?: string;
  item_name?: string;
  description?: string;
  brand?: string;
  selling_price?: number;
  standard_rate?: number;
};

type Props = {
  doctype?: 'Quotation' | 'Sales Order' | 'Delivery Note' | 'Sales Invoice';
  name?: string;
  initialOptions?: CommercialOption[] | null;
  value?: CommercialOption[];
  onChange?: (options: CommercialOption[]) => void;
  draft?: boolean;
  readOnly?: boolean;
  currency?: string;
  warehouse?: string;
  itemOptions?: ItemOption[];
  onQuickAddItem?: (ctx: { prefill?: string; optIndex: number; itemIndex: number }) => void;
  createdItem?: CreatedHierarchyItem | null;
  onCreatedItemApplied?: () => void;
  onSaved?: () => void;
};

const STOCK_STATUS_PRESETS = [
  'Ex-Stock (Subject to Prior Sale)',
  'Indent Basis',
  'Will Quote Later',
  'Regret',
  'As Per Schedule',
];

function emptyItem(): CommercialItem {
  return { item_code: '', description: '', unit_qty: 1, unit_price: 0, discount_percent: 0 };
}

function emptyOption(lineNo = 1, optionNo = 1): CommercialOption {
  return {
    line_no: lineNo,
    client_requirements: '',
    option_no: optionNo,
    option_text: '',
    package_qty: 1,
    stock_status: 'Ex-Stock (Subject to Prior Sale)',
    items: [emptyItem()],
  };
}

function cloneOption(opt: CommercialOption, lineNo: number, optionNo: number): CommercialOption {
  return {
    ...opt,
    line_no: lineNo,
    option_no: optionNo,
    qty_invoiced: 0,
    items: opt.items.map((it) => ({ ...it, qty_invoiced: 0 })),
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

function itemLabel(row: ItemOption) {
  const code = row.item_code || row.name || '';
  const name = row.item_name || '';
  if (name && name !== code) return `${code} — ${name}`;
  return code;
}

function resolveItemMeta(itemOptions: ItemOption[] | undefined, code: string) {
  const selected = (itemOptions || []).find((row) => (row.item_code || row.name) === code);
  return {
    description: selected?.description || selected?.item_name || '',
    unit_price: selected?.selling_price ?? selected?.standard_rate ?? undefined,
    brand: selected?.brand || '',
  };
}

function brandFromItem(it: CommercialItem, itemOptions?: ItemOption[]) {
  const meta = resolveItemMeta(itemOptions, it.item_code);
  if (meta.brand) return meta.brand;
  const desc = it.description || '';
  const makeMatch = desc.match(/Make:\s*([^\n(]+)/i);
  if (makeMatch?.[1]) return makeMatch[1].trim();
  return '';
}

function descriptionFromItems(opt: CommercialOption) {
  return opt.items
    .filter((it) => it.item_code || it.description)
    .map((it) => {
      const parts = [it.description || it.item_code || ''];
      if (it.item_code && it.description && !it.description.includes(it.item_code)) {
        parts.unshift(it.item_code);
      }
      return parts.filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

export default function CommercialHierarchyEditor({
  doctype = 'Quotation',
  name = '',
  initialOptions,
  value,
  onChange,
  draft = false,
  readOnly = false,
  currency,
  warehouse,
  itemOptions,
  onQuickAddItem,
  createdItem,
  onCreatedItemApplied,
  onSaved,
}: Props) {
  const opportunityEnabled = useCompanyStore((s) => s.opportunityEnabled);
  const controlled = draft || typeof onChange === 'function';
  const [options, setOptionsInternal] = useState<CommercialOption[]>(() =>
    normalizeOptions(value ?? initialOptions),
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [qoh, setQoh] = useState<Record<string, number>>({});
  const [groupDiscountBrand, setGroupDiscountBrand] = useState('');
  const [groupDiscountPct, setGroupDiscountPct] = useState(0);
  const pendingTarget = useRef<HierarchyItemTarget | null>(null);

  const setOptions = (next: CommercialOption[] | ((prev: CommercialOption[]) => CommercialOption[])) => {
    setOptionsInternal((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      if (controlled) onChange?.(resolved);
      return resolved;
    });
  };

  useEffect(() => {
    if (controlled && value) {
      setOptionsInternal(normalizeOptions(value));
      return;
    }
    if (!controlled) {
      setOptionsInternal(normalizeOptions(initialOptions));
    }
  }, [initialOptions, value, controlled]);

  useEffect(() => {
    if (!itemOptions?.length || readOnly) return;
    setOptionsInternal((prev) => {
      let changed = false;
      const next = prev.map((opt) => ({
        ...opt,
        items: opt.items.map((it) => {
          if (!it.item_code || (it.description || '').trim()) return it;
          const meta = resolveItemMeta(itemOptions, it.item_code);
          if (!meta.description) return it;
          changed = true;
          return {
            ...it,
            description: meta.description,
            unit_price: it.unit_price || meta.unit_price || 0,
          };
        }),
      }));
      if (changed && controlled) onChange?.(next);
      return changed ? next : prev;
    });
  }, [itemOptions, readOnly, controlled, onChange]);

  useEffect(() => {
    if (!createdItem?.item_code || !pendingTarget.current) return;
    const { optIndex, itemIndex } = pendingTarget.current;
    pendingTarget.current = null;
    setOptions((prev) =>
      prev.map((row, i) => {
        if (i !== optIndex) return row;
        return {
          ...row,
          items: row.items.map((it, j) =>
            j === itemIndex
              ? {
                  ...it,
                  item_code: createdItem.item_code,
                  description: createdItem.description || it.description || '',
                  unit_price:
                    createdItem.unit_price != null && createdItem.unit_price > 0
                      ? createdItem.unit_price
                      : it.unit_price,
                }
              : it,
          ),
        };
      }),
    );
    onCreatedItemApplied?.();
  }, [createdItem, onCreatedItemApplied]);

  const itemCodesKey = useMemo(() => {
    const codes = new Set<string>();
    for (const opt of options) {
      for (const it of opt.items) {
        if (it.item_code) codes.add(it.item_code);
      }
    }
    return Array.from(codes).sort().join('|');
  }, [options]);

  useEffect(() => {
    if (!warehouse || !itemCodesKey) {
      setQoh({});
      return;
    }
    const codes = itemCodesKey.split('|').filter(Boolean);
    let cancelled = false;
    void (async () => {
      try {
        const res = await inventoryApi.getItemsQoh(codes, warehouse);
        if (!cancelled) setQoh(res.data.message?.items || {});
      } catch {
        if (!cancelled) setQoh({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [warehouse, itemCodesKey]);

  const selectOptions = useMemo(
    () =>
      (itemOptions || []).map((row) => {
        const code = row.item_code || row.name || '';
        return { value: code, label: itemLabel(row) };
      }),
    [itemOptions],
  );

  const brands = useMemo(() => {
    const set = new Set<string>();
    for (const opt of options) {
      for (const it of opt.items) {
        const b = brandFromItem(it, itemOptions);
        if (b) set.add(b);
      }
    }
    return Array.from(set).sort();
  }, [options, itemOptions]);

  const hasData = options.length > 0;
  const show = opportunityEnabled || hasData || Boolean(initialOptions?.length) || draft || controlled;

  const total = useMemo(
    () =>
      options.reduce(
        (sum, opt) => sum + opt.items.reduce((s, it) => s + itemAmount(it, opt.package_qty), 0),
        0,
      ),
    [options],
  );

  const billedTotal = useMemo(() => {
    const firstByLine = new Map<number, CommercialOption>();
    for (const opt of options) {
      const cur = firstByLine.get(opt.line_no);
      if (!cur || opt.option_no < cur.option_no) firstByLine.set(opt.line_no, opt);
    }
    return Array.from(firstByLine.values()).reduce(
      (sum, opt) => sum + opt.items.reduce((s, it) => s + itemAmount(it, opt.package_qty), 0),
      0,
    );
  }, [options]);

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

  const selectItemCode = (optIndex: number, itemIndex: number, code: string) => {
    const meta = resolveItemMeta(itemOptions, code);
    updateItem(optIndex, itemIndex, {
      item_code: code,
      ...(meta.description ? { description: meta.description } : {}),
      ...(meta.unit_price != null ? { unit_price: meta.unit_price } : {}),
    });
  };

  const openQuickAdd = (optIndex: number, itemIndex: number, prefill = '') => {
    pendingTarget.current = { optIndex, itemIndex };
    onQuickAddItem?.({ prefill, optIndex, itemIndex });
  };

  const addLine = () => {
    const nextLine = options.reduce((m, o) => Math.max(m, o.line_no), 0) + 1;
    setOptions((prev) => [...prev, emptyOption(nextLine, 1)]);
  };

  const addAlternateOption = (optIndex: number) => {
    const source = options[optIndex];
    if (!source) return;
    const nextOptNo =
      options.filter((o) => o.line_no === source.line_no).reduce((m, o) => Math.max(m, o.option_no), 0) + 1;
    setOptions((prev) => {
      const next = [...prev];
      next.splice(optIndex + 1, 0, emptyOption(source.line_no, nextOptNo));
      return next;
    });
  };

  const copyOption = (optIndex: number) => {
    const source = options[optIndex];
    if (!source) return;
    const nextOptNo =
      options.filter((o) => o.line_no === source.line_no).reduce((m, o) => Math.max(m, o.option_no), 0) + 1;
    setOptions((prev) => {
      const next = [...prev];
      next.splice(optIndex + 1, 0, cloneOption(source, source.line_no, nextOptNo));
      return next;
    });
  };

  const copyLine = (optIndex: number) => {
    const source = options[optIndex];
    if (!source) return;
    const nextLine = options.reduce((m, o) => Math.max(m, o.line_no), 0) + 1;
    const lineOpts = options.filter((o) => o.line_no === source.line_no);
    setOptions((prev) => [
      ...prev,
      ...lineOpts.map((o) => cloneOption(o, nextLine, o.option_no)),
    ]);
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

  const copyItemsToOptionText = (optIndex: number) => {
    const opt = options[optIndex];
    if (!opt) return;
    updateOption(optIndex, {
      option_text: descriptionFromItems(opt) || opt.option_text || '',
      client_requirements: opt.client_requirements || descriptionFromItems(opt),
    });
  };

  const applyGroupDiscount = () => {
    if (!groupDiscountBrand || !groupDiscountPct) return;
    setOptions((prev) =>
      prev.map((opt) => ({
        ...opt,
        items: opt.items.map((it) => {
          const brand = brandFromItem(it, itemOptions);
          if (brand !== groupDiscountBrand) return it;
          return { ...it, discount_percent: groupDiscountPct };
        }),
      })),
    );
    setFeedback({
      type: 'success',
      message: `Applied ${groupDiscountPct}% discount to ${groupDiscountBrand} items.`,
    });
  };

  const handleSave = async () => {
    if (draft || !name) return;
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
            Line → Option → Item. Add alternate options on the same line. Effective qty = unit × package.
            External total uses first option per line.
            {warehouse ? ` QOH from ${warehouse} (warn only).` : ''}
          </p>
        </div>
        <div className="text-sm font-medium text-gray-800 space-y-0.5 text-right">
          <div>All options: {formatCurrency(total, currency)}</div>
          <div className="text-green-700">Billed (1st options): {formatCurrency(billedTotal, currency)}</div>
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

        {!readOnly && brands.length > 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Group Discount</p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block space-y-1">
                <span className="text-xs text-gray-500">Brand</span>
                <select
                  className="input-field"
                  value={groupDiscountBrand}
                  onChange={(e) => setGroupDiscountBrand(e.target.value)}
                >
                  <option value="">Select brand</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-gray-500">Discount %</span>
                <input
                  className="input-field w-28"
                  type="number"
                  min="0"
                  step="0.01"
                  value={groupDiscountPct}
                  onChange={(e) => setGroupDiscountPct(Number(e.target.value) || 0)}
                />
              </label>
              <button type="button" className="btn-secondary" onClick={applyGroupDiscount}>
                Apply to brand
              </button>
            </div>
          </div>
        ) : null}

        {options.length === 0 ? (
          <p className="text-sm text-gray-400">No commercial options yet.</p>
        ) : (
          options.map((opt, optIndex) => {
            const isFirstOnLine =
              options
                .filter((o) => o.line_no === opt.line_no)
                .every((o) => o.option_no >= opt.option_no) ||
              Math.min(
                ...options.filter((o) => o.line_no === opt.line_no).map((o) => o.option_no),
              ) === opt.option_no;
            return (
              <div
                key={`opt-${optIndex}`}
                className={`rounded-xl border p-4 space-y-3 ${
                  isFirstOnLine ? 'border-gray-200 bg-gray-50/60' : 'border-amber-200 bg-amber-50/40'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    Line {opt.line_no} · Option {opt.option_no}
                    {!isFirstOnLine ? (
                      <span className="ml-2 text-xs font-medium text-amber-700">Alternate (not billed)</span>
                    ) : null}
                  </p>
                  {!readOnly ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-xs text-brand-700 hover:underline"
                        onClick={() => addAlternateOption(optIndex)}
                      >
                        Add option on line
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-gray-600 hover:underline"
                        onClick={() => copyOption(optIndex)}
                      >
                        <Copy className="h-3 w-3" /> Copy option
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-gray-600 hover:underline"
                        onClick={() => copyLine(optIndex)}
                      >
                        <Copy className="h-3 w-3" /> Copy line
                      </button>
                      <button
                        type="button"
                        className="text-xs text-gray-600 hover:underline"
                        onClick={() => copyItemsToOptionText(optIndex)}
                      >
                        Copy items → description
                      </button>
                      <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => removeOption(optIndex)}>
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
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
                  <label className="block space-y-1 lg:col-span-2">
                    <span className="text-xs text-gray-500">Stock status</span>
                    {readOnly ? (
                      <input className="input-field" disabled value={opt.stock_status || ''} readOnly />
                    ) : (
                      <input
                        className="input-field"
                        list={`stock-status-${optIndex}`}
                        value={opt.stock_status || ''}
                        onChange={(e) => updateOption(optIndex, { stock_status: e.target.value })}
                        placeholder="Ex-Stock…"
                      />
                    )}
                    <datalist id={`stock-status-${optIndex}`}>
                      {STOCK_STATUS_PRESETS.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
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
                  <span className="text-xs text-gray-500">Option description</span>
                  <textarea
                    className="input-field min-h-[72px] whitespace-pre-wrap"
                    disabled={readOnly}
                    value={opt.option_text || ''}
                    onChange={(e) => updateOption(optIndex, { option_text: e.target.value })}
                    placeholder="Commercial option text (Sahamid Description tab)"
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
                    const available = it.item_code ? Number(qoh[it.item_code] ?? 0) : 0;
                    const short = Boolean(warehouse && it.item_code && effQty > available);
                    return (
                      <div key={`it-${optIndex}-${itemIndex}`} className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                          <div className="md:col-span-5 space-y-1">
                            <span className="text-xs text-gray-500">Item</span>
                            {readOnly ? (
                              <input className="input-field" disabled value={it.item_code} readOnly />
                            ) : (
                              <SearchableSelect
                                value={it.item_code}
                                onChange={(code) => selectItemCode(optIndex, itemIndex, code)}
                                options={selectOptions}
                                placeholder="Search or create item"
                                creatable={Boolean(onQuickAddItem)}
                                onCreateNew={(query) => openQuickAdd(optIndex, itemIndex, query)}
                                emptyMessage="No items — create one on the spot"
                              />
                            )}
                            {warehouse && it.item_code ? (
                              <span className={`text-[11px] ${short ? 'text-amber-700' : 'text-gray-500'}`}>
                                QOH: {available}
                                {short ? ` — below needed ${effQty}` : ''}
                              </span>
                            ) : null}
                          </div>
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
                              onChange={(e) =>
                                updateItem(optIndex, itemIndex, { discount_percent: Number(e.target.value) || 0 })
                              }
                            />
                          </label>
                          <div className="md:col-span-1 flex items-end justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500">Amt</p>
                              <p className="text-sm font-medium text-gray-900 truncate">{formatCurrency(amt, currency)}</p>
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
                        </div>

                        <label className="block space-y-1">
                          <span className="text-xs text-gray-500">Description / specification</span>
                          <textarea
                            className="input-field min-h-[88px] whitespace-pre-wrap"
                            disabled={readOnly}
                            value={it.description || ''}
                            onChange={(e) => updateItem(optIndex, itemIndex, { description: e.target.value })}
                            placeholder="Full commercial text shown on the quotation (make, packing, delivery…)"
                          />
                        </label>
                        <p className="text-[11px] text-gray-500">Eff. qty = {effQty} (unit × package)</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={addLine}>
              <Plus className="h-4 w-4" /> Add line
            </button>
            {!draft && name ? (
              <button type="button" className="btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save hierarchy'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

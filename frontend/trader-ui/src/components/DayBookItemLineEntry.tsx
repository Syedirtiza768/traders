import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Zap, Package, Layers } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import BarcodeScanInput from './BarcodeScanInput';
import useQuickAdd from './useQuickAdd';
import QuickAddProvider from './QuickAddProvider';
import { catalogApi, inventoryApi } from '../lib/api';

export type DayBookLine = {
  id: number;
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  warehouse?: string;
  serial_no?: string;
  description?: string;
  has_serial_no?: boolean;
};

type Taxonomy = {
  categories: string[];
  taxonomy: Record<string, { form_factors: string[]; capacities: string[]; grades: string[] }>;
};

type ItemMode = 'inventory' | 'component';

let _lineId = 1;

type Props = {
  lines: DayBookLine[];
  onChange: (lines: DayBookLine[]) => void;
  entryType: 'sale' | 'purchase';
};

function mergeOptions(existing: string[], extra: string): string[] {
  const values = [...existing];
  const trimmed = extra.trim();
  if (trimmed && !values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
    values.push(trimmed);
  }
  return values.sort((a, b) => a.localeCompare(b));
}

export default function DayBookItemLineEntry({ lines, onChange, entryType }: Props) {
  const quickAdd = useQuickAdd();
  const quickAddLineId = useRef<number | null>(null);

  const [mode, setMode] = useState<ItemMode>('inventory');
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [defaultWarehouse, setDefaultWarehouse] = useState('');
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [scanValue, setScanValue] = useState('');

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
  const [extraDims, setExtraDims] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const load = async () => {
      setLoadingSetup(true);
      try {
        const [itemsRes, whRes, taxRes] = await Promise.all([
          inventoryApi.getItems({ page: 1, page_size: 100 }),
          inventoryApi.getWarehouses(),
          catalogApi.getTaxonomy(),
        ]);
        const whRows = whRes.data.message || [];
        setItems(itemsRes.data.message?.data || []);
        setWarehouses(Array.isArray(whRows) ? whRows : []);
        const defaultWh = (Array.isArray(whRows) && whRows[0]?.warehouse) || '';
        setDefaultWarehouse(defaultWh);
        setTaxonomy(taxRes.data.message as Taxonomy);
      } catch {
        // partial load ok
      } finally {
        setLoadingSetup(false);
      }
    };
    void load();
  }, []);

  const searchItems = useCallback(async (query: string) => {
    try {
      const res = await inventoryApi.getItems({ search: query, page: 1, page_size: 30 });
      const rows = res.data.message?.data || [];
      setItems((prev) => {
        const map = new Map<string, any>();
        [...prev, ...rows].forEach((row) => {
          const key = row.item_code || row.name;
          if (key) map.set(key, row);
        });
        return Array.from(map.values());
      });
      return rows.map((row: any) => ({
        label: `${row.item_name || row.item_code} (${row.item_code})`,
        value: row.item_code || row.name,
      }));
    } catch {
      return [];
    }
  }, []);

  const itemOptions = useMemo(
    () => items.map((row) => ({
      label: `${row.item_name || row.item_code} (${row.item_code || row.name})`,
      value: row.item_code || row.name,
    })),
    [items],
  );

  const warehouseOptions = useMemo(
    () => warehouses.map((w: any) => ({
      label: w.warehouse_name || w.warehouse || w.name,
      value: w.warehouse || w.name,
    })),
    [warehouses],
  );

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();
    const values: string[] = [];
    [...(taxonomy?.categories || []), ...(extraDims.__categories__ || [])].forEach((c) => {
      const key = c.trim();
      if (key && !seen.has(key.toLowerCase())) {
        seen.add(key.toLowerCase());
        values.push(key);
      }
    });
    return values.sort((a, b) => a.localeCompare(b)).map((c) => ({ label: c, value: c }));
  }, [taxonomy, extraDims]);

  const selectedTaxonomy = taxonomy?.taxonomy[skuForm.category];
  const formFactorOptions = useMemo(() => {
    const base = selectedTaxonomy?.form_factors || [];
    const extra = extraDims[`${skuForm.category}:form_factors`] || [];
    return mergeOptions(base, skuForm.form_factor).map((v) => ({ label: v, value: v }));
  }, [selectedTaxonomy, extraDims, skuForm.category, skuForm.form_factor]);

  const capacityOptions = useMemo(() => {
    const base = selectedTaxonomy?.capacities || [];
    const extra = extraDims[`${skuForm.category}:capacities`] || [];
    return mergeOptions(base, skuForm.capacity).map((v) => ({ label: v, value: v }));
  }, [selectedTaxonomy, extraDims, skuForm.category, skuForm.capacity]);

  const gradeOptions = useMemo(() => {
    const base = selectedTaxonomy?.grades || [];
    const extra = extraDims[`${skuForm.category}:grades`] || [];
    return mergeOptions(base, skuForm.grade).map((v) => ({ label: v, value: v }));
  }, [selectedTaxonomy, extraDims, skuForm.category, skuForm.grade]);

  const rememberDim = (category: string, dimension: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = dimension === 'category' ? '__categories__' : `${category}:${dimension}`;
    setExtraDims((prev) => ({
      ...prev,
      [key]: mergeOptions(prev[key] || [], trimmed),
    }));
  };

  const addLine = (patch: Omit<DayBookLine, 'id'>) => {
    onChange([
      ...lines,
      {
        id: _lineId++,
        warehouse: patch.warehouse || defaultWarehouse,
        serial_no: '',
        description: '',
        ...patch,
      },
    ]);
  };

  const updateLine = (id: number, patch: Partial<DayBookLine>) => {
    onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const removeLine = (id: number) => onChange(lines.filter((l) => l.id !== id));

  const handleInventoryItemPick = (lineId: number, itemCode: string) => {
    const selected = items.find((row) => (row.item_code || row.name) === itemCode);
    const price = entryType === 'sale'
      ? (selected?.selling_price ?? selected?.standard_rate)
      : (selected?.buying_price ?? selected?.standard_rate);
    updateLine(lineId, {
      item_code: itemCode,
      item_name: selected?.item_name || itemCode,
      rate: Number(price) || 0,
      has_serial_no: Boolean(selected?.has_serial_no),
      serial_no: '',
      warehouse: defaultWarehouse,
      description: selected?.item_name || '',
    });
  };

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const res = await inventoryApi.lookupByBarcode(barcode);
      const msg = res.data.message;
      if (!msg?.found || !msg.item) {
        setParseError(msg?.message || `No item for barcode ${barcode}`);
        return;
      }
      const item = msg.item;
      addLine({
        item_code: item.item_code,
        item_name: item.item_name || item.item_code,
        qty: 1,
        rate: Number(entryType === 'sale' ? item.selling_price : item.buying_price) || 0,
        warehouse: item.default_warehouse || defaultWarehouse,
        has_serial_no: Boolean(item.has_serial_no),
        description: item.item_name || '',
      });
      setParseError(null);
      setScanValue('');
    } catch (err: any) {
      setParseError(err?.response?.data?.exception || 'Barcode lookup failed.');
    }
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
          parsed.warnings?.join(' ') || 'Could not resolve item — complete the SKU picker.',
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
      addLine({
        item_code: parsed.resolved_item.item_code,
        item_name: parsed.resolved_item.item_name || parsed.resolved_item.item_code,
        qty,
        rate: rate || 0,
        warehouse: defaultWarehouse,
      });
      setQuickText('');
    } catch (err: any) {
      setParseError(err?.response?.data?.exception || 'Parse failed.');
    } finally {
      setParsing(false);
    }
  };

  const handleAddFromSkuForm = async () => {
    if (!skuForm.category || !skuForm.form_factor || !skuForm.capacity || !skuForm.grade) {
      setParseError('Category, form factor, capacity, and grade are required.');
      return;
    }
    const qty = parseFloat(skuForm.qty);
    const rate = parseFloat(skuForm.rate) || 0;
    if (!qty || qty <= 0) return;

    rememberDim('', 'category', skuForm.category);
    rememberDim(skuForm.category, 'form_factors', skuForm.form_factor);
    rememberDim(skuForm.category, 'capacities', skuForm.capacity);
    rememberDim(skuForm.category, 'grades', skuForm.grade);

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
      const msg = res.data.message as { item_code: string; item_name?: string };
      addLine({
        item_code: msg.item_code,
        item_name: msg.item_name || msg.item_code,
        qty,
        rate,
        warehouse: defaultWarehouse,
      });
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

  const lineTotal = lines.reduce((sum, l) => sum + l.qty * l.rate, 0);

  return (
    <>
      <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setMode('inventory')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md ${
            mode === 'inventory' ? 'bg-brand-600 text-white' : 'text-gray-600 dark:text-slate-300'
          }`}
        >
          <Package className="w-3.5 h-3.5" /> Inventory item
        </button>
        <button
          type="button"
          onClick={() => setMode('component')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md ${
            mode === 'component' ? 'bg-brand-600 text-white' : 'text-gray-600 dark:text-slate-300'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Component SKU
        </button>
      </div>

      {mode === 'inventory' ? (
        <div className="space-y-3">
          <BarcodeScanInput
            value={scanValue}
            onChange={setScanValue}
            onScan={(code) => void handleBarcodeScan(code)}
            disabled={loadingSetup}
          />
          <button
            type="button"
            onClick={() => {
              quickAddLineId.current = null;
              addLine({
                item_code: '',
                item_name: '',
                qty: 1,
                rate: 0,
                warehouse: defaultWarehouse,
              });
            }}
            className="btn-secondary w-full text-sm py-2 flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add inventory line
          </button>
        </div>
      ) : (
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
            <div className="col-span-2">
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">Category</span>
              <SearchableSelect
                value={skuForm.category}
                onChange={(v) => {
                  rememberDim('', 'category', v);
                  setSkuForm({ category: v, form_factor: '', capacity: '', grade: '', qty: skuForm.qty, rate: skuForm.rate });
                }}
                options={categoryOptions}
                placeholder="Search or create category"
                creatable
                onCreateNew={(v) => {
                  rememberDim('', 'category', v);
                  setSkuForm({ category: v, form_factor: '', capacity: '', grade: '', qty: skuForm.qty, rate: skuForm.rate });
                }}
              />
            </div>
            <div>
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">Form factor</span>
              <SearchableSelect
                value={skuForm.form_factor}
                onChange={(v) => {
                  rememberDim(skuForm.category, 'form_factors', v);
                  setSkuForm((f) => ({ ...f, form_factor: v }));
                }}
                options={formFactorOptions}
                placeholder="Form factor"
                creatable
                onCreateNew={(v) => {
                  rememberDim(skuForm.category, 'form_factors', v);
                  setSkuForm((f) => ({ ...f, form_factor: v }));
                }}
                disabled={!skuForm.category}
              />
            </div>
            <div>
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">Capacity</span>
              <SearchableSelect
                value={skuForm.capacity}
                onChange={(v) => {
                  rememberDim(skuForm.category, 'capacities', v);
                  setSkuForm((f) => ({ ...f, capacity: v }));
                }}
                options={capacityOptions}
                placeholder="Capacity"
                creatable
                onCreateNew={(v) => {
                  rememberDim(skuForm.category, 'capacities', v);
                  setSkuForm((f) => ({ ...f, capacity: v }));
                }}
                disabled={!skuForm.category}
              />
            </div>
            <div>
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">Grade</span>
              <SearchableSelect
                value={skuForm.grade}
                onChange={(v) => {
                  rememberDim(skuForm.category, 'grades', v);
                  setSkuForm((f) => ({ ...f, grade: v }));
                }}
                options={gradeOptions}
                placeholder="Grade"
                creatable
                onCreateNew={(v) => {
                  rememberDim(skuForm.category, 'grades', v);
                  setSkuForm((f) => ({ ...f, grade: v }));
                }}
                disabled={!skuForm.category}
              />
            </div>
            <input
              type="number"
              min={0}
              step="1"
              value={skuForm.qty}
              onChange={(e) => setSkuForm((f) => ({ ...f, qty: e.target.value }))}
              className="input-field text-sm"
              placeholder="Qty"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={skuForm.rate}
              onChange={(e) => setSkuForm((f) => ({ ...f, rate: e.target.value }))}
              className="input-field text-sm"
              placeholder="Rate"
            />
            <button
              type="button"
              onClick={() => void handleAddFromSkuForm()}
              disabled={adding}
              className="col-span-2 btn-secondary text-sm py-2 flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add line from SKU
            </button>
          </div>
        </div>
      )}

      {parseError && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{parseError}</p>
      )}

      {lines.length > 0 && (
        <div className="space-y-2">
          {lines.map((line) => (
            <div
              key={line.id}
              className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-2 text-xs"
            >
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">Item</span>
                  <SearchableSelect
                    value={line.item_code}
                    onChange={(v) => handleInventoryItemPick(line.id, v)}
                    options={itemOptions}
                    onSearch={searchItems}
                    placeholder="Search item code or name"
                    creatable
                    onCreateNew={(q) => {
                      quickAddLineId.current = line.id;
                      quickAdd.open('item', q);
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">Qty</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.qty}
                      onChange={(e) => updateLine(line.id, { qty: parseFloat(e.target.value) || 0 })}
                      className="input-field text-sm text-right"
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">Rate</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.rate}
                      onChange={(e) => updateLine(line.id, { rate: parseFloat(e.target.value) || 0 })}
                      className="input-field text-sm text-right"
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="p-2 text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {warehouseOptions.length > 0 && (
                  <div>
                    <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">Warehouse</span>
                    <SearchableSelect
                      value={line.warehouse || defaultWarehouse}
                      onChange={(v) => updateLine(line.id, { warehouse: v })}
                      options={warehouseOptions}
                      placeholder="Warehouse"
                    />
                  </div>
                )}
                {line.has_serial_no && (
                  <div>
                    <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">Serial no.</span>
                    <input
                      type="text"
                      value={line.serial_no || ''}
                      onChange={(e) => updateLine(line.id, { serial_no: e.target.value })}
                      className="input-field text-sm font-mono"
                      placeholder="Serial number"
                    />
                  </div>
                )}
              </div>
              <p className="text-right font-medium text-gray-700 dark:text-slate-200">
                Line total: {(line.qty * line.rate).toFixed(2)}
              </p>
            </div>
          ))}
          <div className="text-right text-xs font-semibold text-gray-700 dark:text-slate-200">
            Total: {lineTotal.toFixed(2)}
          </div>
        </div>
      )}

      <QuickAddProvider
        quickAdd={quickAdd}
        itemsSetter={setItems}
        itemValueSetter={(value) => {
          const lineId = quickAddLineId.current;
          if (lineId != null) {
            handleInventoryItemPick(lineId, value);
          } else {
            addLine({
              item_code: value,
              item_name: value,
              qty: 1,
              rate: 0,
              warehouse: defaultWarehouse,
            });
          }
          quickAddLineId.current = null;
        }}
      />
    </>
  );
}

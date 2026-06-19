import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Plus, Trash2, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import BarcodeScanInput from './BarcodeScanInput';
import useQuickAdd from './useQuickAdd';
import QuickAddProvider from './QuickAddProvider';
import { catalogApi, inventoryApi } from '../lib/api';
import { useCompanyStore } from '../stores/companyStore';
import { getEntryLineIssues } from '../lib/itemLineUtils';
import { formatCurrency } from '../lib/utils';

/** Normalised voucher line — always resolves to tabItem.item_code. */
export type ItemLineEntryLine = {
  id: number;
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  warehouse?: string;
  serial_no?: string;
  description?: string;
  has_serial_no?: boolean;
  stock_qty?: number | null;
  serial_error?: string | null;
};

type SkuTemplate = {
  id: string;
  label: string;
  resolver?: string;
  dimensions?: { key: string; label: string }[];
};

type LineConfig = {
  templates: Record<string, SkuTemplate>;
  item_group_templates: Record<string, string>;
  taxonomy: Record<string, { form_factors: string[]; capacities: string[]; grades: string[] }>;
  categories: string[];
  default_template?: string;
};

let _lineId = 1;

export type ItemLineEntryProps = {
  lines: ItemLineEntryLine[];
  onChange: (lines: ItemLineEntryLine[]) => void;
  priceContext?: 'sale' | 'purchase';
  showBarcode?: boolean;
  showSkuBuilder?: boolean;
  compact?: boolean;
  /** Full invoice grid with amount column, description, stock hints */
  invoiceLayout?: boolean;
  disabled?: boolean;
  defaultWarehouse?: string;
  minLines?: number;
  showDescription?: boolean;
  serialMode?: 'sale' | 'purchase' | 'none';
  showLineIssues?: boolean;
  renderLineExtra?: (line: ItemLineEntryLine, index: number) => ReactNode;
  onLineActivate?: (index: number) => void;
  hideLineTotal?: boolean;
};


export default function ItemLineEntry({
  lines,
  onChange,
  priceContext = 'sale',
  showBarcode = true,
  showSkuBuilder: showSkuBuilderProp,
  compact = false,
  invoiceLayout = false,
  disabled = false,
  defaultWarehouse: defaultWarehouseProp,
  minLines = 0,
  showDescription = false,
  serialMode = 'none',
  showLineIssues = false,
  renderLineExtra,
  onLineActivate,
  hideLineTotal = false,
}: ItemLineEntryProps) {
  const componentsEnabled = useCompanyStore((s) => s.componentsEnabled);
  const showSkuBuilder = showSkuBuilderProp ?? componentsEnabled;

  const quickAdd = useQuickAdd();
  const quickAddLineId = useRef<number | null>(null);

  const [skuOpen, setSkuOpen] = useState(false);
  const [lineConfig, setLineConfig] = useState<LineConfig | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState('components');
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [defaultWarehouse, setDefaultWarehouse] = useState(defaultWarehouseProp || '');
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [scanValue, setScanValue] = useState('');
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
    if (defaultWarehouseProp) setDefaultWarehouse(defaultWarehouseProp);
  }, [defaultWarehouseProp]);

  useEffect(() => {
    const load = async () => {
      setLoadingSetup(true);
      try {
        const [itemsRes, whRes, cfgRes] = await Promise.all([
          inventoryApi.getItems({ page: 1, page_size: 100 }),
          inventoryApi.getWarehouses(),
          showSkuBuilder ? catalogApi.getItemLineConfig() : Promise.resolve(null),
        ]);
        const whRows = whRes.data.message || [];
        setItems(itemsRes.data.message?.data || []);
        setWarehouses(Array.isArray(whRows) ? whRows : []);
        if (!defaultWarehouseProp) {
          setDefaultWarehouse((Array.isArray(whRows) && whRows[0]?.warehouse) || '');
        }
        if (cfgRes?.data?.message) {
          const cfg = cfgRes.data.message as LineConfig;
          setLineConfig(cfg);
          setActiveTemplateId(cfg.default_template === 'generic' ? 'components' : (cfg.default_template || 'components'));
        }
      } catch {
        // partial load ok
      } finally {
        setLoadingSetup(false);
      }
    };
    void load();
  }, [showSkuBuilder, defaultWarehouseProp]);

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

  const taxonomy = lineConfig?.taxonomy;
  const templateOptions = useMemo(() => {
    const tpl = lineConfig?.templates || {};
    return Object.values(tpl)
      .filter((t) => (t.dimensions?.length || 0) > 0 || t.id === 'components')
      .map((t) => ({ label: t.label || t.id, value: t.id }));
  }, [lineConfig]);

  const categoryOptions = useMemo(() => {
    return (lineConfig?.categories || [])
      .sort((a, b) => a.localeCompare(b))
      .map((c) => ({ label: c, value: c }));
  }, [lineConfig]);

  const templateForCategory = (category: string) => {
    const map = lineConfig?.item_group_templates || {};
    return map[category] || map['*'] || 'components';
  };

  const activeTemplate = lineConfig?.templates?.[activeTemplateId];
  const showStructuredSku = showSkuBuilder && (activeTemplate?.dimensions?.length || activeTemplateId === 'components');

  const selectedTaxonomy = taxonomy?.[skuForm.category];
  const formFactorOptions = useMemo(
    () => (selectedTaxonomy?.form_factors || []).map((v) => ({ label: v, value: v })),
    [selectedTaxonomy],
  );
  const capacityOptions = useMemo(
    () => (selectedTaxonomy?.capacities || []).map((v) => ({ label: v, value: v })),
    [selectedTaxonomy],
  );
  const gradeOptions = useMemo(
    () => (selectedTaxonomy?.grades || []).map((v) => ({ label: v, value: v })),
    [selectedTaxonomy],
  );

  const persistTaxonomyValues = async () => {
    if (!skuForm.category) return;
    try {
      await catalogApi.ensureTaxonomyValues({
        category: skuForm.category,
        form_factor: skuForm.form_factor || undefined,
        capacity: skuForm.capacity || undefined,
        grade: skuForm.grade || undefined,
      });
      const cfgRes = await catalogApi.getItemLineConfig();
      setLineConfig(cfgRes.data.message as LineConfig);
    } catch {
      // non-blocking
    }
  };

  const addLine = (patch: Omit<ItemLineEntryLine, 'id'>) => {
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

  const updateLine = (id: number, patch: Partial<ItemLineEntryLine>) => {
    onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const removeLine = (id: number) => {
    if (lines.length <= minLines) return;
    onChange(lines.filter((l) => l.id !== id));
  };

  const refreshLineStock = async (lineId: number, itemCode: string, warehouse: string) => {
    if (!itemCode || !warehouse) {
      updateLine(lineId, { stock_qty: null });
      return;
    }
    try {
      const res = await inventoryApi.getWarehouseItemQty(itemCode, warehouse);
      updateLine(lineId, { stock_qty: res.data.message?.qty ?? 0 });
    } catch {
      updateLine(lineId, { stock_qty: null });
    }
  };

  const validateSerial = async (lineId: number) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line?.item_code || !line.serial_no?.trim()) {
      updateLine(lineId, { serial_error: null });
      return true;
    }
    try {
      const res = serialMode === 'purchase'
        ? await inventoryApi.validateSerialForPurchase({
          item_code: line.item_code,
          serial_no: line.serial_no.trim(),
        })
        : await inventoryApi.validateSerialForItem({
          item_code: line.item_code,
          serial_no: line.serial_no.trim(),
          warehouse: line.warehouse || defaultWarehouse,
        });
      const result = res.data.message;
      if (!result?.valid) {
        updateLine(lineId, { serial_error: result?.message || 'Invalid serial number.' });
        return false;
      }
      updateLine(lineId, { serial_error: null });
      return true;
    } catch (err: any) {
      updateLine(lineId, { serial_error: err?.response?.data?.exception || 'Could not validate serial.' });
      return false;
    }
  };

  const priceForItem = (selected: any) => {
    if (priceContext === 'sale') {
      return Number(selected?.selling_price ?? selected?.standard_rate) || 0;
    }
    return Number(selected?.buying_price ?? selected?.standard_rate) || 0;
  };

  const handleItemPick = (lineId: number, itemCode: string, lineIndex?: number) => {
    const selected = items.find((row) => (row.item_code || row.name) === itemCode);
    const existing = lines.find((l) => l.id === lineId);
    const wh = existing?.warehouse || defaultWarehouse;
    updateLine(lineId, {
      item_code: itemCode,
      item_name: selected?.item_name || itemCode,
      rate: priceForItem(selected),
      has_serial_no: Boolean(selected?.has_serial_no),
      serial_no: '',
      serial_error: null,
      warehouse: wh,
      description: selected?.item_name || '',
    });
    if (lineIndex != null) onLineActivate?.(lineIndex);
    if (itemCode && wh) void refreshLineStock(lineId, itemCode, wh);
  };

  const resolveAndAddLine = async (payload: {
    template?: string;
    category?: string;
    form_factor?: string;
    capacity?: string;
    grade?: string;
    standard_rate?: number;
    qty: number;
    rate: number;
  }) => {
    const { qty, rate, ...resolvePayload } = payload;
    const res = await catalogApi.resolveItem(resolvePayload);
    const msg = res.data.message as { item_code: string; item_name?: string };
    addLine({
      item_code: msg.item_code,
      item_name: msg.item_name || msg.item_code,
      qty: payload.qty,
      rate: payload.rate,
      warehouse: defaultWarehouse,
    });
  };

  const handleBarcodeScan = async (barcode: string) => {
    setParseError(null);
    try {
      const res = await catalogApi.resolveItem({ barcode });
      const msg = res.data.message as any;
      const item = msg.item || msg;
      addLine({
        item_code: item.item_code || msg.item_code,
        item_name: item.item_name || msg.item_name || item.item_code,
        qty: 1,
        rate: priceContext === 'sale'
          ? Number(item.selling_price) || 0
          : Number(item.buying_price) || 0,
        warehouse: item.default_warehouse || defaultWarehouse,
        has_serial_no: Boolean(item.has_serial_no),
        description: item.item_name || '',
      });
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
        setParseError(parsed.warnings?.join(' ') || 'Complete structured attributes below.');
        setSkuOpen(true);
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
      setParseError('All attribute fields are required for structured SKU.');
      return;
    }
    const qty = parseFloat(skuForm.qty);
    const rate = parseFloat(skuForm.rate) || 0;
    if (!qty || qty <= 0) return;

    setAdding(true);
    setParseError(null);
    try {
      await resolveAndAddLine({
        template: activeTemplateId === 'components' ? 'components' : activeTemplateId,
        category: skuForm.category,
        form_factor: skuForm.form_factor,
        capacity: skuForm.capacity,
        grade: skuForm.grade,
        standard_rate: rate,
        qty,
        rate,
      });
      void persistTaxonomyValues();
      setSkuForm({
        category: skuForm.category,
        form_factor: '',
        capacity: '',
        grade: '',
        qty: '1',
        rate: '',
      });
    } catch (err: any) {
      setParseError(err?.response?.data?.exception || 'Failed to resolve item.');
    } finally {
      setAdding(false);
    }
  };

  const lineTotal = lines.reduce((sum, l) => sum + l.qty * l.rate, 0);

  return (
    <>
      <div className="space-y-3">
        {showBarcode && (
          <BarcodeScanInput
            value={scanValue}
            onChange={setScanValue}
            onScan={(code) => void handleBarcodeScan(code)}
            disabled={loadingSetup || disabled}
          />
        )}

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
          disabled={disabled}
          className="btn-secondary w-full text-sm py-2 flex items-center justify-center gap-1 disabled:opacity-60"
        >
          <Plus className="w-4 h-4" /> Add line — search any inventory item
        </button>

        {showStructuredSku && (
          <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setSkuOpen((o) => !o)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-slate-200 bg-gray-50 dark:bg-slate-900/40 hover:bg-gray-100 dark:hover:bg-slate-800/60"
            >
              {skuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Structured attributes — create SKU on the go
            </button>
            {skuOpen && (
              <div className="p-3 space-y-3 border-t border-gray-200 dark:border-slate-700">
                {templateOptions.length > 1 && (
                  <SearchableSelect
                    value={activeTemplateId}
                    onChange={setActiveTemplateId}
                    options={templateOptions}
                    placeholder="SKU template"
                  />
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickText}
                    onChange={(e) => setQuickText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void handleParse()}
                    className="input-field flex-1 text-sm font-mono"
                    placeholder="Quick: 1tb pulled 5 300"
                  />
                  <button
                    type="button"
                    onClick={() => void handleParse()}
                    disabled={parsing}
                    className="btn-primary text-sm px-3 py-2 disabled:opacity-60"
                  >
                    {parsing ? '…' : 'Parse'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">Category</span>
                    <SearchableSelect
                      value={skuForm.category}
                      onChange={(v) => {
                        setActiveTemplateId(templateForCategory(v));
                        setSkuForm({
                          category: v, form_factor: '', capacity: '', grade: '',
                          qty: skuForm.qty, rate: skuForm.rate,
                        });
                      }}
                      options={categoryOptions}
                      placeholder="Search or create category"
                      creatable
                      onCreateNew={(v) => {
                        setActiveTemplateId(templateForCategory(v));
                        setSkuForm({
                          category: v, form_factor: '', capacity: '', grade: '',
                          qty: skuForm.qty, rate: skuForm.rate,
                        });
                      }}
                    />
                  </div>
                  <SearchableSelect
                    value={skuForm.form_factor}
                    onChange={(v) => setSkuForm((f) => ({ ...f, form_factor: v }))}
                    options={formFactorOptions}
                    placeholder="Form factor"
                    creatable
                    onCreateNew={(v) => setSkuForm((f) => ({ ...f, form_factor: v }))}
                    disabled={!skuForm.category}
                  />
                  <SearchableSelect
                    value={skuForm.capacity}
                    onChange={(v) => setSkuForm((f) => ({ ...f, capacity: v }))}
                    options={capacityOptions}
                    placeholder="Capacity"
                    creatable
                    onCreateNew={(v) => setSkuForm((f) => ({ ...f, capacity: v }))}
                    disabled={!skuForm.category}
                  />
                  <SearchableSelect
                    value={skuForm.grade}
                    onChange={(v) => setSkuForm((f) => ({ ...f, grade: v }))}
                    options={gradeOptions}
                    placeholder="Grade / variant"
                    creatable
                    onCreateNew={(v) => setSkuForm((f) => ({ ...f, grade: v }))}
                    disabled={!skuForm.category}
                  />
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
                    <Plus className="w-4 h-4" /> Resolve &amp; add line
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Structured SKUs become normal inventory items. Search them above like any other product.
                </p>
              </div>
            )}
          </div>
        )}

        {parseError && (
          <p className="text-xs text-amber-600 dark:text-amber-400">{parseError}</p>
        )}
      </div>

      {lines.length > 0 && (
        <div className={`space-y-2 ${compact ? 'mt-2' : 'mt-3'}`}>
          {lines.map((line, index) => {
            const issues = showLineIssues ? getEntryLineIssues(line) : [];
            const lineBorder = issues.length > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 dark:border-slate-700';
            return (
              <div
                key={line.id}
                className={`rounded-lg border space-y-3 ${invoiceLayout ? 'p-4 hover:border-gray-300 transition-colors' : 'p-3'} ${lineBorder}`}
              >
                {invoiceLayout ? (
                  <>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                      <div>
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Item</span>
                        <SearchableSelect
                          value={line.item_code}
                          onChange={(v) => handleItemPick(line.id, v, index)}
                          options={itemOptions}
                          onSearch={searchItems}
                          placeholder="Select item"
                          disabled={disabled || loadingSetup}
                          error={!line.item_code}
                          creatable
                          onCreateNew={(q) => { quickAddLineId.current = line.id; quickAdd.open('item', q); }}
                        />
                      </div>
                      <div>
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Qty</span>
                        <input type="number" min={1} step="0.01" value={line.qty} disabled={disabled}
                          onChange={(e) => updateLine(line.id, { qty: Number(e.target.value) })}
                          className={`input-field text-right text-sm ${!(Number(line.qty) > 0) ? 'border-amber-300' : ''}`} />
                      </div>
                      <div>
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Rate</span>
                        <input type="number" min={0} step="0.01" value={line.rate} disabled={disabled}
                          onChange={(e) => updateLine(line.id, { rate: Number(e.target.value) })}
                          className={`input-field text-right text-sm ${!(Number(line.rate) > 0) ? 'border-amber-300' : ''}`} />
                      </div>
                      <div>
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Amount</span>
                        <div className="input-field bg-gray-50 text-right text-sm font-medium text-gray-900">
                          {formatCurrency((Number(line.qty) || 0) * (Number(line.rate) || 0))}
                        </div>
                      </div>
                      <div className="flex items-end">
                        <button type="button" onClick={() => removeLine(line.id)} disabled={disabled || lines.length <= minLines}
                          className="rounded-lg border border-gray-200 p-2.5 text-gray-400 hover:text-red-600 disabled:opacity-30">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Warehouse</span>
                        <SearchableSelect
                          value={line.warehouse || defaultWarehouse}
                          onChange={(v) => {
                            updateLine(line.id, { warehouse: v, serial_error: null });
                            if (line.item_code) void refreshLineStock(line.id, line.item_code, v);
                          }}
                          options={warehouseOptions}
                          placeholder="Select warehouse"
                          disabled={disabled || loadingSetup || warehouseOptions.length === 0}
                        />
                      </div>
                      {line.stock_qty != null && line.item_code && (
                        <div>
                          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Available</span>
                          <div className="input-field bg-gray-50 text-sm text-gray-700">{line.stock_qty} units</div>
                        </div>
                      )}
                    </div>
                    {(line.has_serial_no || serialMode !== 'none') && (
                      <div>
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Serial number</span>
                        <input type="text" value={line.serial_no || ''} disabled={disabled}
                          onChange={(e) => updateLine(line.id, { serial_no: e.target.value, serial_error: null })}
                          onBlur={() => serialMode !== 'none' && void validateSerial(line.id)}
                          className={`input-field text-sm font-mono ${line.serial_error ? 'border-red-300' : ''}`}
                          placeholder="Scan or enter serial" />
                        {line.serial_error && <p className="mt-1 text-xs text-red-600">{line.serial_error}</p>}
                      </div>
                    )}
                    {showDescription && (
                      <div>
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Description</span>
                        <textarea value={line.description || ''} disabled={disabled} rows={2}
                          onChange={(e) => updateLine(line.id, { description: e.target.value })}
                          className="input-field text-sm resize-none"
                          placeholder="Line description for client-facing documents" />
                      </div>
                    )}
                    {renderLineExtra?.(line, index)}
                    {issues.length > 0 && (
                      <div className="rounded-md border border-amber-200 bg-white px-3 py-2 text-xs text-amber-800">
                        Line {index + 1}: {issues.join(' • ')}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">Item</span>
                      <SearchableSelect
                        value={line.item_code}
                        onChange={(v) => handleItemPick(line.id, v, index)}
                        options={itemOptions}
                        onSearch={searchItems}
                        placeholder="Search code, name, or barcode item"
                        disabled={disabled || loadingSetup}
                        creatable
                        onCreateNew={(q) => { quickAddLineId.current = line.id; quickAdd.open('item', q); }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">Qty</span>
                        <input type="number" min={0} step="0.01" value={line.qty} disabled={disabled}
                          onChange={(e) => updateLine(line.id, { qty: parseFloat(e.target.value) || 0 })}
                          className="input-field text-sm text-right" />
                      </div>
                      <div>
                        <span className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">Rate</span>
                        <input type="number" min={0} step="0.01" value={line.rate} disabled={disabled}
                          onChange={(e) => updateLine(line.id, { rate: parseFloat(e.target.value) || 0 })}
                          className="input-field text-sm text-right" />
                      </div>
                      <div className="flex items-end justify-end">
                        <button type="button" onClick={() => removeLine(line.id)} disabled={disabled || lines.length <= minLines}
                          className="p-2 text-gray-400 hover:text-rose-600 disabled:opacity-30">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {!compact && warehouseOptions.length > 0 && (
                      <SearchableSelect
                        value={line.warehouse || defaultWarehouse}
                        onChange={(v) => {
                          updateLine(line.id, { warehouse: v });
                          if (line.item_code) void refreshLineStock(line.id, line.item_code, v);
                        }}
                        options={warehouseOptions}
                        placeholder="Warehouse"
                        disabled={disabled}
                      />
                    )}
                    {!compact && line.has_serial_no && serialMode !== 'none' && (
                      <input type="text" value={line.serial_no || ''} disabled={disabled}
                        onChange={(e) => updateLine(line.id, { serial_no: e.target.value, serial_error: null })}
                        onBlur={() => void validateSerial(line.id)}
                        className={`input-field text-sm font-mono ${line.serial_error ? 'border-red-300' : ''}`}
                        placeholder="Serial number" />
                    )}
                    <p className="text-right font-medium text-gray-700 dark:text-slate-200 text-xs">
                      {(line.qty * line.rate).toFixed(2)}
                    </p>
                  </>
                )}
              </div>
            );
          })}
          {!hideLineTotal && (
            <div className="text-right text-xs font-semibold text-gray-700 dark:text-slate-200">
              Total: {invoiceLayout ? formatCurrency(lineTotal) : lineTotal.toFixed(2)}
            </div>
          )}
        </div>
      )}

      <QuickAddProvider
        quickAdd={quickAdd}
        itemsSetter={setItems}
        itemValueSetter={(value) => {
          const lineId = quickAddLineId.current;
          if (lineId != null) {
            handleItemPick(lineId, value);
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

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { suppliersApi, inventoryApi, purchasesApi } from '../lib/api';
import { appendPreservedListQuery, formatCurrency, isOperationsContext } from '../lib/utils';
import SearchableSelect from '../components/SearchableSelect';
import useQuickAdd from '../components/useQuickAdd';
import QuickAddProvider from '../components/QuickAddProvider';

type ReturnLine = {
  item_code: string;
  qty: number;
  rate: number;
  warehouse?: string;
};

const EMPTY_LINE: ReturnLine = { item_code: '', qty: 1, rate: 0, warehouse: '' };

function getLineIssues(line: ReturnLine) {
  const issues: string[] = [];
  if (!line.item_code) issues.push('Select an item');
  if (!(Number(line.qty) > 0)) issues.push('Enter a quantity greater than 0');
  if (!(Number(line.rate) >= 0)) issues.push('Review the rate');
  return issues;
}

export default function CreatePurchaseReturnPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [supplier, setSupplier] = useState('');
  const [invoiceName, setInvoiceName] = useState('');
  const [postingDate, setPostingDate] = useState(today());
  const [dueDate, setDueDate] = useState(today());
  const [lines, setLines] = useState<ReturnLine[]>([{ ...EMPTY_LINE }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listSearch = searchParams.get('list');
  const backToPath = listSearch
    ? isOperationsContext(listSearch)
      ? `/operations?${listSearch}`
      : '/purchases'
    : '/purchases';
  const backLabel = listSearch && isOperationsContext(listSearch) ? 'Back to Operations' : 'Back to Purchases';
  const quickAdd = useQuickAdd();
  const quickAddItemLine = useRef<number>(-1);

  useEffect(() => {
    const supplierParam = searchParams.get('supplier');
    const invoiceParam = searchParams.get('invoiceName');
    const postingDateParam = searchParams.get('postingDate');
    const dueDateParam = searchParams.get('dueDate');
    const linesParam = searchParams.get('lines');

    if (supplierParam) setSupplier(supplierParam);
    if (invoiceParam) setInvoiceName(invoiceParam);
    if (postingDateParam) setPostingDate(postingDateParam);
    if (dueDateParam) setDueDate(dueDateParam);
    if (linesParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(linesParam));
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLines(parsed.map((line) => ({
            item_code: line.item_code || '',
            qty: Math.abs(Number(line.qty)) || 1,
            rate: Number(line.rate) || 0,
            warehouse: line.warehouse || '',
          })));
        }
      } catch (err) {
        console.error('Failed to parse purchase return line prefills:', err);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [suppliersRes, itemsRes, warehousesRes] = await Promise.all([
          suppliersApi.getList({ page: 1, page_size: 100 }),
          inventoryApi.getItems({ page: 1, page_size: 100 }),
          inventoryApi.getWarehouses(),
        ]);
        setSuppliers(suppliersRes.data.message?.data || []);
        setItems(itemsRes.data.message?.data || []);
        setWarehouses(warehousesRes.data.message?.data || warehousesRes.data.message || []);
      } catch (err) {
        console.error('Failed to load purchase return form data:', err);
        setError('Could not load suppliers and items for purchase return creation.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.qty) || 0) * (Number(line.rate) || 0), 0),
    [lines],
  );
  const validLineCount = useMemo(
    () => lines.filter((line) => line.item_code && Number(line.qty) > 0).length,
    [lines],
  );
  const readinessChecks = useMemo(
    () => [
      { label: 'Supplier selected', passed: Boolean(supplier) },
      { label: 'Source invoice selected', passed: Boolean(invoiceName) },
      { label: 'At least one valid return line', passed: validLineCount > 0 },
    ],
    [supplier, invoiceName, validLineCount],
  );
  const readinessIssues = readinessChecks.filter((check) => !check.passed).map((check) => check.label);
  const isReadyToSave = readinessIssues.length === 0;

  const updateLine = (index: number, patch: Partial<ReturnLine>) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const addLine = () => setLines((current) => [...current, { ...EMPTY_LINE }]);

  const removeLine = (index: number) => {
    setLines((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current));
  };

  const handleItemChange = (index: number, itemCode: string) => {
    const selected = items.find((item) => item.item_code === itemCode || item.name === itemCode);
    updateLine(index, {
      item_code: itemCode,
      rate: selected?.standard_rate ?? selected?.valuation_rate ?? 0,
      warehouse: selected?.default_warehouse ?? '',
    });
  };

  const handleSubmit = async () => {
    if (!supplier) {
      setError('Please select a supplier before creating the return.');
      return;
    }
    if (!invoiceName) {
      setError('A source purchase invoice is required for return creation.');
      return;
    }

    const validLines = lines.filter((line) => line.item_code && Number(line.qty) > 0);
    if (validLines.length === 0) {
      setError('Add at least one valid return line.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await purchasesApi.createReturnInvoice({
        supplier,
        return_against: invoiceName,
        posting_date: postingDate,
        due_date: dueDate,
        items: validLines,
      });
      const created = response.data.message;
      navigate(appendPreservedListQuery(`/purchases/${encodeURIComponent(created.name)}`, listSearch));
    } catch (err: any) {
      console.error('Failed to create purchase return:', err);
      setError(err?.response?.data?.exception || 'Could not create purchase return.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate(backToPath)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft size={16} /> {backLabel}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">New Purchase Return</h1>
          <p className="mt-1 text-gray-500">Create a debit-note style purchase return against a submitted purchase invoice.</p>
        </div>
        <button onClick={handleSubmit} disabled={saving || loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Save size={14} /> {saving ? 'Creating…' : 'Create Return Draft'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
        <div className="font-medium">Return context</div>
        <div className="mt-1 text-brand-800">{invoiceName ? `Returning against invoice ${invoiceName}.` : 'Choose the source invoice from a purchase invoice action.'}</div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label="Supplier">
              <SearchableSelect
                value={supplier}
                onChange={setSupplier}
                options={suppliers.map((e) => ({ label: e.supplier_name || e.name, value: e.name }))}
                placeholder="Select supplier"
                disabled={loading}
                creatable
                onCreateNew={(query) => quickAdd.open('supplier', query)}
              />
            </Field>
            <Field label="Return Against Invoice">
              <input value={invoiceName} onChange={(e) => setInvoiceName(e.target.value)} className="input-field" placeholder="Purchase Invoice" />
            </Field>
            <Field label="Posting Date">
              <input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} className="input-field" />
            </Field>
            <Field label="Due Date">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" />
            </Field>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Return Items</h2>
              <button onClick={addLine} className="btn-secondary flex items-center gap-2">
                <Plus size={14} /> Add Line
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className={`grid grid-cols-1 gap-3 rounded-lg border p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto] ${getLineIssues(line).length > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200'}`}>
                  <Field label="Item">
                    <SearchableSelect
                      value={line.item_code}
                      onChange={(v) => handleItemChange(index, v)}
                      options={items.map((e) => ({ label: e.item_name || e.item_code || e.name, value: e.item_code || e.name }))}
                      placeholder="Select item"
                      disabled={loading}
                      error={!line.item_code}
                      creatable
                      onCreateNew={(query) => { quickAddItemLine.current = index; quickAdd.open('item', query); }}
                    />
                  </Field>
                  <Field label="Qty">
                    <input type="number" min={1} step="0.01" value={line.qty} onChange={(e) => updateLine(index, { qty: Number(e.target.value) })} className={`input-field ${!(Number(line.qty) > 0) ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500' : ''}`} />
                  </Field>
                  <Field label="Rate">
                    <input type="number" min={0} step="0.01" value={line.rate} onChange={(e) => updateLine(index, { rate: Number(e.target.value) })} className="input-field" />
                  </Field>
                  <Field label="Warehouse">
                    <SearchableSelect
                      value={line.warehouse || ''}
                      onChange={(v) => updateLine(index, { warehouse: v })}
                      options={warehouses.map((w) => ({ label: w.warehouse_name || w.name, value: w.name }))}
                      placeholder="Select warehouse"
                      disabled={loading}
                    />
                  </Field>
                  <div className="flex items-end">
                    <button onClick={() => removeLine(index)} disabled={lines.length === 1} className="rounded-lg border border-gray-200 p-3 text-gray-500 hover:text-red-600 disabled:opacity-40">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="md:col-span-5 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm">
                    <span className="text-gray-500">Return Amount</span>
                    <span className="font-semibold text-gray-900">{formatCurrency((Number(line.qty) || 0) * (Number(line.rate) || 0))}</span>
                  </div>
                  {getLineIssues(line).length > 0 && (
                    <div className="md:col-span-5 rounded-md border border-amber-200 bg-white px-3 py-2 text-xs text-amber-800">
                      Line {index + 1}: {getLineIssues(line).join(' • ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Return Summary</h2>
          <ReadinessCard ready={isReadyToSave} issues={readinessIssues} />
          <div className="rounded-lg bg-gray-900 px-4 py-3 text-white">
            <div className="text-xs uppercase tracking-wide text-gray-300">Estimated Debit Amount</div>
            <div className="mt-1 text-2xl font-semibold">{formatCurrency(total)}</div>
          </div>
          <SummaryRow label="Valid Lines" value={String(validLineCount)} />
          <SummaryRow label="Return Against" value={invoiceName || '—'} />
          <SummaryRow label="Posting Date" value={postingDate} />
          <SummaryRow label="Due Date" value={dueDate} />
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-xs text-blue-800">
            <div className="mb-1 flex items-center gap-2 font-medium"><RotateCcw size={14} /> ERP behavior</div>
            This flow creates a draft Purchase Invoice marked as a return (debit note) and links it to the source invoice using <code>return_against</code>.
          </div>
        </div>
      </div>

      <QuickAddProvider
        quickAdd={quickAdd}
        suppliersSetter={setSuppliers}
        supplierValueSetter={setSupplier}
        itemsSetter={setItems}
        itemValueSetter={(v) => { if (quickAddItemLine.current >= 0) handleItemChange(quickAddItemLine.current, v); }}
      />
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}

function ReadinessCard({ ready, issues }: { ready: boolean; issues: string[] }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${ready ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      <div className="font-medium">{ready ? 'Ready to create return draft' : 'Needs attention before create'}</div>
      {ready ? (
        <p className="mt-1 text-xs text-emerald-700">Supplier, source invoice, and return line checks are satisfied.</p>
      ) : (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-800">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, PackageCheck, Plus, Save, Trash2 } from 'lucide-react';
import { inventoryApi } from '../lib/api';
import { appendPreservedListQuery, formatCurrency } from '../lib/utils';
import SearchableSelect from '../components/SearchableSelect';

type ReceiptLine = {
  item_code: string;
  qty: number;
  rate: number;
  warehouse: string;
};

const EMPTY_LINE: ReceiptLine = {
  item_code: '',
  qty: 1,
  rate: 0,
  warehouse: '',
};

export default function CreatePurchaseReceiptPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [postingDate, setPostingDate] = useState(today());
  const [warehouse, setWarehouse] = useState(searchParams.get('warehouse') || '');
  const [lines, setLines] = useState<ReceiptLine[]>([{ ...EMPTY_LINE }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const orderName = searchParams.get('orderName') || '';
  const supplier = searchParams.get('supplier') || '';
  const listSearch = searchParams.get('list');

  useEffect(() => {
    const encodedLines = searchParams.get('lines');
    if (!encodedLines) return;

    try {
      const parsed = JSON.parse(decodeURIComponent(encodedLines));
      if (Array.isArray(parsed) && parsed.length > 0) {
        setLines(
          parsed.map((line) => ({
            item_code: line.item_code || '',
            qty: Number(line.qty) || 1,
            rate: Number(line.rate) || 0,
            warehouse: line.warehouse || searchParams.get('warehouse') || '',
          })),
        );
      }
    } catch (parseError) {
      console.error('Failed to parse receipt line prefills:', parseError);
    }
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      try {
        const [warehousesRes, itemsRes] = await Promise.all([
          inventoryApi.getWarehouses(),
          inventoryApi.getItems({ page: 1, page_size: 200 }),
        ]);
        setWarehouses(warehousesRes.data.message?.data || warehousesRes.data.message || []);
        setItems(itemsRes.data.message?.data || []);
      } catch (err) {
        console.error('Failed to load receipt form data:', err);
      }
    };
    void load();
  }, []);

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.qty) || 0) * (Number(line.rate) || 0), 0),
    [lines],
  );

  const backToOrderPath = orderName
    ? appendPreservedListQuery(`/purchases/orders/${encodeURIComponent(orderName)}`, listSearch)
    : '/purchases/orders';

  const updateLine = (index: number, patch: Partial<ReceiptLine>) => {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  };

  const addLine = () => {
    setLines((current) => [...current, { ...EMPTY_LINE, warehouse }]);
  };

  const removeLine = (index: number) => {
    setLines((current) => (current.length > 1 ? current.filter((_, lineIndex) => lineIndex !== index) : current));
  };

  const handleCreateReceipt = async () => {
    const validLines = lines.filter((line) => line.item_code && Number(line.qty) > 0);
    if (validLines.length === 0) {
      setError('Add at least one valid receipt line before creating the draft.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await inventoryApi.createPurchaseReceipt({
        posting_date: postingDate,
        items: validLines.map((line) => ({
          item_code: line.item_code,
          qty: Number(line.qty) || 0,
          rate: Number(line.rate) || 0,
          warehouse: line.warehouse || warehouse,
        })),
      });

      const created = response.data.message;
      navigate('/inventory/movements', {
        state: {
          createdReceipt: created,
          sourceOrder: orderName,
        },
      });
    } catch (err: any) {
      console.error('Failed to create purchase receipt draft:', err);
      setError(err?.response?.data?.exception || 'Could not create the stock receipt draft.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate(backToOrderPath)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft size={16} /> Back to Purchase Order
          </button>
          <h1 className="text-2xl font-bold text-gray-900">New Purchase Receipt</h1>
          <p className="mt-1 text-gray-500">Create a draft material receipt from the selected purchase order lines.</p>
        </div>
        <button onClick={handleCreateReceipt} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Save size={14} /> {saving ? 'Creating…' : 'Create Receipt Draft'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Supplier">
              <input value={supplier || '—'} className="input-field bg-gray-50" disabled />
            </Field>
            <Field label="Posting Date">
              <input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} className="input-field" />
            </Field>
            <Field label="Default Warehouse">
              <SearchableSelect
                value={warehouse}
                onChange={setWarehouse}
                options={warehouses.map((w) => ({ label: w.warehouse_name || w.name, value: w.name }))}
                placeholder="Select warehouse"
              />
            </Field>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Receipt Lines</h2>
              <button onClick={addLine} className="btn-secondary flex items-center gap-2">
                <Plus size={14} /> Add Line
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[2fr_1fr_1fr_2fr_auto]">
                  <Field label="Item Code">
                    <SearchableSelect
                      value={line.item_code}
                      onChange={(v) => updateLine(index, { item_code: v })}
                      options={items.map((e) => ({ label: e.item_name || e.item_code || e.name, value: e.item_code || e.name }))}
                      placeholder="Select item"
                    />
                  </Field>
                  <Field label="Qty">
                    <input type="number" min={0.01} step="0.01" value={line.qty} onChange={(e) => updateLine(index, { qty: Number(e.target.value) })} className="input-field" />
                  </Field>
                  <Field label="Rate">
                    <input type="number" min={0} step="0.01" value={line.rate} onChange={(e) => updateLine(index, { rate: Number(e.target.value) })} className="input-field" />
                  </Field>
                  <Field label="Warehouse">
                    <SearchableSelect
                      value={line.warehouse || warehouse}
                      onChange={(v) => updateLine(index, { warehouse: v })}
                      options={warehouses.map((w) => ({ label: w.warehouse_name || w.name, value: w.name }))}
                      placeholder="Select warehouse"
                    />
                  </Field>
                  <div className="flex items-end">
                    <button onClick={() => removeLine(index)} disabled={lines.length === 1} className="rounded-lg border border-gray-200 p-3 text-gray-500 hover:text-red-600 disabled:opacity-40">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2 text-green-700">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Receipt Summary</h2>
              <p className="text-sm text-gray-500">Draft inventory receipt totals</p>
            </div>
          </div>
          <SummaryRow label="Source Order" value={orderName || 'Manual'} />
          <SummaryRow label="Receipt Lines" value={String(lines.filter((line) => line.item_code).length)} />
          <SummaryRow label="Estimated Value" value={formatCurrency(total)} />
          <SummaryRow label="Posting Date" value={postingDate} />
          <p className="text-xs leading-5 text-gray-500">
            This creates a draft `Material Receipt` stock entry through the existing inventory API so receiving can happen before supplier billing.
          </p>
        </div>
      </div>
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
      <span className="font-medium text-right text-gray-900">{value}</span>
    </div>
  );
}
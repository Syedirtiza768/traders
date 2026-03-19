import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { inventoryApi, purchasesApi } from '../lib/api';
import { appendPreservedListQuery, formatCurrency, isOperationsContext } from '../lib/utils';
import SearchableSelect from '../components/SearchableSelect';

type RequestLine = {
  item_code: string;
  qty: number;
  rate: number;
  schedule_date?: string;
  warehouse?: string;
};

const EMPTY_LINE: RequestLine = { item_code: '', qty: 1, rate: 0, schedule_date: '', warehouse: '' };

export default function CreatePurchaseRequisitionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [transactionDate, setTransactionDate] = useState(today());
  const [scheduleDate, setScheduleDate] = useState(today());
  const [lines, setLines] = useState<RequestLine[]>([{ ...EMPTY_LINE, schedule_date: today() }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listSearch = searchParams.get('list');
  const backToPath = listSearch ? (isOperationsContext(listSearch) ? `/operations?${listSearch}` : '/purchases/requisitions') : '/purchases/requisitions';
  const backLabel = listSearch && isOperationsContext(listSearch) ? 'Back to Operations' : 'Back to Requisitions';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [itemsRes, warehousesRes] = await Promise.all([
          inventoryApi.getItems({ page: 1, page_size: 100 }),
          inventoryApi.getWarehouses(),
        ]);
        setItems(itemsRes.data.message?.data || []);
        setWarehouses(warehousesRes.data.message?.data || warehousesRes.data.message || []);
      } catch (err) {
        console.error('Failed to load requisition form data:', err);
        setError('Could not load item catalog for requisition creation.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const total = useMemo(() => lines.reduce((sum, line) => sum + (Number(line.qty) || 0) * (Number(line.rate) || 0), 0), [lines]);

  const updateLine = (index: number, patch: Partial<RequestLine>) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const addLine = () => setLines((current) => [...current, { ...EMPTY_LINE, schedule_date: scheduleDate }]);
  const removeLine = (index: number) => setLines((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current));

  const handleItemChange = (index: number, itemCode: string) => {
    const selected = items.find((item) => item.item_code === itemCode || item.name === itemCode);
    updateLine(index, {
      item_code: itemCode,
      rate: selected?.last_purchase_rate ?? selected?.valuation_rate ?? selected?.standard_rate ?? 0,
      warehouse: selected?.default_warehouse ?? '',
    });
  };

  const handleSubmit = async () => {
    const validLines = lines.filter((line) => line.item_code && Number(line.qty) > 0);
    if (validLines.length === 0) {
      setError('Add at least one valid requisition line.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await purchasesApi.createRequisition({
        title,
        transaction_date: transactionDate,
        schedule_date: scheduleDate,
        items: validLines,
      });
      const created = response.data.message;
      navigate(appendPreservedListQuery(`/purchases/requisitions/${encodeURIComponent(created.name)}`, listSearch));
    } catch (err: any) {
      console.error('Failed to create purchase requisition:', err);
      setError(err?.response?.data?.exception || 'Could not create purchase requisition.');
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
          <h1 className="text-2xl font-bold text-gray-900">New Purchase Requisition</h1>
          <p className="mt-1 text-gray-500">Create internal demand before requesting supplier quotes or placing orders.</p>
        </div>
        <button onClick={handleSubmit} disabled={saving || loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Save size={14} /> {saving ? 'Creating…' : 'Create Draft'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Title">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="Office restock / project buy" />
            </Field>
            <Field label="Request Date">
              <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="input-field" />
            </Field>
            <Field label="Schedule Date">
              <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="input-field" />
            </Field>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Requested Items</h2>
              <button onClick={addLine} className="btn-secondary flex items-center gap-2"><Plus size={14} /> Add Line</button>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
                  <Field label="Item">
                    <SearchableSelect
                      value={line.item_code}
                      onChange={(v) => handleItemChange(index, v)}
                      options={items.map((e) => ({ label: e.item_name || e.item_code || e.name, value: e.item_code || e.name }))}
                      placeholder="Select item"
                      disabled={loading}
                    />
                  </Field>
                  <Field label="Qty"><input type="number" min={1} step="0.01" value={line.qty} onChange={(e) => updateLine(index, { qty: Number(e.target.value) })} className="input-field" /></Field>
                  <Field label="Rate"><input type="number" min={0} step="0.01" value={line.rate} onChange={(e) => updateLine(index, { rate: Number(e.target.value) })} className="input-field" /></Field>
                  <Field label="Needed By"><input type="date" value={line.schedule_date || scheduleDate} onChange={(e) => updateLine(index, { schedule_date: e.target.value })} className="input-field" /></Field>
                  <Field label="Warehouse"><SearchableSelect
                      value={line.warehouse || ''}
                      onChange={(v) => updateLine(index, { warehouse: v })}
                      options={warehouses.map((w) => ({ label: w.warehouse_name || w.name, value: w.name }))}
                      placeholder="Select warehouse"
                      disabled={loading}
                    /></Field>
                  <div className="flex items-end"><button onClick={() => removeLine(index)} disabled={lines.length === 1} className="rounded-lg border border-gray-200 p-3 text-gray-500 hover:text-red-600 disabled:opacity-40"><Trash2 size={16} /></button></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
          <SummaryRow label="Valid Lines" value={String(lines.filter((line) => line.item_code).length)} />
          <SummaryRow label="Estimated Value" value={formatCurrency(total)} />
          <SummaryRow label="Request Date" value={transactionDate} />
          <SummaryRow label="Schedule Date" value={scheduleDate} />
        </div>
      </div>
    </div>
  );
}

function today() { return new Date().toISOString().slice(0, 10); }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>{children}</div>; }
function SummaryRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between text-sm"><span className="text-gray-500">{label}</span><span className="font-medium text-gray-900">{value}</span></div>; }
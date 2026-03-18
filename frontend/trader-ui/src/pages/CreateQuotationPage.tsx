import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { customersApi, inventoryApi, salesApi } from '../lib/api';
import { appendPreservedListQuery, formatCurrency } from '../lib/utils';
import SearchableSelect from '../components/SearchableSelect';

type QuotationLine = {
  item_code: string;
  qty: number;
  rate: number;
};

const EMPTY_LINE: QuotationLine = { item_code: '', qty: 1, rate: 0 };

export default function CreateQuotationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState('');
  const [transactionDate, setTransactionDate] = useState(today());
  const [validTill, setValidTill] = useState(today());
  const [lines, setLines] = useState<QuotationLine[]>([{ ...EMPTY_LINE }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listSearch = searchParams.get('list');

  useEffect(() => {
    const customerParam = searchParams.get('customer');
    if (customerParam) setCustomer(customerParam);
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [customersRes, itemsRes] = await Promise.all([
          customersApi.getList({ page: 1, page_size: 100 }),
          inventoryApi.getItems({ page: 1, page_size: 100 }),
        ]);
        setCustomers(customersRes.data.message?.data || []);
        setItems(itemsRes.data.message?.data || []);
      } catch (err) {
        console.error('Failed to load quotation form data:', err);
        setError('Could not load customers and items.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0),
    [lines],
  );
  const validLineCount = useMemo(
    () => lines.filter((l) => l.item_code && Number(l.qty) > 0).length,
    [lines],
  );
  const isReadyToSave = Boolean(customer) && validLineCount > 0;

  const updateLine = (index: number, patch: Partial<QuotationLine>) => {
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
      rate: selected?.selling_price ?? selected?.standard_rate ?? 0,
    });
  };

  const handleSubmit = async () => {
    if (!customer) {
      setError('Please select a customer.');
      return;
    }
    const validLines = lines.filter((l) => l.item_code && Number(l.qty) > 0);
    if (validLines.length === 0) {
      setError('Add at least one valid item line.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await salesApi.createQuotation({
        customer,
        transaction_date: transactionDate,
        valid_till: validTill,
        items: validLines,
      });
      const created = response.data.message;
      navigate(appendPreservedListQuery(`/sales/quotations/${encodeURIComponent(created.name)}`, listSearch));
    } catch (err: any) {
      console.error('Failed to create quotation:', err);
      setError(err?.response?.data?.exception || 'Could not create quotation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/sales/quotations')} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft size={16} /> Back to Quotations
          </button>
          <h1 className="text-2xl font-bold text-gray-900">New Quotation</h1>
          <p className="mt-1 text-gray-500">Create a draft quotation for a customer.</p>
        </div>
        <button onClick={handleSubmit} disabled={saving || loading || !isReadyToSave} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Save size={14} /> {saving ? 'Creating…' : 'Create Draft'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Customer">
              <SearchableSelect
                value={customer}
                onChange={setCustomer}
                options={customers.map((e) => ({ label: e.customer_name || e.name, value: e.name }))}
                placeholder="Select customer"
                disabled={loading}
              />
            </Field>
            <Field label="Quotation Date">
              <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="input-field" />
            </Field>
            <Field label="Valid Till">
              <input type="date" value={validTill} onChange={(e) => setValidTill(e.target.value)} className="input-field" />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
              <button onClick={addLine} className="btn-secondary text-xs flex items-center gap-1">
                <Plus size={12} /> Add Line
              </button>
            </div>

            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Item</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase w-24">Qty</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase w-32">Rate</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase w-32">Amount</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((line, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <SearchableSelect
                          value={line.item_code}
                          onChange={(v) => handleItemChange(i, v)}
                          options={items.map((item) => ({ label: item.item_name || item.item_code || item.name, value: item.item_code || item.name }))}
                          placeholder="Select item"
                          className="text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min="1" value={line.qty} onChange={(e) => updateLine(i, { qty: Number(e.target.value) || 0 })} className="input-field text-right text-sm" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min="0" step="0.01" value={line.rate} onChange={(e) => updateLine(i, { rate: Number(e.target.value) || 0 })} className="input-field text-right text-sm" />
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                        {formatCurrency((Number(line.qty) || 0) * (Number(line.rate) || 0))}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => removeLine(i)} disabled={lines.length <= 1} className="text-red-400 hover:text-red-600 disabled:opacity-30">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Summary</h3>
          <SummaryLine label="Lines" value={String(validLineCount)} />
          <SummaryLine label="Grand Total" value={formatCurrency(total)} highlight />
          <hr className="border-gray-100" />
          <h4 className="text-xs font-medium text-gray-500 uppercase">Readiness</h4>
          <ReadinessCheck label="Customer selected" passed={Boolean(customer)} />
          <ReadinessCheck label="At least one item line" passed={validLineCount > 0} />
        </div>
      </div>
    </div>
  );
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function SummaryLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-gray-900 text-lg' : 'text-gray-700'}`}>{value}</span>
    </div>
  );
}

function ReadinessCheck({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-2 h-2 rounded-full ${passed ? 'bg-green-500' : 'bg-red-400'}`} />
      <span className={passed ? 'text-gray-600' : 'text-red-600'}>{label}</span>
    </div>
  );
}

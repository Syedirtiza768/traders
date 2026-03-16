import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { customersApi, inventoryApi, salesApi } from '../lib/api';
import { appendPreservedListQuery, formatCurrency, isOperationsContext } from '../lib/utils';

type InvoiceLine = {
  item_code: string;
  qty: number;
  rate: number;
};

const EMPTY_LINE: InvoiceLine = { item_code: '', qty: 1, rate: 0 };

function getLineIssues(line: { item_code: string; qty: number; rate: number }) {
  const issues: string[] = [];
  if (!line.item_code) issues.push('Select an item');
  if (!(Number(line.qty) > 0)) issues.push('Enter a quantity greater than 0');
  if (!(Number(line.rate) > 0)) issues.push('Review the rate');
  return issues;
}

export default function CreateSalesInvoicePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState('');
  const [postingDate, setPostingDate] = useState(today());
  const [dueDate, setDueDate] = useState(today());
  const [lines, setLines] = useState<InvoiceLine[]>([{ ...EMPTY_LINE }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceType = searchParams.get('sourceType');
  const sourceName = searchParams.get('sourceName');
  const listSearch = searchParams.get('list');
  const prefillsLineCount = searchParams.get('lines') ? lines.filter((line) => line.item_code).length : 0;
  const backToPath = listSearch
    ? isOperationsContext(listSearch)
      ? `/operations?${listSearch}`
      : '/sales'
    : '/sales';
  const backLabel = listSearch && isOperationsContext(listSearch) ? 'Back to Operations' : 'Back to Sales';

  useEffect(() => {
    const customerParam = searchParams.get('customer');
    const postingDateParam = searchParams.get('postingDate') || searchParams.get('transactionDate');
    const dueDateParam = searchParams.get('dueDate') || searchParams.get('deliveryDate');
    const linesParam = searchParams.get('lines');

    if (customerParam) setCustomer(customerParam);
    if (postingDateParam) setPostingDate(postingDateParam);
    if (dueDateParam) setDueDate(dueDateParam);
    if (linesParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(linesParam));
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLines(parsed.map((line) => ({
            item_code: line.item_code || '',
            qty: Number(line.qty) || 1,
            rate: Number(line.rate) || 0,
          })));
        }
      } catch (err) {
        console.error('Failed to parse sales invoice line prefills:', err);
      }
    }
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
        console.error('Failed to load invoice form data:', err);
        setError('Could not load customers and items for invoice creation.');
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
      { label: 'Customer selected', passed: Boolean(customer) },
      { label: 'At least one valid item line', passed: validLineCount > 0 },
    ],
    [customer, validLineCount],
  );
  const readinessIssues = readinessChecks.filter((check) => !check.passed).map((check) => check.label);
  const isReadyToSave = readinessIssues.length === 0;

  const updateLine = (index: number, patch: Partial<InvoiceLine>) => {
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
    });
  };

  const handleSubmit = async () => {
    if (!customer) {
      setError('Please select a customer before creating the invoice.');
      return;
    }

    const validLines = lines.filter((line) => line.item_code && Number(line.qty) > 0);
    if (validLines.length === 0) {
      setError('Add at least one valid item line.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await salesApi.createInvoice({
        customer,
        posting_date: postingDate,
        due_date: dueDate,
        items: validLines,
      });
      const created = response.data.message;
      navigate(appendPreservedListQuery(`/sales/${encodeURIComponent(created.name)}`, listSearch));
    } catch (err: any) {
      console.error('Failed to create sales invoice:', err);
      setError(err?.response?.data?.exception || 'Could not create sales invoice.');
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
          <h1 className="text-2xl font-bold text-gray-900">New Sales Invoice</h1>
          <p className="mt-1 text-gray-500">Create a draft sales invoice using the existing ERPNext workflow.</p>
        </div>
        <button onClick={handleSubmit} disabled={saving || loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Save size={14} /> {saving ? 'Creating…' : 'Create Draft'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {(sourceType || sourceName) && (
        <PrefillBanner
          sourceType={sourceType}
          sourceName={sourceName}
          fields={[
            customer ? 'customer' : null,
            postingDate ? 'posting date' : null,
            dueDate ? 'due date' : null,
            prefillsLineCount > 0 ? `${prefillsLineCount} item line${prefillsLineCount === 1 ? '' : 's'}` : null,
          ]}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Customer">
              <select value={customer} onChange={(e) => setCustomer(e.target.value)} className="input-field" disabled={loading}>
                <option value="">Select customer</option>
                {customers.map((entry) => (
                  <option key={entry.name} value={entry.name}>{entry.customer_name || entry.name}</option>
                ))}
              </select>
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
              <h2 className="text-lg font-semibold text-gray-900">Invoice Items</h2>
              <button onClick={addLine} className="btn-secondary flex items-center gap-2">
                <Plus size={14} /> Add Line
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className={`grid grid-cols-1 gap-3 rounded-lg border p-4 md:grid-cols-[2fr_1fr_1fr_auto] ${getLineIssues(line).length > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200'}`}>
                  <Field label="Item">
                    <select value={line.item_code} onChange={(e) => handleItemChange(index, e.target.value)} className={`input-field ${!line.item_code ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500' : ''}`} disabled={loading}>
                      <option value="">Select item</option>
                      {items.map((entry) => (
                        <option key={entry.name || entry.item_code} value={entry.item_code || entry.name}>{entry.item_name || entry.item_code || entry.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Qty">
                    <input type="number" min={1} step="0.01" value={line.qty} onChange={(e) => updateLine(index, { qty: Number(e.target.value) })} className={`input-field ${!(Number(line.qty) > 0) ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500' : ''}`} />
                  </Field>
                  <Field label="Rate">
                    <input type="number" min={0} step="0.01" value={line.rate} onChange={(e) => updateLine(index, { rate: Number(e.target.value) })} className={`input-field ${!(Number(line.rate) > 0) ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500' : ''}`} />
                  </Field>
                  <div className="flex items-end">
                    <button onClick={() => removeLine(index)} disabled={lines.length === 1} className="rounded-lg border border-gray-200 p-3 text-gray-500 hover:text-red-600 disabled:opacity-40">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="md:col-span-4 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm">
                    <span className="text-gray-500">Line Amount</span>
                    <span className="font-semibold text-gray-900">{formatCurrency((Number(line.qty) || 0) * (Number(line.rate) || 0))}</span>
                  </div>
                  {getLineIssues(line).length > 0 && (
                    <div className="md:col-span-4 rounded-md border border-amber-200 bg-white px-3 py-2 text-xs text-amber-800">
                      Line {index + 1}: {getLineIssues(line).join(' • ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
          <ReadinessCard ready={isReadyToSave} issues={readinessIssues} />
          <div className="rounded-lg bg-gray-900 px-4 py-3 text-white">
            <div className="text-xs uppercase tracking-wide text-gray-300">Draft Subtotal</div>
            <div className="mt-1 text-2xl font-semibold">{formatCurrency(total)}</div>
          </div>
          <SummaryRow label="Valid Lines" value={String(validLineCount)} />
          <SummaryRow label="Draft Total" value={formatCurrency(total)} />
          <SummaryRow label="Posting Date" value={postingDate} />
          <SummaryRow label="Due Date" value={dueDate} />
          <p className="text-xs leading-5 text-gray-500">
            This creates a draft Sales Invoice through the existing whitelisted backend method and then opens the detail screen.
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
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function ReadinessCard({ ready, issues }: { ready: boolean; issues: string[] }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${ready ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
      <div className="font-medium">{ready ? 'Ready to create draft' : 'Needs attention before create'}</div>
      {ready ? (
        <p className="mt-1 text-xs text-emerald-700">Required customer and item line checks are satisfied.</p>
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

function PrefillBanner({
  sourceType,
  sourceName,
  fields,
}: {
  sourceType: string | null;
  sourceName: string | null;
  fields: Array<string | null>;
}) {
  const cleanFields = fields.filter(Boolean) as string[];
  const sourceLabel = sourceType === 'sales-order' ? 'sales order' : 'upstream document';

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
      Prefilled from {sourceLabel}{sourceName ? ` ${sourceName}` : ''}
      {cleanFields.length > 0 ? ` with ${cleanFields.join(', ')}.` : '.'}
    </div>
  );
}
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { customersApi, inventoryApi, salesApi } from '../lib/api';
import { appendPreservedListQuery, formatCurrency, isOperationsContext } from '../lib/utils';
import SearchableSelect from '../components/SearchableSelect';

type OrderLine = {
  item_code: string;
  qty: number;
  rate: number;
  delivery_date?: string;
};

const EMPTY_LINE: OrderLine = { item_code: '', qty: 1, rate: 0 };

function getLineIssues(line: { item_code: string; qty: number; rate: number }) {
  const issues: string[] = [];
  if (!line.item_code) issues.push('Select an item');
  if (!(Number(line.qty) > 0)) issues.push('Enter a quantity greater than 0');
  if (!(Number(line.rate) > 0)) issues.push('Review the rate');
  return issues;
}

export default function CreateSalesOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState('');
  const [transactionDate, setTransactionDate] = useState(today());
  const [deliveryDate, setDeliveryDate] = useState(today());
  const [lines, setLines] = useState<OrderLine[]>([{ ...EMPTY_LINE, delivery_date: today() }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotationLoading, setQuotationLoading] = useState(false);
  const [quotationError, setQuotationError] = useState<string | null>(null);
  const quotationFetched = useRef(false);
  const sourceType = searchParams.get('sourceType');
  const sourceName = searchParams.get('sourceName');
  const listSearch = searchParams.get('list');
  const prefillsLineCount = lines.filter((line) => line.item_code).length;
  const backToPath = listSearch
    ? isOperationsContext(listSearch)
      ? `/operations?${listSearch}`
      : '/sales/orders'
    : '/sales/orders';
  const backLabel = listSearch && isOperationsContext(listSearch) ? 'Back to Operations' : 'Back to Sales Orders';

  useEffect(() => {
    const customerParam = searchParams.get('customer');
    const transactionDateParam = searchParams.get('transactionDate');
    const deliveryDateParam = searchParams.get('deliveryDate') || searchParams.get('validTill');
    const linesParam = searchParams.get('lines');

    if (customerParam) setCustomer(customerParam);
    if (transactionDateParam) setTransactionDate(transactionDateParam);
    if (deliveryDateParam) {
      setDeliveryDate(deliveryDateParam);
      setLines((current) => current.map((line) => ({ ...line, delivery_date: line.delivery_date || deliveryDateParam })));
    }
    if (linesParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(linesParam));
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLines(parsed.map((line) => ({
            item_code: line.item_code || '',
            qty: Number(line.qty) || 1,
            rate: Number(line.rate) || 0,
            delivery_date: line.delivery_date || deliveryDateParam || today(),
          })));
        }
      } catch (err) {
        console.error('Failed to parse sales order line prefills:', err);
      }
    }
  }, [searchParams]);

  // When sourceType=quotation, fetch the quotation and pre-populate all fields.
  useEffect(() => {
    if (sourceType !== 'quotation' || !sourceName || quotationFetched.current) return;
    quotationFetched.current = true;

    const fetchQuotation = async () => {
      setQuotationLoading(true);
      setQuotationError(null);
      try {
        const res = await salesApi.getQuotationDetail(sourceName);
        const qot = res.data.message;
        if (!qot) return;

        // Customer
        if (qot.party_name) setCustomer(qot.party_name);

        // Dates
        if (qot.transaction_date) setTransactionDate(qot.transaction_date);
        const deliveryFallback = qot.valid_till || qot.transaction_date || today();
        setDeliveryDate(deliveryFallback);

        // Items from quotation child table
        if (Array.isArray(qot.items) && qot.items.length > 0) {
          setLines(
            qot.items.map((item: any) => ({
              item_code: item.item_code || '',
              qty: Number(item.qty) || 1,
              rate: Number(item.rate) || 0,
              delivery_date: item.delivery_date || deliveryFallback,
            }))
          );
        }
      } catch (err: any) {
        console.error('Failed to fetch quotation for prefill:', err);
        setQuotationError(`Could not load quotation ${sourceName} — fields not pre-filled.`);
      } finally {
        setQuotationLoading(false);
      }
    };

    void fetchQuotation();
  }, [sourceType, sourceName]);

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
        console.error('Failed to load sales order form data:', err);
        setError('Could not load customers and items for sales order creation.');
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

  const updateLine = (index: number, patch: Partial<OrderLine>) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const addLine = () => setLines((current) => [...current, { ...EMPTY_LINE, delivery_date: deliveryDate }]);

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
      setError('Please select a customer before creating the sales order.');
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
      const response = await salesApi.createOrder({
        customer,
        transaction_date: transactionDate,
        delivery_date: deliveryDate,
        items: validLines,
      });
      const created = response.data.message;
      navigate(appendPreservedListQuery(`/sales/orders/${encodeURIComponent(created.name)}`, listSearch));
    } catch (err: any) {
      console.error('Failed to create sales order:', err);
      setError(err?.response?.data?.exception || 'Could not create sales order.');
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
          <h1 className="text-2xl font-bold text-gray-900">New Sales Order</h1>
          <p className="mt-1 text-gray-500">Create a draft sales order using the existing ERP workflow and item catalog.</p>
        </div>
        <button onClick={handleSubmit} disabled={saving || loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Save size={14} /> {saving ? 'Creating…' : 'Create Draft'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {quotationError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{quotationError}</div>}

      {(sourceType || sourceName) && (
        <PrefillBanner
          sourceType={sourceType}
          sourceName={sourceName}
          loading={quotationLoading}
          fields={[
            customer ? 'customer' : null,
            transactionDate ? 'order date' : null,
            deliveryDate ? 'delivery date' : null,
            prefillsLineCount > 0 ? `${prefillsLineCount} item line${prefillsLineCount === 1 ? '' : 's'}` : null,
          ]}
        />
      )}

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
            <Field label="Order Date">
              <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="input-field" />
            </Field>
            <Field label="Delivery Date">
              <input type="date" value={deliveryDate} onChange={(e) => {
                const nextDate = e.target.value;
                setDeliveryDate(nextDate);
                setLines((current) => current.map((line) => ({ ...line, delivery_date: line.delivery_date || nextDate })));
              }} className="input-field" />
            </Field>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
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
                    />
                  </Field>
                  <Field label="Qty">
                    <input type="number" min={1} step="0.01" value={line.qty} onChange={(e) => updateLine(index, { qty: Number(e.target.value) })} className={`input-field ${!(Number(line.qty) > 0) ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500' : ''}`} />
                  </Field>
                  <Field label="Rate">
                    <input type="number" min={0} step="0.01" value={line.rate} onChange={(e) => updateLine(index, { rate: Number(e.target.value) })} className={`input-field ${!(Number(line.rate) > 0) ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500' : ''}`} />
                  </Field>
                  <Field label="Line Delivery">
                    <input type="date" value={line.delivery_date || deliveryDate} onChange={(e) => updateLine(index, { delivery_date: e.target.value })} className="input-field" />
                  </Field>
                  <div className="flex items-end">
                    <button onClick={() => removeLine(index)} disabled={lines.length === 1} className="rounded-lg border border-gray-200 p-3 text-gray-500 hover:text-red-600 disabled:opacity-40">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="md:col-span-5 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm">
                    <span className="text-gray-500">Line Amount</span>
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
          <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
          <ReadinessCard ready={isReadyToSave} issues={readinessIssues} />
          <div className="rounded-lg bg-gray-900 px-4 py-3 text-white">
            <div className="text-xs uppercase tracking-wide text-gray-300">Draft Subtotal</div>
            <div className="mt-1 text-2xl font-semibold">{formatCurrency(total)}</div>
          </div>
          <SummaryRow label="Valid Lines" value={String(validLineCount)} />
          <SummaryRow label="Draft Total" value={formatCurrency(total)} />
          <SummaryRow label="Order Date" value={transactionDate} />
          <SummaryRow label="Delivery Date" value={deliveryDate} />
          <p className="text-xs leading-5 text-gray-500">
            This creates a draft Sales Order through a whitelisted backend method and then opens the detail screen.
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
  loading,
  fields,
}: {
  sourceType: string | null;
  sourceName: string | null;
  loading?: boolean;
  fields: Array<string | null>;
}) {
  const cleanFields = fields.filter(Boolean) as string[];
  const sourceLabel = sourceType === 'quotation' ? 'quotation' : 'upstream document';

  if (loading) {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 animate-pulse">
        Loading quotation {sourceName}…
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
      Prefilled from {sourceLabel}{sourceName ? ` ${sourceName}` : ''}
      {cleanFields.length > 0 ? ` with ${cleanFields.join(', ')}.` : '.'}
    </div>
  );
}
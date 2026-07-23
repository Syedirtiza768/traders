import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { currencyApi, gstApi, inventoryApi, purchasesApi, suppliersApi } from '../lib/api';
import ItemLineEntry, { type ItemLineEntryLine } from '../components/ItemLineEntry';
import { createEmptyEntryLine, entryLinesToPurchasePayload, salesPrefillToEntryLines } from '../lib/itemLineUtils';
import { useCompanyStore } from '../stores/companyStore';
import { getPurchaseInvoiceTypeConfig, pickExemptTaxTemplate } from '../lib/invoiceTypes';
import { appendPreservedListQuery, formatCurrency, isOperationsContext } from '../lib/utils';
import SearchableSelect from '../components/SearchableSelect';
import useQuickAdd from '../components/useQuickAdd';
import QuickAddProvider from '../components/QuickAddProvider';
import { PageHeader, AlertBanner } from '../components/ui';

export default function CreatePurchaseInvoicePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplier, setSupplier] = useState('');
  const [postingDate, setPostingDate] = useState(today());
  const [dueDate, setDueDate] = useState(today());
  const [lines, setLines] = useState<ItemLineEntryLine[]>(() => [createEmptyEntryLine()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taxTemplates, setTaxTemplates] = useState<any[]>([]);
  const [taxTemplate, setTaxTemplate] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const invoiceTypeKey = searchParams.get('type') || 'tax_invoice';
  const typeConfig = getPurchaseInvoiceTypeConfig(invoiceTypeKey);
  const sourceType = searchParams.get('sourceType');
  const sourceName = searchParams.get('sourceName');
  const listSearch = searchParams.get('list');
  const prefillsLineCount = searchParams.get('lines') ? lines.filter((line) => line.item_code).length : 0;
  const backToPath = listSearch
    ? isOperationsContext(listSearch)
      ? `/operations?${listSearch}`
      : '/purchases'
    : '/purchases';
  const backLabel = listSearch && isOperationsContext(listSearch) ? 'Back to Operations' : 'Back to Purchases';
  const quickAdd = useQuickAdd();
  const [defaultWarehouse, setDefaultWarehouse] = useState('');
  const baseCurrency = useCompanyStore((s) => s.currency) || 'PKR';
  const [multiCurrencyOn, setMultiCurrencyOn] = useState(false);
  const [currency, setCurrency] = useState(baseCurrency);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [currencies, setCurrencies] = useState<{ name: string }[]>([]);
  const companyRevision = useCompanyStore((s) => s.revision);

  useEffect(() => {
    const supplierParam = searchParams.get('supplier');
    const postingDateParam = searchParams.get('postingDate') || searchParams.get('transactionDate');
    const dueDateParam = searchParams.get('dueDate') || searchParams.get('scheduleDate');
    const linesParam = searchParams.get('lines');

    if (supplierParam) setSupplier(supplierParam);
    if (postingDateParam) setPostingDate(postingDateParam);
    if (dueDateParam) setDueDate(dueDateParam);
    if (linesParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(linesParam));
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLines(salesPrefillToEntryLines(parsed, defaultWarehouse));
        }
      } catch (err) {
        console.error('Failed to parse purchase invoice line prefills:', err);
      }
    }
  }, [searchParams, defaultWarehouse]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [suppliersRes, taxRes, warehousesRes, currencyRes] = await Promise.all([
          suppliersApi.getList({ page: 1, page_size: 100 }),
          gstApi.getTaxTemplates('Purchase'),
          inventoryApi.getWarehouses(),
          currencyApi.getOptions(),
        ]);
        setSuppliers(suppliersRes.data.message?.data || []);
        const warehouseRows = warehousesRes.data.message || [];
        const mainWh = warehouseRows.find((w: any) => /main warehouse/i.test(w.warehouse_name || w.warehouse || ''))
          || warehouseRows[0];
        const wh = mainWh?.warehouse || '';
        setDefaultWarehouse(wh);
        setLines((current) => current.map((line) => ({ ...line, warehouse: line.warehouse || wh })));
        const curMsg = currencyRes.data.message || {};
        const multiOn = Boolean(curMsg.multi_currency_enabled);
        setMultiCurrencyOn(multiOn);
        setCurrencies(curMsg.currencies || []);
        setCurrency(curMsg.base_currency || baseCurrency);
        setExchangeRate(1);
        const templates = taxRes.data.message?.templates || taxRes.data.message || [];
        setTaxTemplates(templates);
        if (typeConfig.noTaxByDefault) {
          setTaxTemplate('');
          setTaxRate(0);
        } else if (typeConfig.useExemptTax) {
          const exempt = pickExemptTaxTemplate(templates);
          setTaxTemplate(exempt);
          const tpl = templates.find((t: any) => t.name === exempt);
          setTaxRate(tpl ? parseFloat(tpl.total_tax_rate || tpl.tax_rate || 0) : 0);
        } else {
          const defaultTpl = templates.find((t: any) => t.is_default);
          if (defaultTpl) {
            setTaxTemplate(defaultTpl.name);
            setTaxRate(parseFloat(defaultTpl.total_tax_rate || defaultTpl.tax_rate || 0));
          }
        }
      } catch (err) {
        console.error('Failed to load purchase form data:', err);
        setError('Could not load suppliers and items for invoice creation.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [invoiceTypeKey, companyRevision, baseCurrency]);

  useEffect(() => {
    if (!multiCurrencyOn || !currency || currency === baseCurrency) {
      setExchangeRate(1);
      return;
    }
    const loadRate = async () => {
      try {
        const res = await currencyApi.getExchangeRate(currency, postingDate, 'buying');
        setExchangeRate(Number(res.data.message?.exchange_rate) || 1);
      } catch {
        setExchangeRate(1);
      }
    };
    void loadRate();
  }, [currency, baseCurrency, postingDate, multiCurrencyOn]);

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.qty) || 0) * (Number(line.rate) || 0), 0),
    [lines],
  );
  const taxAmount = useMemo(() => {
    if (!taxRate) return 0;
    if (taxInclusive) return total - total / (1 + taxRate / 100);
    return total * taxRate / 100;
  }, [total, taxRate, taxInclusive]);
  const grandTotal = useMemo(() => taxInclusive ? total : total + taxAmount, [total, taxAmount, taxInclusive]);
  const validLineCount = useMemo(
    () => lines.filter((line) => line.item_code && Number(line.qty) > 0).length,
    [lines],
  );
  const readinessChecks = useMemo(
    () => [
      { label: 'Supplier selected', passed: Boolean(supplier) },
      { label: 'At least one valid item line', passed: validLineCount > 0 },
    ],
    [supplier, validLineCount],
  );
  const readinessIssues = readinessChecks.filter((check) => !check.passed).map((check) => check.label);
  const isReadyToSave = readinessIssues.length === 0;

  const handleTaxTemplateChange = (templateName: string) => {
    setTaxTemplate(templateName);
    const tpl = taxTemplates.find((t: any) => t.name === templateName);
    setTaxRate(tpl ? parseFloat(tpl.total_tax_rate || tpl.tax_rate || 0) : 0);
  };

  const handleSubmit = async () => {
    if (!supplier) {
      setError('Please select a supplier before creating the invoice.');
      return;
    }

    const validLines = entryLinesToPurchasePayload(lines, defaultWarehouse);
    if (validLines.length === 0) {
      setError('Add at least one valid item line.');
      return;
    }

    const seenSerials = new Map<string, number>();
    for (let i = 0; i < lines.length; i++) {
      const serial = lines[i].serial_no?.trim();
      if (serial) {
        const prior = seenSerials.get(serial.toLowerCase());
        if (prior !== undefined) {
          setError(`Duplicate serial ${serial} on lines ${prior + 1} and ${i + 1}.`);
          return;
        }
        seenSerials.set(serial.toLowerCase(), i);
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.item_code || !line.serial_no?.trim()) continue;
      try {
        const res = await inventoryApi.validateSerialForPurchase({
          item_code: line.item_code,
          serial_no: line.serial_no.trim(),
        });
        const result = res.data.message;
        if (!result?.valid) {
          const msg = result?.message || 'Invalid serial.';
          setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, serial_error: msg } : l)));
          setError(`${msg} (line ${i + 1})`);
          return;
        }
      } catch {
        const msg = 'Could not validate serial.';
        setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, serial_error: msg } : l)));
        setError(`${msg} (line ${i + 1})`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const response = await purchasesApi.createInvoice({
        supplier,
        posting_date: postingDate,
        due_date: dueDate,
        items: validLines,
        taxes_and_charges: taxTemplate || undefined,
        tax_inclusive: taxInclusive ? 1 : 0,
        invoice_type: invoiceTypeKey,
        currency: currency !== baseCurrency ? currency : undefined,
        exchange_rate: currency !== baseCurrency ? exchangeRate : undefined,
      });
      const created = response.data.message;
      navigate(appendPreservedListQuery(`/purchases/${encodeURIComponent(created.name)}`, listSearch));
    } catch (err: any) {
      console.error('Failed to create purchase invoice:', err);
      const data = err?.response?.data;
      let message = 'Could not create purchase invoice.';
      if (data) {
        if (data.exception) {
          // Strip the Python exception class prefix if present, e.g. "frappe.exceptions.ValidationError: ..."
          message = String(data.exception).replace(/^[\w.]+Error:\s*/i, '').trim() || message;
        } else if (data.message) {
          message = String(data.message);
        } else if (data._server_messages) {
          try {
            const msgs = JSON.parse(data._server_messages) as string[];
            const parsed = msgs.map((m) => { try { return JSON.parse(m).message; } catch { return m; } });
            message = parsed.filter(Boolean).join(' ') || message;
          } catch { /* fallback to generic */ }
        }
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <button onClick={() => navigate(backToPath)} className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
        <ArrowLeft size={16} /> {backLabel}
      </button>

      <PageHeader
        title={`New ${typeConfig.label}`}
        description="Create a draft purchase invoice using the existing ERPNext workflow."
        actions={
          <button onClick={handleSubmit} disabled={saving || loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
            <Save size={14} /> {saving ? 'Creating…' : 'Create Draft'}
          </button>
        }
      />

      {error && <AlertBanner tone="error">{error}</AlertBanner>}

      {(sourceType || sourceName) && (
        <PrefillBanner
          sourceType={sourceType}
          sourceName={sourceName}
          fields={[
            supplier ? 'supplier' : null,
            postingDate ? 'posting date' : null,
            dueDate ? 'due date' : null,
            prefillsLineCount > 0 ? `${prefillsLineCount} item line${prefillsLineCount === 1 ? '' : 's'}` : null,
          ]}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            <Field label="Posting Date">
              <input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} className="input-field" />
            </Field>
            <Field label="Due Date">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" />
            </Field>
            {multiCurrencyOn && (
              <>
                <Field label="Currency">
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input-field text-sm">
                    {currencies.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                {currency !== baseCurrency && (
                  <Field label={`FX rate (→ ${baseCurrency})`}>
                    <input
                      type="number"
                      min={0}
                      step="0.0001"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(Number(e.target.value) || 1)}
                      className="input-field text-sm"
                    />
                  </Field>
                )}
              </>
            )}
            {!typeConfig.hideTaxPicker && (
              <Field label="Tax Template">
                <SearchableSelect
                  value={taxTemplate}
                  onChange={handleTaxTemplateChange}
                  options={[
                    { label: 'No Tax', value: '' },
                    ...taxTemplates.map((t: any) => ({ label: `${t.title || t.name} (${parseFloat(t.total_tax_rate || t.tax_rate || 0)}%)`, value: t.name })),
                  ]}
                  placeholder="Select tax template"
                />
              </Field>
            )}
          </div>

          {taxTemplate && taxRate > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Tax Mode</span>
              <button
                onClick={() => setTaxInclusive(false)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  !taxInclusive ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                Exclusive
              </button>
              <button
                onClick={() => setTaxInclusive(true)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  taxInclusive ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                Inclusive
              </button>
              <span className="text-xs text-gray-400 ml-1">
                {taxInclusive ? 'Rates entered include tax' : 'Tax added on top of rates'}
              </span>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Invoice Items</h2>
            <ItemLineEntry
              lines={lines}
              onChange={setLines}
              priceContext="purchase"
              invoiceLayout
              disabled={loading || saving}
              defaultWarehouse={defaultWarehouse}
              minLines={1}
              serialMode="purchase"
              showLineIssues
            />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
          <ReadinessCard ready={isReadyToSave} issues={readinessIssues} />
          <div className="rounded-lg bg-gray-900 px-4 py-3 text-white">
            <div className="text-xs uppercase tracking-wide text-gray-300">Draft Grand Total</div>
            <div className="mt-1 text-2xl font-semibold">{formatCurrency(grandTotal)}</div>
          </div>
          <SummaryRow label="Valid Lines" value={String(validLineCount)} />
          {taxInclusive && taxRate > 0 ? (
            <>
              <SummaryRow label="Entered Total (incl. tax)" value={formatCurrency(total)} />
              <SummaryRow label={`GST (${taxRate}%) included`} value={formatCurrency(taxAmount)} />
              <SummaryRow label="Net Total (excl. tax)" value={formatCurrency(total - taxAmount)} />
            </>
          ) : (
            <>
              <SummaryRow label="Net Total" value={formatCurrency(total)} />
              {taxRate > 0 && (
                <SummaryRow label={`Tax (${taxRate}%)`} value={formatCurrency(taxAmount)} />
              )}
            </>
          )}
          <SummaryRow label="Grand Total" value={formatCurrency(grandTotal)} />
          <SummaryRow label="Posting Date" value={postingDate} />
          <SummaryRow label="Due Date" value={dueDate} />
          <p className="text-xs leading-5 text-gray-500">
            This creates a draft Purchase Invoice through the existing whitelisted backend method and then opens the detail screen.
          </p>
        </div>
      </div>

      <QuickAddProvider
        quickAdd={quickAdd}
        suppliersSetter={setSuppliers}
        supplierValueSetter={setSupplier}
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
      <label className="label-field">{label}</label>
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
        <p className="mt-1 text-xs text-emerald-700">Required supplier and item line checks are satisfied.</p>
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
  const sourceLabel = sourceType === 'purchase-order' ? 'purchase order' : 'upstream document';

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
      Prefilled from {sourceLabel}{sourceName ? ` ${sourceName}` : ''}
      {cleanFields.length > 0 ? ` with ${cleanFields.join(', ')}.` : '.'}
    </div>
  );
}
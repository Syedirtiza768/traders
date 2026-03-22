import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { gstApi, inventoryApi, purchasesApi, suppliersApi } from '../lib/api';
import { appendPreservedListQuery, formatCurrency, isOperationsContext } from '../lib/utils';
import SearchableSelect from '../components/SearchableSelect';
import useQuickAdd from '../components/useQuickAdd';
import QuickAddProvider from '../components/QuickAddProvider';

type RfqLine = { item_code: string; qty: number; rate: number; material_request?: string };
const EMPTY_LINE: RfqLine = { item_code: '', qty: 1, rate: 0, material_request: '' };

export default function CreateSupplierQuotationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [supplier, setSupplier] = useState('');
  const [materialRequest, setMaterialRequest] = useState(searchParams.get('materialRequest') || '');
  const [postingDate, setPostingDate] = useState(searchParams.get('postingDate') || today());
  const [validTill, setValidTill] = useState(today());
  const [lines, setLines] = useState<RfqLine[]>([{ ...EMPTY_LINE, material_request: materialRequest }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taxTemplates, setTaxTemplates] = useState<any[]>([]);
  const [taxTemplate, setTaxTemplate] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const listSearch = searchParams.get('list');
  const backToPath = listSearch ? (isOperationsContext(listSearch) ? `/operations?${listSearch}` : '/purchases/rfqs') : '/purchases/rfqs';
  const backLabel = listSearch && isOperationsContext(listSearch) ? 'Back to Operations' : 'Back to RFQs';
  const quickAdd = useQuickAdd();
  const quickAddItemLine = useRef<number>(-1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [suppliersRes, itemsRes, taxRes] = await Promise.all([
          suppliersApi.getList({ page: 1, page_size: 100 }),
          inventoryApi.getItems({ page: 1, page_size: 100 }),
          gstApi.getTaxTemplates('Purchase'),
        ]);
        setSuppliers(suppliersRes.data.message?.data || []);
        setItems(itemsRes.data.message?.data || []);
        const templates = taxRes.data.message?.templates || taxRes.data.message || [];
        setTaxTemplates(templates);
        const defaultTpl = templates.find((t: any) => t.is_default);
        if (defaultTpl) {
          setTaxTemplate(defaultTpl.name);
          setTaxRate(parseFloat(defaultTpl.total_tax_rate || defaultTpl.tax_rate || 0));
        }
      } catch (err) {
        console.error('Failed to load RFQ form data:', err);
        setError('Could not load suppliers and items for RFQ creation.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const total = useMemo(() => lines.reduce((sum, line) => sum + (Number(line.qty) || 0) * (Number(line.rate) || 0), 0), [lines]);
  const taxAmount = useMemo(() => {
    if (!taxRate) return 0;
    if (taxInclusive) return total - total / (1 + taxRate / 100);
    return total * taxRate / 100;
  }, [total, taxRate, taxInclusive]);
  const grandTotal = useMemo(() => taxInclusive ? total : total + taxAmount, [total, taxAmount, taxInclusive]);
  const updateLine = (index: number, patch: Partial<RfqLine>) => setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const addLine = () => setLines((current) => [...current, { ...EMPTY_LINE, material_request: materialRequest }]);
  const removeLine = (index: number) => setLines((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current));
  const handleItemChange = (index: number, itemCode: string) => {
    const selected = items.find((item) => item.item_code === itemCode || item.name === itemCode);
    updateLine(index, { item_code: itemCode, rate: selected?.last_purchase_rate ?? selected?.valuation_rate ?? selected?.standard_rate ?? 0 });
  };

  const handleTaxTemplateChange = (templateName: string) => {
    setTaxTemplate(templateName);
    const tpl = taxTemplates.find((t: any) => t.name === templateName);
    setTaxRate(tpl ? parseFloat(tpl.total_tax_rate || tpl.tax_rate || 0) : 0);
  };

  const handleSubmit = async () => {
    if (!supplier) {
      setError('Please select a supplier before creating the RFQ.');
      return;
    }
    const validLines = lines.filter((line) => line.item_code && Number(line.qty) > 0);
    if (validLines.length === 0) {
      setError('Add at least one valid RFQ line.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await purchasesApi.createRfq({
        supplier,
        transaction_date: postingDate,
        valid_till: validTill,
        material_request: materialRequest || undefined,
        items: validLines,
        taxes_and_charges: taxTemplate || undefined,
        tax_inclusive: taxInclusive ? 1 : 0,
      });
      const created = response.data.message;
      navigate(appendPreservedListQuery(`/purchases/rfqs/${encodeURIComponent(created.name)}`, listSearch));
    } catch (err: any) {
      console.error('Failed to create supplier quotation:', err);
      setError(err?.response?.data?.exception || 'Could not create supplier quotation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate(backToPath)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800"><ArrowLeft size={16} /> {backLabel}</button>
          <h1 className="page-title">New Supplier Quotation</h1>
          <p className="mt-1 text-gray-500">Create an RFQ draft from a requisition or directly for a supplier.</p>
        </div>
        <button onClick={handleSubmit} disabled={saving || loading} className="btn-primary flex items-center gap-2 disabled:opacity-60"><Save size={14} /> {saving ? 'Creating…' : 'Create Draft'}</button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label="Supplier"><SearchableSelect value={supplier} onChange={setSupplier} options={suppliers.map((e) => ({ label: e.supplier_name || e.name, value: e.name }))} placeholder="Select supplier" disabled={loading} creatable onCreateNew={(query) => quickAdd.open('supplier', query)} /></Field>
            <Field label="Material Request"><input value={materialRequest} onChange={(e) => { const next = e.target.value; setMaterialRequest(next); setLines((current) => current.map((line) => ({ ...line, material_request: line.material_request || next }))); }} className="input-field" placeholder="Optional requisition" /></Field>
            <Field label="RFQ Date"><input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} className="input-field" /></Field>
            <Field label="Valid Till"><input type="date" value={validTill} onChange={(e) => setValidTill(e.target.value)} className="input-field" /></Field>
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
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-gray-900">RFQ Items</h2><button onClick={addLine} className="btn-secondary flex items-center gap-2"><Plus size={14} /> Add Line</button></div>
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                  <Field label="Item"><SearchableSelect value={line.item_code} onChange={(v) => handleItemChange(index, v)} options={items.map((e) => ({ label: e.item_name || e.item_code || e.name, value: e.item_code || e.name }))} placeholder="Select item" disabled={loading} creatable onCreateNew={(query) => { quickAddItemLine.current = index; quickAdd.open('item', query); }} /></Field>
                  <Field label="Qty"><input type="number" min={1} step="0.01" value={line.qty} onChange={(e) => updateLine(index, { qty: Number(e.target.value) })} className="input-field" /></Field>
                  <Field label="Rate"><input type="number" min={0} step="0.01" value={line.rate} onChange={(e) => updateLine(index, { rate: Number(e.target.value) })} className="input-field" /></Field>
                  <Field label="Req Link"><input value={line.material_request || ''} onChange={(e) => updateLine(index, { material_request: e.target.value })} className="input-field" placeholder="Material Request" /></Field>
                  <div className="flex items-end"><button onClick={() => removeLine(index)} disabled={lines.length === 1} className="rounded-lg border border-gray-200 p-3 text-gray-500 hover:text-red-600 disabled:opacity-40"><Trash2 size={16} /></button></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
          <div className="rounded-lg bg-gray-900 px-4 py-3 text-white">
            <div className="text-xs uppercase tracking-wide text-gray-300">Draft Grand Total</div>
            <div className="mt-1 text-2xl font-semibold">{formatCurrency(grandTotal)}</div>
          </div>
          <SummaryRow label="Valid Lines" value={String(lines.filter((line) => line.item_code).length)} />
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
          <SummaryRow label="RFQ Date" value={postingDate} />
          <SummaryRow label="Valid Till" value={validTill} />
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

function today() { return new Date().toISOString().slice(0, 10); }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="block"><span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>{children}</div>; }
function SummaryRow({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between text-sm"><span className="text-gray-500">{label}</span><span className="font-medium text-gray-900">{value}</span></div>; }
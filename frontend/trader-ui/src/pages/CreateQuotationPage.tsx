import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { customersApi, gstApi, inventoryApi, opportunityApi, salesApi } from '../lib/api';
import { appendPreservedListQuery, formatCurrency } from '../lib/utils';
import SearchableSelect from '../components/SearchableSelect';
import useQuickAdd from '../components/useQuickAdd';
import QuickAddProvider from '../components/QuickAddProvider';
import CommercialHierarchyEditor, { type CommercialOption } from '../components/CommercialHierarchyEditor';
import { useCompanyStore } from '../stores/companyStore';

type QuotationLine = {
  item_code: string;
  description: string;
  qty: number;
  rate: number;
};

const EMPTY_LINE: QuotationLine = { item_code: '', description: '', qty: 1, rate: 0 };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyHierarchy(): CommercialOption[] {
  return [
    {
      line_no: 1,
      client_requirements: '',
      option_no: 1,
      option_text: '',
      package_qty: 1,
      items: [{ item_code: '', unit_qty: 1, unit_price: 0, discount_percent: 0 }],
    },
  ];
}

export default function CreateQuotationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const opportunityEnabled = useCompanyStore((s) => s.opportunityEnabled);
  const isProforma = location.pathname.includes('/proforma/') || searchParams.get('type') === 'proforma_invoice';
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [project, setProject] = useState(searchParams.get('opportunity') || searchParams.get('project') || '');
  const [customer, setCustomer] = useState('');
  const [customerRef, setCustomerRef] = useState('');
  const [terms, setTerms] = useState('');
  const [transactionDate, setTransactionDate] = useState(today());
  const [validTill, setValidTill] = useState(today());
  const [lines, setLines] = useState<QuotationLine[]>([{ ...EMPTY_LINE }]);
  const [hierarchy, setHierarchy] = useState<CommercialOption[]>(emptyHierarchy());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taxTemplates, setTaxTemplates] = useState<any[]>([]);
  const [taxTemplate, setTaxTemplate] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const listSearch = searchParams.get('list');
  const quickAdd = useQuickAdd();
  const quickAddItemLine = useRef<number>(-1);
  const useHierarchy = opportunityEnabled && !isProforma;

  useEffect(() => {
    const customerParam = searchParams.get('customer');
    if (customerParam) setCustomer(customerParam);
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const jobs: Promise<any>[] = [
          customersApi.getList({ page: 1, page_size: 100 }),
          inventoryApi.getItems({ page: 1, page_size: 200 }),
          gstApi.getTaxTemplates('Sales'),
        ];
        if (opportunityEnabled) {
          jobs.push(opportunityApi.list({ page: 1, page_size: 100, status: 'Open' }));
          jobs.push(opportunityApi.getQuotationDefaults());
        }
        const results = await Promise.all(jobs);
        const [customersRes, itemsRes, taxRes] = results;
        setCustomers(customersRes.data.message?.data || []);
        setItems(itemsRes.data.message?.data || []);
        const templates = taxRes.data.message?.templates || taxRes.data.message || [];
        setTaxTemplates(templates);
        const defaultTpl = templates.find((t: any) => t.is_default);
        if (defaultTpl) {
          setTaxTemplate(defaultTpl.name);
          setTaxRate(parseFloat(defaultTpl.total_tax_rate || defaultTpl.tax_rate || 0));
        }
        if (opportunityEnabled) {
          const projectsRes = results[3];
          setProjects(projectsRes?.data?.message?.data || []);
          const defaults = results[4]?.data?.message || {};
          if (defaults.terms) setTerms(defaults.terms);
        }
      } catch (err) {
        console.error('Failed to load quotation form data:', err);
        setError('Could not load form data.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [opportunityEnabled]);

  useEffect(() => {
    if (!project) return;
    const selected = projects.find((p) => p.name === project);
    if (selected?.customer) setCustomer(selected.customer);
  }, [project, projects]);

  const flatTotal = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0),
    [lines],
  );
  const hierarchyBilled = useMemo(() => {
    const firstByLine = new Map<number, CommercialOption>();
    for (const opt of hierarchy) {
      const cur = firstByLine.get(opt.line_no);
      if (!cur || opt.option_no < cur.option_no) firstByLine.set(opt.line_no, opt);
    }
    return Array.from(firstByLine.values()).reduce((sum, opt) => {
      return (
        sum +
        opt.items.reduce((s, it) => {
          const qty = (Number(it.unit_qty) || 0) * (Number(opt.package_qty) || 1);
          const rate = Number(it.unit_price) || 0;
          const discount = Number(it.discount_percent) || 0;
          return s + qty * rate * (1 - discount / 100);
        }, 0)
      );
    }, 0);
  }, [hierarchy]);

  const total = useHierarchy ? hierarchyBilled : flatTotal;
  const taxAmount = useMemo(() => {
    if (!taxRate) return 0;
    if (taxInclusive) return total - total / (1 + taxRate / 100);
    return (total * taxRate) / 100;
  }, [total, taxRate, taxInclusive]);
  const grandTotal = useMemo(() => (taxInclusive ? total : total + taxAmount), [total, taxAmount, taxInclusive]);

  const validLineCount = useMemo(
    () => lines.filter((l) => l.item_code && Number(l.qty) > 0).length,
    [lines],
  );
  const validHierarchy = useMemo(
    () =>
      hierarchy.some(
        (opt) => opt.items.some((it) => it.item_code && Number(it.unit_qty) > 0) && Number(opt.package_qty) > 0,
      ),
    [hierarchy],
  );
  const isReadyToSave = useHierarchy
    ? Boolean(project) && validHierarchy
    : Boolean(customer) && validLineCount > 0;

  const updateLine = (index: number, patch: Partial<QuotationLine>) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const handleItemChange = (index: number, itemCode: string) => {
    const selected = items.find((item) => item.item_code === itemCode || item.name === itemCode);
    updateLine(index, {
      item_code: itemCode,
      description: selected?.description || selected?.item_name || '',
      rate: selected?.selling_price ?? selected?.standard_rate ?? 0,
    });
  };

  const handleTaxTemplateChange = (templateName: string) => {
    setTaxTemplate(templateName);
    const tpl = taxTemplates.find((t: any) => t.name === templateName);
    setTaxRate(tpl ? parseFloat(tpl.total_tax_rate || tpl.tax_rate || 0) : 0);
  };

  const handleSubmit = async () => {
    if (useHierarchy && !project) {
      setError('Select a Project before creating the quotation.');
      return;
    }
    if (!useHierarchy && !customer) {
      setError('Please select a customer.');
      return;
    }
    if (useHierarchy && !validHierarchy) {
      setError('Add at least one commercial option with an item.');
      return;
    }
    if (!useHierarchy && validLineCount === 0) {
      setError('Add at least one valid item line.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (useHierarchy) {
        const commercial_options = hierarchy
          .map((opt) => ({
            ...opt,
            items: opt.items.filter((it) => it.item_code.trim()),
          }))
          .filter((opt) => opt.items.length > 0);
        const response = await opportunityApi.createQuotation(project, {
          transaction_date: transactionDate,
          valid_till: validTill,
          customer_ref: customerRef || undefined,
          terms: terms || undefined,
          taxes_and_charges: taxTemplate || undefined,
          commercial_options,
        });
        const created = response.data.message;
        navigate(appendPreservedListQuery(`/sales/quotations/${encodeURIComponent(created.name)}`, listSearch));
        return;
      }

      const validLines = lines.filter((l) => l.item_code && Number(l.qty) > 0);
      const response = await salesApi.createQuotation({
        customer,
        transaction_date: transactionDate,
        valid_till: validTill,
        items: validLines.map((l) => ({
          item_code: l.item_code,
          description: l.description || undefined,
          qty: l.qty,
          rate: l.rate,
        })),
        taxes_and_charges: taxTemplate || undefined,
        tax_inclusive: taxInclusive ? 1 : 0,
        invoice_type: isProforma ? 'proforma_invoice' : 'quotation',
      });
      const created = response.data.message;
      navigate(appendPreservedListQuery(`/sales/quotations/${encodeURIComponent(created.name)}`, listSearch));
    } catch (err: any) {
      console.error('Failed to create quotation:', err);
      setError(err?.response?.data?.exception || err?.response?.data?.message || 'Could not create quotation.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="card card-body text-sm text-gray-500">Loading quotation form…</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          onClick={() => navigate(appendPreservedListQuery('/sales/quotations', listSearch))}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{isProforma ? 'New Proforma' : 'New Quotation'}</h1>
          <p className="text-sm text-gray-500">
            {useHierarchy
              ? 'Create from a Project with commercial Line → Option → Item hierarchy.'
              : 'Create a sales quotation.'}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="card">
        <div className="card-body grid gap-4 sm:grid-cols-2">
          {useHierarchy ? (
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Project *</span>
              <SearchableSelect
                value={project}
                onChange={setProject}
                options={projects.map((p) => ({
                  value: p.name,
                  label: `${p.name}${p.customer_name || p.customer ? ` — ${p.customer_name || p.customer}` : ''}`,
                }))}
                placeholder="Select project"
                creatable
                onCreateNew={() => navigate('/sales/opportunities')}
              />
            </label>
          ) : (
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Customer *</span>
              <SearchableSelect
                value={customer}
                onChange={setCustomer}
                options={customers.map((c) => ({
                  value: c.name,
                  label: c.customer_name || c.name,
                }))}
                placeholder="Select customer"
                creatable
                onCreateNew={() => quickAdd.open('customer')}
              />
            </label>
          )}

          {useHierarchy ? (
            <div className="sm:col-span-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              Customer: <span className="font-medium text-gray-900">{customer || '—'}</span>
            </div>
          ) : null}

          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Customer Ref</span>
            <input className="input-field" value={customerRef} onChange={(e) => setCustomerRef(e.target.value)} placeholder="e.g. 1000009032" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Date</span>
            <input className="input-field" type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Valid Till</span>
            <input className="input-field" type="date" value={validTill} onChange={(e) => setValidTill(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Tax Template</span>
            <select className="input-field" value={taxTemplate} onChange={(e) => handleTaxTemplateChange(e.target.value)}>
              <option value="">None</option>
              {taxTemplates.map((t: any) => (
                <option key={t.name} value={t.name}>
                  {t.title || t.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {useHierarchy ? (
        <CommercialHierarchyEditor
          draft
          value={hierarchy}
          onChange={setHierarchy}
          itemOptions={items}
          onQuickAddItem={() => quickAdd.open('item')}
        />
      ) : (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Items</h2>
            <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => setLines((c) => [...c, { ...EMPTY_LINE }])}>
              <Plus className="h-4 w-4" /> Add line
            </button>
          </div>
          <div className="card-body space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2 rounded-lg border border-gray-200 p-3 md:grid-cols-12">
                <div className="md:col-span-4">
                  <SearchableSelect
                    value={line.item_code}
                    onChange={(v) => handleItemChange(index, v)}
                    options={items.map((it) => ({ value: it.item_code || it.name, label: it.item_code || it.name }))}
                    placeholder="Item"
                    creatable
                    onCreateNew={() => {
                      quickAddItemLine.current = index;
                      quickAdd.open('item');
                    }}
                  />
                </div>
                <input
                  className="input-field md:col-span-3"
                  value={line.description}
                  onChange={(e) => updateLine(index, { description: e.target.value })}
                  placeholder="Description"
                />
                <input
                  className="input-field md:col-span-2"
                  type="number"
                  value={line.qty}
                  onChange={(e) => updateLine(index, { qty: Number(e.target.value) || 0 })}
                />
                <input
                  className="input-field md:col-span-2"
                  type="number"
                  value={line.rate}
                  onChange={(e) => updateLine(index, { rate: Number(e.target.value) || 0 })}
                />
                <button type="button" className="md:col-span-1 text-red-600" onClick={() => setLines((c) => (c.length > 1 ? c.filter((_, i) => i !== index) : c))}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Terms & Conditions</h2>
        </div>
        <div className="card-body">
          <textarea
            className="input-field min-h-[160px] font-mono text-sm"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Terms & conditions"
          />
        </div>
      </div>

      <div className="card">
        <div className="card-body flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600 space-y-1">
            <div>Net: {formatCurrency(total)}</div>
            {taxRate > 0 ? <div>Tax ({taxRate}%): {formatCurrency(taxAmount)}</div> : null}
            <div className="text-base font-semibold text-gray-900">Grand Total: {formatCurrency(grandTotal)}</div>
          </div>
          <button type="button" className="btn-primary inline-flex items-center gap-2" disabled={!isReadyToSave || saving} onClick={handleSubmit}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Create Quotation'}
          </button>
        </div>
      </div>

      <QuickAddProvider
        state={quickAdd.state}
        onClose={quickAdd.close}
        onCreated={(opt, raw) => {
          if (quickAdd.state.entityType === 'customer') {
            quickAdd.onCreated(opt, setCustomers, setCustomer, raw);
          } else if (quickAdd.state.entityType === 'item') {
            quickAdd.onCreated(
              opt,
              setItems,
              (value) => {
                if (quickAddItemLine.current >= 0) handleItemChange(quickAddItemLine.current, value);
              },
              raw,
            );
          }
        }}
      />
    </div>
  );
}

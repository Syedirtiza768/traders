import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { inventoryApi, opportunityApi, salesApi } from '../lib/api';
import {
  appendPreservedListQuery,
  extractFrappeError,
  formatCurrency,
  getActiveCurrency,
} from '../lib/utils';
import useQuickAdd from '../components/useQuickAdd';
import QuickAddProvider from '../components/QuickAddProvider';
import CommercialHierarchyEditor, {
  type CommercialOption,
  type CreatedHierarchyItem,
} from '../components/CommercialHierarchyEditor';
import QuotationOrderDetailsForm, {
  EMPTY_ORDER_DETAILS,
  orderDetailsFromQuotation,
  type OrderDetails,
} from '../components/QuotationOrderDetailsForm';
import SearchableSelect from '../components/SearchableSelect';
import { computeCommercialTotals } from '../lib/commercialTotals';
import { useCompanyStore } from '../stores/companyStore';

type TabId =
  | 'basic'
  | 'boq'
  | 'description'
  | 'group-discount'
  | 'order-details'
  | 'preview'
  | 'save';

const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Basic Information' },
  { id: 'boq', label: 'Bill Of Quantities' },
  { id: 'description', label: 'Description' },
  { id: 'group-discount', label: 'Group Discount' },
  { id: 'order-details', label: 'Quotation Details' },
  { id: 'preview', label: 'Preview' },
  { id: 'save', label: 'Save' },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function emptyHierarchy(stockStatus = 'Ex-Stock (Subject to Prior Sale)'): CommercialOption[] {
  return [
    {
      line_no: 1,
      client_requirements: '',
      option_no: 1,
      option_text: '',
      package_qty: 1,
      stock_status: stockStatus,
      items: [{ item_code: '', unit_qty: 1, unit_price: 0, discount_percent: 0 }],
    },
  ];
}

function normalizeHierarchy(raw: unknown, fallbackStatus?: string): CommercialOption[] {
  if (!Array.isArray(raw) || raw.length === 0) return emptyHierarchy(fallbackStatus);
  return raw.map((row: any, idx: number) => ({
    line_no: Number(row.line_no) || idx + 1,
    client_requirements: row.client_requirements || '',
    option_no: Number(row.option_no) || 1,
    option_text: row.option_text || '',
    package_qty: Number(row.package_qty) || 1,
    stock_status: row.stock_status || fallbackStatus || '',
    items: Array.isArray(row.items) && row.items.length
      ? row.items.map((it: any) => ({
          item_code: it.item_code || '',
          description: it.description || '',
          unit_qty: Number(it.unit_qty) || 1,
          unit_price: Number(it.unit_price ?? it.rate) || 0,
          discount_percent: Number(it.discount_percent) || 0,
        }))
      : [{ item_code: '', unit_qty: 1, unit_price: 0, discount_percent: 0 }],
  }));
}

/**
 * Sahamid-style full-page tabbed quotation editor (makequotation.php parity).
 * Create: /sales/quotations/make?opportunity=...
 * Continue draft: /sales/quotations/:quotationId/edit
 */
export default function MakeQuotationPage() {
  const navigate = useNavigate();
  const { quotationId } = useParams();
  const [searchParams] = useSearchParams();
  const opportunityEnabled = useCompanyStore((s) => s.opportunityEnabled);
  const listSearch = searchParams.get('list');

  const [tab, setTab] = useState<TabId>('basic');
  const [projects, setProjects] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [project, setProject] = useState(searchParams.get('opportunity') || searchParams.get('project') || '');
  const [customer, setCustomer] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerRef, setCustomerRef] = useState('');
  const [terms, setTerms] = useState('');
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({ ...EMPTY_ORDER_DETAILS });
  const [transactionDate, setTransactionDate] = useState(today());
  const [validTill, setValidTill] = useState(today());
  const [hierarchy, setHierarchy] = useState<CommercialOption[]>(emptyHierarchy());
  const [quoteName, setQuoteName] = useState<string | null>(quotationId ? decodeURIComponent(quotationId) : null);
  const [docstatus, setDocstatus] = useState(0);
  const [revisionLabel, setRevisionLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [creditWarn, setCreditWarn] = useState<string | null>(null);
  const [draftConflict, setDraftConflict] = useState<{ name: string } | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const quickAdd = useQuickAdd();
  const [createdHierarchyItem, setCreatedHierarchyItem] = useState<CreatedHierarchyItem | null>(null);
  const saveTouched = useRef(false);

  const readOnly = docstatus !== 0;

  useEffect(() => {
    if (!opportunityEnabled) {
      navigate(appendPreservedListQuery('/sales/quotations/new', listSearch), { replace: true });
    }
  }, [opportunityEnabled, navigate, listSearch]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const jobs: Promise<any>[] = [
          inventoryApi.getItems({ page: 1, page_size: 200 }),
          inventoryApi.getWarehouses(),
          opportunityApi.list({ page: 1, page_size: 100, status: 'Open' }),
          opportunityApi.getQuotationDefaults(),
        ];
        if (quotationId) {
          jobs.push(salesApi.getQuotationDetail(decodeURIComponent(quotationId)));
        }
        const results = await Promise.all(jobs);
        const [itemsRes, whRes, projectsRes, defaultsRes] = results;
        setItems(itemsRes.data.message?.data || []);
        setWarehouses(
          Array.isArray(whRes.data.message) ? whRes.data.message : whRes.data.message?.data || [],
        );
        setProjects(projectsRes.data.message?.data || []);
        const defaults = defaultsRes.data.message || {};
        if (defaults.terms && !quotationId) setTerms(defaults.terms);
        const stock = defaults.order_details?.default_stock_status;

        if (quotationId) {
          const q = results[4].data.message;
          if (cint(q.docstatus) !== 0) {
            navigate(`/sales/quotations/${encodeURIComponent(q.name)}`, { replace: true });
            return;
          }
          setQuoteName(q.name);
          setDocstatus(Number(q.docstatus) || 0);
          setProject(q.trader_opportunity || '');
          setCustomer(q.party_name || q.customer || '');
          setCustomerName(q.customer_name || q.party_name || '');
          setCustomerRef(q.trader_customer_ref || '');
          setTerms(q.terms || defaults.terms || '');
          setTransactionDate(q.transaction_date || today());
          setValidTill(q.valid_till || today());
          setRevisionLabel(q.trader_revision_label || '');
          setOrderDetails(orderDetailsFromQuotation(q));
          setHierarchy(normalizeHierarchy(q.trader_commercial_options, stock));
        } else if (defaults.order_details) {
          setOrderDetails({
            ...EMPTY_ORDER_DETAILS,
            ...defaults.order_details,
            warehouse: defaults.warehouse || defaults.order_details.warehouse || '',
          });
          const days = Number(defaults.order_details.validity_days) || 5;
          setValidTill(addDays(today(), days));
          if (stock) setHierarchy(emptyHierarchy(stock));
        }
      } catch (err) {
        setError(extractFrappeError(err, 'Could not load quotation editor.'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [quotationId, navigate]);

  useEffect(() => {
    if (!project || quoteName) return;
    const selected = projects.find((p) => p.name === project);
    if (selected?.customer) {
      setCustomer(selected.customer);
      setCustomerName(selected.customer_name || selected.customer);
    }
    void (async () => {
      try {
        const res = await opportunityApi.get(project);
        const draft = res.data.message?.open_quotation_draft;
        setDraftConflict(draft && draft.name !== quoteName ? { name: draft.name } : null);
        const msg = res.data.message || {};
        const cust = msg.opportunity?.customer || msg.customer;
        if (cust) {
          setCustomer(cust);
          setCustomerName(msg.opportunity?.customer_name || msg.customer_name || cust);
        }
      } catch {
        setDraftConflict(null);
      }
    })();
  }, [project, projects, quoteName]);

  useEffect(() => {
    const days = Number(orderDetails.validity_days) || 0;
    if (days > 0 && transactionDate) setValidTill(addDays(transactionDate, days));
  }, [orderDetails.validity_days, transactionDate]);

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

  const commercial = useMemo(
    () =>
      computeCommercialTotals({
        net: hierarchyBilled,
        gst_mode: orderDetails.gst_mode,
        services: orderDetails.services,
        wht_percent: orderDetails.wht_percent,
        rate_clause: orderDetails.rate_clause,
        print_exchange: orderDetails.print_exchange,
        clause_rates: orderDetails.clause_rates,
      }),
    [hierarchyBilled, orderDetails],
  );

  useEffect(() => {
    if (!customer) {
      setCreditWarn(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await opportunityApi.getCustomerCreditCheck(customer, commercial.grand_total);
        if (!cancelled) {
          const msg = res.data.message;
          setCreditWarn(msg?.over_limit ? msg.message || 'Over credit limit.' : null);
        }
      } catch {
        if (!cancelled) setCreditWarn(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customer, commercial.grand_total]);

  const validHierarchy = useMemo(
    () =>
      hierarchy.some(
        (opt) => opt.items.some((it) => it.item_code && Number(it.unit_qty) > 0) && Number(opt.package_qty) > 0,
      ),
    [hierarchy],
  );

  const checkWarnings = () => {
    const w: string[] = [];
    if (!project) w.push('Select a Project (sales case).');
    if (draftConflict && !quoteName) w.push(`Open draft ${draftConflict.name} exists — Continue or Discard it.`);
    if (!validHierarchy) w.push('Add at least one line/option with an item and quantity.');
    const emptyOpts = hierarchy.filter((o) => !o.items.some((it) => it.item_code && Number(it.unit_qty) > 0));
    if (emptyOpts.length) w.push(`${emptyOpts.length} option(s) have no priced items.`);
    if (hierarchy.some((o) => Number(o.package_qty) <= 0)) w.push('One or more options have package qty = 0.');
    setWarnings(w);
    return w;
  };

  const persistDraft = async (): Promise<string | null> => {
    const commercial_options = hierarchy
      .map((opt) => ({
        ...opt,
        items: opt.items.filter((it) => it.item_code.trim()),
      }))
      .filter((opt) => opt.items.length > 0);

    if (quoteName) {
      await opportunityApi.saveQuotationOrderDetails(quoteName, {
        customer_ref: customerRef || undefined,
        terms: terms || undefined,
        transaction_date: transactionDate,
        valid_till: validTill,
        order_details: orderDetails,
      });
      await opportunityApi.saveCommercialOptions('Quotation', quoteName, commercial_options);
      return quoteName;
    }

    const response = await opportunityApi.createQuotation(project, {
      transaction_date: transactionDate,
      valid_till: validTill,
      customer_ref: customerRef || undefined,
      terms: terms || undefined,
      warehouse: orderDetails.warehouse || undefined,
      order_details: orderDetails,
      commercial_options,
    });
    const created = response.data.message;
    if (created?.existing_draft) {
      setDraftConflict({ name: created.name });
      throw new Error(created.message || 'An open draft already exists for this project.');
    }
    setQuoteName(created.name);
    navigate(
      appendPreservedListQuery(`/sales/quotations/${encodeURIComponent(created.name)}/edit`, listSearch),
      { replace: true },
    );
    return created.name as string;
  };

  const handleSave = async () => {
    const w = checkWarnings();
    if (w.length && !quoteName) {
      setError('Fix warnings before creating the quotation, or proceed from Save after addressing required fields.');
      if (!project || !validHierarchy || draftConflict) return;
    }
    if (!project) {
      setError('Select a Project before saving.');
      setTab('basic');
      return;
    }
    if (!validHierarchy) {
      setError('Add at least one commercial option with an item.');
      setTab('boq');
      return;
    }
    if (draftConflict && !quoteName) {
      setError('Continue or discard the open draft first.');
      setTab('basic');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    saveTouched.current = true;
    try {
      const name = await persistDraft();
      setSuccess(name ? `Quotation ${name} saved.` : 'Saved.');
      setPreviewKey((k) => k + 1);
      checkWarnings();
    } catch (err: any) {
      setError(extractFrappeError(err, err?.message || 'Could not save quotation.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitFinal = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const name = await persistDraft();
      if (!name) throw new Error('Nothing to submit.');
      await salesApi.submitQuotation(name);
      setSuccess(`Quotation ${name} submitted.`);
      navigate(appendPreservedListQuery(`/sales/quotations/${encodeURIComponent(name)}`, listSearch));
    } catch (err) {
      setError(extractFrappeError(err, 'Could not submit quotation.'));
    } finally {
      setSubmitting(false);
    }
  };

  const backPath = project
    ? `/sales/opportunities/${encodeURIComponent(project)}`
    : appendPreservedListQuery('/sales/quotations', listSearch);

  if (loading) {
    return <div className="card card-body text-sm text-gray-500">Loading quotation editor…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            onClick={() => navigate(backPath)}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {quoteName ? `Quotation ${quoteName}` : 'Make Quotation'}
              {revisionLabel ? ` (${revisionLabel})` : ''}
            </h1>
            <p className="text-sm text-gray-500">
              Sahamid-style editor — Project {project || '—'} · {customerName || customer || 'Customer'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-gray-500">Value (billed)</p>
          <p className={`text-2xl font-semibold ${creditWarn ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(commercial.grand_total, getActiveCurrency())}
          </p>
          <p className="text-xs text-gray-500">
            Net {formatCurrency(commercial.net)}
            {commercial.gst_amount > 0 ? ` + GST ${formatCurrency(commercial.gst_amount)}` : ''}
            {commercial.wht_amount > 0 ? ` − WHT ${formatCurrency(commercial.wht_amount)}` : ''}
          </p>
          {creditWarn ? <p className="mt-1 text-xs text-red-600">{creditWarn}</p> : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{success}</div>
      ) : null}

      {draftConflict && !quoteName ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex flex-wrap items-center gap-3">
          <span>Open draft {draftConflict.name} exists for this project.</span>
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              navigate(`/sales/quotations/${encodeURIComponent(draftConflict.name)}/edit`)
            }
          >
            Continue
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              if (!window.confirm('Discard the open draft quotation? This deletes it.')) return;
              try {
                await opportunityApi.discardQuotationDraft(draftConflict.name);
                setDraftConflict(null);
              } catch (err) {
                setError(extractFrappeError(err, 'Could not discard draft.'));
              }
            }}
          >
            Discard
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto border-b border-gray-200">
        <nav className="flex min-w-max gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (t.id === 'save') checkWarnings();
                if (t.id === 'preview') setPreviewKey((k) => k + 1);
                setTab(t.id);
              }}
              className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="card">
        <div className="card-body space-y-4">
          {tab === 'basic' ? (
            <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
              <InfoRow label="Project / Sales Case" value={project || '—'} />
              <InfoRow label="Order #" value={quoteName || 'New Quotation'} />
              <InfoRow label="Client" value={customerName || customer || '—'} />
              <InfoRow label="Revision" value={revisionLabel || '—'} />
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
                  disabled={Boolean(quoteName) || readOnly}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">Customer Ref</span>
                <input
                  className="input-field"
                  disabled={readOnly}
                  value={customerRef}
                  onChange={(e) => setCustomerRef(e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">Quote Date</span>
                <input
                  className="input-field"
                  type="date"
                  disabled={readOnly}
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">Valid Till</span>
                <input
                  className="input-field"
                  type="date"
                  disabled={readOnly}
                  value={validTill}
                  onChange={(e) => setValidTill(e.target.value)}
                />
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-sm font-medium text-gray-700">Terms & Conditions</span>
                <textarea
                  className="input-field min-h-[140px] font-mono text-sm"
                  disabled={readOnly}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                />
              </label>
            </div>
          ) : null}

          {tab === 'boq' ? (
            <CommercialHierarchyEditor
              draft
              plain
              focus="boq"
              value={hierarchy}
              onChange={setHierarchy}
              readOnly={readOnly}
              warehouse={orderDetails.warehouse}
              itemOptions={items}
              currency={getActiveCurrency()}
              onQuickAddItem={({ prefill }) => quickAdd.open('item', prefill || '')}
              createdItem={createdHierarchyItem}
              onCreatedItemApplied={() => setCreatedHierarchyItem(null)}
            />
          ) : null}

          {tab === 'description' ? (
            <CommercialHierarchyEditor
              draft
              plain
              focus="description"
              value={hierarchy}
              onChange={setHierarchy}
              readOnly={readOnly}
            />
          ) : null}

          {tab === 'group-discount' ? (
            <CommercialHierarchyEditor
              draft
              plain
              focus="group-discount"
              value={hierarchy}
              onChange={setHierarchy}
              readOnly={readOnly}
              itemOptions={items}
            />
          ) : null}

          {tab === 'order-details' ? (
            <QuotationOrderDetailsForm
              plain
              value={orderDetails}
              onChange={setOrderDetails}
              warehouses={warehouses}
              readOnly={readOnly}
            />
          ) : null}

          {tab === 'preview' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    void (async () => {
                      try {
                        if (!readOnly) await persistDraft();
                        setPreviewKey((k) => k + 1);
                      } catch (err) {
                        setError(extractFrappeError(err, 'Save before preview.'));
                      }
                    })();
                  }}
                >
                  Render
                </button>
                {quoteName ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      navigate(`/print?doctype=Quotation&name=${encodeURIComponent(quoteName)}`)
                    }
                  >
                    Open full print
                  </button>
                ) : null}
              </div>
              {!quoteName ? (
                <p className="text-sm text-gray-500">
                  Save the quotation first (Save tab or Render) to load the print preview.
                </p>
              ) : (
                <iframe
                  key={previewKey}
                  title="Quotation preview"
                  className="h-[70vh] w-full rounded-lg border border-gray-200 bg-white"
                  src={`/print?doctype=Quotation&name=${encodeURIComponent(quoteName)}`}
                />
              )}
            </div>
          ) : null}

          {tab === 'save' ? (
            <div className="space-y-4 max-w-2xl">
              <p className="text-sm text-gray-600">
                Review warnings, save the draft, then submit to finalize (Sahamid Save tab).
              </p>
              {warnings.length ? (
                <ul className="list-disc space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
                  {warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  No structural warnings.
                </p>
              )}
              <div className="text-sm text-gray-700 space-y-1">
                <div>Net (1st options): {formatCurrency(commercial.net)}</div>
                {commercial.gst_amount > 0 ? (
                  <div>
                    GST {commercial.gst_mode} ({commercial.gst_rate}%): {formatCurrency(commercial.gst_amount)}
                  </div>
                ) : null}
                {commercial.wht_amount > 0 ? (
                  <div>WHT ({commercial.wht_percent}%): −{formatCurrency(commercial.wht_amount)}</div>
                ) : null}
                <div className="text-base font-semibold">Grand: {formatCurrency(commercial.grand_total)}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={readOnly || saving}
                  onClick={() => void handleSave()}
                >
                  <Save className="mr-2 inline h-4 w-4" />
                  {saving ? 'Saving…' : quoteName ? 'Save draft' : 'Create & save draft'}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={readOnly || submitting || !quoteName}
                  onClick={() => void handleSubmitFinal()}
                >
                  {submitting ? 'Submitting…' : 'Submit quotation'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => checkWarnings()}>
                  Check for warnings
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <QuickAddProvider
        quickAdd={quickAdd}
        itemsSetter={setItems}
        itemValueSetter={(value, raw) => {
          setCreatedHierarchyItem({
            item_code: value,
            description: raw?.description || raw?.item_name || '',
            unit_price: Number(raw?.standard_rate ?? raw?.selling_price ?? 0) || 0,
          });
        }}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-900">{value}</p>
    </div>
  );
}

function cint(v: unknown) {
  return Number(v) || 0;
}

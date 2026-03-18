import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, GitCompareArrows, Save, ShoppingCart, Truck } from 'lucide-react';
import { purchasesApi } from '../lib/api';
import { appendPreservedListQuery, classNames, extractFrappeError, formatCurrency, formatDate, getStatusColor, isOperationsContext } from '../lib/utils';

type SupplierQuotationDetail = Record<string, any>;

export default function SupplierQuotationDetailPage() {
  const navigate = useNavigate();
  const { rfqId } = useParams();
  const [searchParams] = useSearchParams();
  const [quotation, setQuotation] = useState<SupplierQuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingPo, setCreatingPo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!rfqId) {
        setError('Supplier quotation not found.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setFeedback(null);
      try {
        const response = await purchasesApi.getRfqDetail(decodeURIComponent(rfqId));
        setQuotation(response.data.message);
      } catch (err) {
        console.error('Failed to load supplier quotation detail:', err);
        setError('Could not load supplier quotation details at the moment.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [rfqId]);

  const reload = async () => {
    if (!rfqId) return;
    const response = await purchasesApi.getRfqDetail(decodeURIComponent(rfqId));
    setQuotation(response.data.message);
  };

  const handleSubmit = async () => {
    if (!quotation?.name) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await purchasesApi.submitRfq(quotation.name);
      await reload();
      setFeedback({ type: 'success', message: 'Supplier quotation submitted successfully.' });
    } catch (err) {
      console.error('Failed to submit supplier quotation:', err);
      setFeedback({ type: 'error', message: extractFrappeError(err, 'Could not submit this supplier quotation.') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePo = async () => {
    if (!quotation?.name) return;
    setCreatingPo(true);
    setFeedback(null);
    try {
      const response = await purchasesApi.createOrderFromRfq(quotation.name);
      const created = response.data.message;
      navigate(appendPreservedListQuery(`/purchases/orders/${encodeURIComponent(created.name)}`, listSearch));
    } catch (err) {
      console.error('Failed to create purchase order from supplier quotation:', err);
      setFeedback({ type: 'error', message: extractFrappeError(err, 'Could not create a purchase order from this quotation.') });
    } finally {
      setCreatingPo(false);
    }
  };

  const listSearch = searchParams.get('list');
  const backToListPath = listSearch
    ? isOperationsContext(listSearch)
      ? `/operations?${listSearch}`
      : `/purchases/rfqs?${listSearch}`
    : '/purchases/rfqs';
  const backLabel = listSearch && isOperationsContext(listSearch) ? 'Back to Operations' : 'Back to RFQs';

  const itemRows = useMemo(() => (Array.isArray(quotation?.items) ? quotation.items : []), [quotation]);
  const comparisonQuotes = useMemo(() => (Array.isArray(quotation?.comparison_quotes) ? quotation.comparison_quotes : []), [quotation]);
  const itemComparisons = quotation?.item_comparisons || {};
  const statusLabel = quotation?.status || (quotation?.docstatus === 0 ? 'Draft' : 'Open');

  const buildPoPrefillPath = () => {
    const params = new URLSearchParams();
    if (quotation?.supplier) params.set('supplier', quotation.supplier);
    if (quotation?.transaction_date) params.set('transactionDate', quotation.transaction_date);
    if (quotation?.valid_till) params.set('scheduleDate', quotation.valid_till);
    if (quotation?.name) params.set('sourceName', quotation.name);
    params.set('sourceType', 'supplier-quotation');
    if (Array.isArray(quotation?.items) && quotation.items.length > 0) {
      params.set('lines', encodeURIComponent(JSON.stringify(quotation.items.map((item: any) => ({
        item_code: item.item_code || '',
        qty: Number(item.qty) || 1,
        rate: Number(item.rate) || 0,
        schedule_date: quotation.valid_till || quotation.transaction_date || '',
      })))));
    }
    if (listSearch) params.set('list', listSearch);
    return `/purchases/orders/new?${params.toString()}`;
  };

  if (loading) {
    return <div className="flex justify-center py-16"><div className="spinner" /></div>;
  }

  if (error || !quotation) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(backToListPath)} className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </button>
        <div className="card p-8 text-center text-gray-500">{error || 'Supplier quotation not found.'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => navigate(backToListPath)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{quotation.name}</h1>
          <p className="mt-1 text-gray-500">Supplier quotation detail, comparison, and award workflow</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <span className={classNames('inline-flex rounded-full px-3 py-1 text-sm font-medium', getStatusColor(statusLabel))}>{statusLabel}</span>
          <div className="flex flex-wrap gap-2 justify-end">
            <button onClick={() => navigate(buildPoPrefillPath())} className="btn-secondary">
              Prefill PO
            </button>
            <button onClick={handleCreatePo} disabled={creatingPo} className="btn-primary disabled:opacity-60">
              {creatingPo ? 'Creating PO…' : 'Award and Create PO'}
            </button>
            {quotation.docstatus === 0 && (
              <button onClick={handleSubmit} disabled={submitting} className="btn-secondary disabled:opacity-60">
                {submitting ? 'Submitting…' : 'Submit RFQ'}
              </button>
            )}
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm ${feedback.type === 'success' ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailKPI icon={Truck} label="Supplier" value={quotation.supplier_name || quotation.supplier || '—'} tone="blue" />
        <DetailKPI icon={Calendar} label="RFQ Date" value={formatDate(quotation.transaction_date)} tone="green" />
        <DetailKPI icon={FileText} label="Valid Till" value={formatDate(quotation.valid_till)} tone="purple" />
        <DetailKPI icon={ShoppingCart} label="Quoted Total" value={formatCurrency(quotation.grand_total, quotation.currency)} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Quotation Overview</h2>
            <p className="text-sm text-gray-500">Supplier, requisition, and validity context</p>
          </div>
          <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoRow icon={Truck} label="Supplier" value={quotation.supplier_name || quotation.supplier || '—'} />
            <InfoRow icon={Calendar} label="RFQ Date" value={formatDate(quotation.transaction_date)} />
            <InfoRow icon={Calendar} label="Valid Till" value={formatDate(quotation.valid_till)} />
            <InfoRow icon={FileText} label="Material Request" value={quotation.material_request || '—'} />
            <InfoRow icon={ShoppingCart} label="Currency" value={quotation.currency || 'PKR'} />
            <InfoRow icon={GitCompareArrows} label="Comparable Quotes" value={String(comparisonQuotes.length)} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Award Summary</h2>
            <p className="text-sm text-gray-500">Quick actions to compare and convert</p>
          </div>
          <div className="card-body space-y-4">
            <SummaryLine label="Quoted Total" value={formatCurrency(quotation.grand_total, quotation.currency)} />
            <SummaryLine label="Items" value={String(itemRows.length)} />
            <SummaryLine label="Comparison Set" value={`${comparisonQuotes.length} quote${comparisonQuotes.length === 1 ? '' : 's'}`} />
            <p className="text-xs leading-5 text-gray-500">Use the comparison section below to inspect supplier rates for the same requisition, then award directly into a draft purchase order.</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Quoted Items</h2>
          <p className="text-sm text-gray-500">Items and negotiated pricing in this supplier quotation</p>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Item</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Qty</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Rate</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itemRows.map((item: any, index: number) => (
                <tr key={`${item.item_code || 'item'}-${index}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{item.item_code || '—'}</td>
                  <td className="px-6 py-3 text-right text-sm text-gray-900">{item.qty ?? 0}</td>
                  <td className="px-6 py-3 text-right text-sm text-gray-900">{formatCurrency(item.rate, quotation.currency)}</td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(item.amount, quotation.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Supplier Comparison</h2>
          <p className="text-sm text-gray-500">Competing quotations for the same requisition, grouped by item and rate</p>
        </div>
        <div className="card-body space-y-6">
          {comparisonQuotes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
              No comparable quotations were found for this RFQ yet.
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Quote</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {comparisonQuotes.map((row: any) => (
                      <tr key={row.name} className={`hover:bg-gray-50 transition-colors ${row.name === quotation.name ? 'bg-brand-50/40' : ''}`}>
                        <td className="px-6 py-3 text-sm font-medium text-brand-700">{row.name}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">{row.supplier_name || row.supplier || '—'}</td>
                        <td className="px-6 py-3 text-sm text-gray-500">{formatDate(row.transaction_date)}</td>
                        <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(row.grand_total, row.currency)}</td>
                        <td className="px-6 py-3"><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(row.status || (row.docstatus === 0 ? 'Draft' : 'Open'))}`}>{row.status || (row.docstatus === 0 ? 'Draft' : 'Open')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {Object.keys(itemComparisons).map((itemCode) => (
                <div key={itemCode}>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{itemCode}</h3>
                  <div className="table-container">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Quote</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Qty</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Rate</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(itemComparisons[itemCode] || []).map((row: any, index: number) => (
                          <tr key={`${row.parent}-${itemCode}-${index}`} className={`hover:bg-gray-50 transition-colors ${row.parent === quotation.name ? 'bg-brand-50/40' : ''}`}>
                            <td className="px-6 py-3 text-sm font-medium text-gray-900">{row.parent}</td>
                            <td className="px-6 py-3 text-right text-sm text-gray-900">{row.qty ?? 0}</td>
                            <td className="px-6 py-3 text-right text-sm text-gray-900">{formatCurrency(row.rate, quotation.currency)}</td>
                            <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(row.amount, quotation.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailKPI({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: 'blue' | 'green' | 'purple' | 'amber' }) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  } as const;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${toneClasses[tone]}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="rounded-xl border border-gray-100 p-4"><div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500"><Icon className="h-4 w-4" />{label}</div><div className="break-words text-sm text-gray-900">{value}</div></div>;
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"><span className="text-sm text-gray-500">{label}</span><span className="text-right text-sm font-medium text-gray-900">{value}</span></div>;
}
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ClipboardCheck,
  FileText,
  Package,
  ReceiptText,
  ShoppingCart,
  User,
} from 'lucide-react';
import { salesApi } from '../lib/api';
import { appendPreservedListQuery, classNames, extractFrappeError, formatCurrency, formatDate, getStatusColor, isOperationsContext } from '../lib/utils';

type QuotationDetail = Record<string, any>;

export default function QuotationDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { quotationId } = useParams();
  const [searchParams] = useSearchParams();
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!quotationId) {
        setError('Quotation not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setFeedback(null);

      try {
        const decodedId = decodeURIComponent(quotationId);
        const response = await salesApi.getQuotationDetail(decodedId);
        setQuotation(response.data.message);
      } catch (err) {
        console.error('Failed to load quotation detail:', err);
        setError('Could not load quotation details at the moment.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [quotationId]);

  const reloadQuotation = async () => {
    if (!quotationId) return;
    const decodedId = decodeURIComponent(quotationId);
    const response = await salesApi.getQuotationDetail(decodedId);
    setQuotation(response.data.message);
  };

  const handleSubmitQuotation = async () => {
    if (!quotation?.name) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      await salesApi.submitQuotation(quotation.name);
      await reloadQuotation();
      setFeedback({ type: 'success', message: 'Quotation submitted successfully.' });
    } catch (err) {
      console.error('Failed to submit quotation:', err);
      setFeedback({ type: 'error', message: extractFrappeError(err, 'Could not submit this quotation.') });
    } finally {
      setSubmitting(false);
    }
  };

  const itemRows = useMemo(() => (Array.isArray(quotation?.items) ? quotation.items : []), [quotation]);
  const linkedOrders = useMemo(() => (Array.isArray(quotation?.linked_sales_orders) ? quotation.linked_sales_orders : []), [quotation]);
  const statusLabel = quotation?.status || (quotation?.docstatus === 0 ? 'Draft' : 'Open');
  const listSearch = searchParams.get('list');
  const backToListPath = listSearch
    ? isOperationsContext(listSearch)
      ? `/operations?${listSearch}`
      : `/sales/quotations?${listSearch}`
    : '/sales/quotations';
  const backLabel = listSearch && isOperationsContext(listSearch) ? 'Back to Operations' : 'Back to Quotations';
  const encodedLines = useMemo(() => encodeURIComponent(JSON.stringify(
    itemRows.map((item) => ({
      item_code: item.item_code || item.item_name || '',
      qty: item.qty ?? 1,
      rate: item.rate ?? 0,
      delivery_date: item.delivery_date || quotation?.valid_till || quotation?.transaction_date || '',
    })),
  )), [itemRows, quotation]);

  const buildOrderDetailPath = (orderName: string) => appendPreservedListQuery(`/sales/orders/${encodeURIComponent(orderName)}`, listSearch);

  if (loading) {
    return <div className="flex justify-center py-16"><div className="spinner" /></div>;
  }

  if (error || !quotation) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(backToListPath)} className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </button>
        <div className="card p-8 text-center text-gray-500">{error || 'Quotation not found.'}</div>
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
          <p className="mt-1 text-gray-500">Quotation detail and line-level commercial view</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <span className={classNames('inline-flex rounded-full px-3 py-1 text-sm font-medium', getStatusColor(statusLabel))}>
            {statusLabel}
          </span>
          {quotation.customer && (
            <button
              onClick={() => navigate(`/sales/orders/new?customer=${encodeURIComponent(quotation.customer)}&transactionDate=${encodeURIComponent(quotation.transaction_date || '')}&deliveryDate=${encodeURIComponent(quotation.valid_till || quotation.transaction_date || '')}&sourceType=quotation&sourceName=${encodeURIComponent(quotation.name || '')}&lines=${encodedLines}`)}
              className="btn-secondary"
            >
              Create Sales Order
            </button>
          )}
          {quotation.docstatus === 0 && (
            <button onClick={handleSubmitQuotation} disabled={submitting} className="btn-primary disabled:opacity-60">
              {submitting ? 'Submitting…' : 'Submit Quotation'}
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm ${feedback.type === 'success' ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailKPI icon={ReceiptText} label="Grand Total" value={formatCurrency(quotation.grand_total, quotation.currency)} tone="green" />
        <DetailKPI icon={Package} label="Items" value={String(itemRows.length)} tone="blue" />
        <DetailKPI icon={ClipboardCheck} label="Order Type" value={quotation.order_type || 'Sales'} tone="purple" />
        <DetailKPI icon={FileText} label="Currency" value={quotation.currency || 'PKR'} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Quotation Overview</h2>
            <p className="text-sm text-gray-500">Customer, validity, and selling context</p>
          </div>
          <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoRow icon={User} label="Customer" value={quotation.customer_name || quotation.party_name || '—'} />
            <InfoRow icon={Calendar} label="Transaction Date" value={formatDate(quotation.transaction_date)} />
            <InfoRow icon={Calendar} label="Valid Till" value={formatDate(quotation.valid_till)} />
            <InfoRow icon={ShoppingCart} label="Order Type" value={quotation.order_type || 'Sales'} />
            <InfoRow icon={FileText} label="Quotation To" value={quotation.quotation_to || 'Customer'} />
            <InfoRow icon={ReceiptText} label="Remarks" value={quotation.remarks || quotation.note || '—'} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Totals Summary</h2>
            <p className="text-sm text-gray-500">Commercial totals from the quotation</p>
          </div>
          <div className="card-body space-y-4">
            <SummaryLine label="Net Total" value={formatCurrency(quotation.net_total, quotation.currency)} />
            <SummaryLine label="Taxes" value={formatCurrency(quotation.total_taxes_and_charges, quotation.currency)} />
            <SummaryLine label="Grand Total" value={formatCurrency(quotation.grand_total, quotation.currency)} />
            <SummaryLine label="Rounded Total" value={formatCurrency(quotation.rounded_total, quotation.currency)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Quotation Items</h2>
          <p className="text-sm text-gray-500">Line items included in this quotation</p>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Item</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Description</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Qty</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Rate</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itemRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">No quotation items found.</td>
                </tr>
              ) : (
                itemRows.map((item, index) => (
                  <tr key={`${item.item_code || item.item_name || 'item'}-${index}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{item.item_code || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{item.description || item.item_name || '—'}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">{item.qty ?? 0}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">{formatCurrency(item.rate, quotation.currency)}</td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(item.amount, quotation.currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {linkedOrders.length > 0 && (
        <LinkedDocumentsCard
          title="Resulting Sales Orders"
          description="Orders created from this quotation"
          documents={linkedOrders.map((entry) => ({
            name: entry.name,
            meta: `${formatDate(entry.transaction_date)} • ${formatCurrency(entry.grand_total, entry.currency)}`,
            status: entry.status || 'Draft',
            actionLabel: (entry.status || 'Draft').toLowerCase() === 'draft' ? 'Resume Draft' : undefined,
            onAction: (entry.status || 'Draft').toLowerCase() === 'draft'
              ? () => navigate(buildOrderDetailPath(entry.name))
              : undefined,
          }))}
          onOpen={(name) => navigate(buildOrderDetailPath(name))}
        />
      )}
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
        <div className={`rounded-lg p-2 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="break-words text-sm text-gray-900">{value}</div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function LinkedDocumentsCard({ title, description, documents, onOpen }: { title: string; description: string; documents: Array<{ name: string; meta: string; status?: string; outstanding?: string; actionLabel?: string; onAction?: () => void }>; onOpen: (name: string) => void }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="card-body space-y-3">
        {documents.map((doc) => (
          <div key={doc.name} className="flex flex-col gap-3 rounded-lg border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-gray-900">{doc.name}</div>
                {doc.status && <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(doc.status)}`}>{doc.status}</span>}
              </div>
              <div className="text-sm text-gray-500">{doc.meta}</div>
              {doc.outstanding && <div className="text-xs text-gray-500">Outstanding: {doc.outstanding}</div>}
            </div>
            <div className="flex flex-wrap gap-2">
              {doc.onAction && doc.actionLabel && (
                <button onClick={doc.onAction} className="btn-primary whitespace-nowrap">{doc.actionLabel}</button>
              )}
              <button onClick={() => onOpen(doc.name)} className="btn-secondary whitespace-nowrap">Open</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
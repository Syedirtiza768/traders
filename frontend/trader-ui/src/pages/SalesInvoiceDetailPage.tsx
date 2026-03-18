import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  Package,
  ReceiptText,
  ShoppingCart,
  User,
} from 'lucide-react';
import { salesApi } from '../lib/api';
import { appendPreservedListQuery, classNames, extractFrappeError, formatCurrency, formatDate, getStatusColor, isFilterListContext, isOperationsContext, isReportContext } from '../lib/utils';

type SalesInvoiceDetail = Record<string, any>;

export default function SalesInvoiceDetailPage() {
  const navigate = useNavigate();
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<SalesInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!invoiceId) {
        setError('Invoice not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setFeedback(null);

      try {
        const decodedId = decodeURIComponent(invoiceId);
        const response = await salesApi.getInvoiceDetail(decodedId);
        setInvoice(response.data.message);
      } catch (err) {
        console.error('Failed to load sales invoice detail:', err);
        setError('Could not load invoice details at the moment.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [invoiceId]);

  const reloadInvoice = async () => {
    if (!invoiceId) return;

    const decodedId = decodeURIComponent(invoiceId);
    const response = await salesApi.getInvoiceDetail(decodedId);
    setInvoice(response.data.message);
  };

  const handleSubmitInvoice = async () => {
    if (!invoice?.name) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      await salesApi.submitInvoice(invoice.name);
      await reloadInvoice();
      setFeedback({ type: 'success', message: 'Sales invoice submitted successfully.' });
    } catch (err) {
      console.error('Failed to submit sales invoice:', err);
      setFeedback({ type: 'error', message: extractFrappeError(err, 'Could not submit this sales invoice.') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!invoice?.name) return;
    if (!window.confirm('Are you sure you want to cancel this sales invoice? This action cannot be undone.')) return;

    setCancelling(true);
    setFeedback(null);
    try {
      await salesApi.cancelInvoice(invoice.name);
      await reloadInvoice();
      setFeedback({ type: 'success', message: 'Sales invoice cancelled successfully.' });
    } catch (err) {
      console.error('Failed to cancel sales invoice:', err);
      setFeedback({ type: 'error', message: extractFrappeError(err, 'Could not cancel this sales invoice.') });
    } finally {
      setCancelling(false);
    }
  };

  const itemRows = useMemo(() => {
    if (!Array.isArray(invoice?.items)) return [];
    return invoice.items;
  }, [invoice]);

  const statusLabel = useMemo(() => {
    if (!invoice) return 'Unknown';
    if (invoice.docstatus === 0) return 'Draft';
    if (invoice.docstatus === 2) return 'Cancelled';
    if ((invoice.outstanding_amount ?? 0) <= 0) return 'Paid';
    if ((invoice.outstanding_amount ?? 0) < (invoice.grand_total ?? 0)) return 'Partly Paid';
    return 'Unpaid';
  }, [invoice]);
  const listSearch = searchParams.get('list');
  const backToListPath = useMemo(() => {
    if (!listSearch) {
      return '/sales';
    }

    if (isReportContext(listSearch)) {
      return `/reports?${listSearch}`;
    }
    if (isOperationsContext(listSearch)) {
      return `/operations?${listSearch}`;
    }
    if (isFilterListContext(listSearch)) {
      return `/customers?${listSearch}`;
    }

    return `/sales/orders?${listSearch}`;
  }, [listSearch]);
  const backLabel = backToListPath.startsWith('/reports')
    ? 'Back to Reports'
    : backToListPath.startsWith('/operations')
      ? 'Back to Operations'
    : backToListPath.startsWith('/customers')
      ? 'Back to Customers'
      : listSearch
        ? 'Back to Sales Orders'
        : 'Back to Sales';

  const buildSourceOrderPath = (orderName: string) => {
    return appendPreservedListQuery(`/sales/orders/${encodeURIComponent(orderName)}`, listSearch);
  };

  const buildReturnPath = () => {
    const params = new URLSearchParams();

    if (invoice?.name) params.set('invoiceName', invoice.name);
    if (invoice?.customer) params.set('customer', invoice.customer);
    if (invoice?.posting_date) params.set('postingDate', invoice.posting_date);
    if (invoice?.due_date) params.set('dueDate', invoice.due_date);
    if (Array.isArray(invoice?.items) && invoice.items.length > 0) {
      params.set('lines', encodeURIComponent(JSON.stringify(invoice.items.map((item: any) => ({
        item_code: item.item_code || '',
        qty: Math.abs(Number(item.qty) || 0),
        rate: Number(item.rate) || 0,
        warehouse: item.warehouse || '',
      })))));
    }
    if (listSearch) params.set('list', listSearch);

    const query = params.toString();
    return `/sales/returns/new${query ? `?${query}` : ''}`;
  };

  if (loading) {
    return <div className="py-16 flex justify-center"><div className="spinner" /></div>;
  }

  if (error || !invoice) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(backToListPath)} className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </button>
        <div className="card p-8 text-center text-gray-500">{error || 'Invoice not found.'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => navigate(backToListPath)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{invoice.name}</h1>
          <p className="mt-1 text-gray-500">Sales invoice detail and line-level view</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <span className={classNames('inline-flex rounded-full px-3 py-1 text-sm font-medium', getStatusColor(statusLabel))}>
            {statusLabel}
          </span>
          {invoice.docstatus === 1 && !invoice.is_return && (
            <button
              onClick={() => navigate(buildReturnPath())}
              className="btn-secondary"
            >
              Create Return
            </button>
          )}
          {(invoice.outstanding_amount ?? 0) > 0 && invoice.customer && (
            <button
              onClick={() => navigate(appendPreservedListQuery(`/finance/payments/new?paymentType=Receive&partyType=Customer&party=${encodeURIComponent(invoice.customer)}&amount=${encodeURIComponent(String(invoice.outstanding_amount || 0))}&referenceName=${encodeURIComponent(invoice.name)}`, listSearch))}
              className="btn-secondary"
            >
              Collect Payment
            </button>
          )}
          {invoice.docstatus === 0 && (
            <button onClick={handleSubmitInvoice} disabled={submitting} className="btn-primary disabled:opacity-60">
              {submitting ? 'Submitting…' : 'Submit Invoice'}
            </button>
          )}
          {invoice.docstatus === 1 && !invoice.is_return && (
            <button onClick={handleCancelInvoice} disabled={cancelling} className="btn-danger disabled:opacity-60">
              {cancelling ? 'Cancelling…' : 'Cancel Invoice'}
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm ${feedback.type === 'success' ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

      {invoice.sales_order && (
        <TraceBanner
          label="Started from sales order"
          value={invoice.sales_order}
          onClick={() => navigate(buildSourceOrderPath(invoice.sales_order))}
        />
      )}

      {invoice.return_against && (
        <TraceBanner
          label="Return against invoice"
          value={invoice.return_against}
          onClick={() => navigate(appendPreservedListQuery(`/sales/${encodeURIComponent(invoice.return_against)}`, listSearch))}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailKPI icon={CreditCard} label="Grand Total" value={formatCurrency(invoice.grand_total, invoice.currency)} tone="green" />
        <DetailKPI icon={AlertCircle} label="Outstanding" value={formatCurrency(invoice.outstanding_amount, invoice.currency)} tone="red" />
        <DetailKPI icon={Package} label="Items" value={String(itemRows.length)} tone="blue" />
        <DetailKPI icon={ReceiptText} label="Currency" value={invoice.currency || 'PKR'} tone="purple" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Invoice Overview</h2>
            <p className="text-sm text-gray-500">Customer, posting, and reference details</p>
          </div>
          <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoRow icon={User} label="Customer" value={invoice.customer_name || invoice.customer || '—'} />
            <InfoRow icon={Calendar} label="Posting Date" value={formatDate(invoice.posting_date)} />
            <InfoRow icon={Calendar} label="Due Date" value={formatDate(invoice.due_date)} />
            <InfoRow icon={ShoppingCart} label="Update Stock" value={invoice.update_stock ? 'Yes' : 'No'} />
            <InfoRow icon={FileText} label="Sales Order" value={invoice.sales_order || '—'} />
            <InfoRow icon={ReceiptText} label="Return Against" value={invoice.return_against || '—'} />
            <InfoRow icon={ReceiptText} label="Remarks" value={invoice.remarks || invoice.note || '—'} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Totals Summary</h2>
            <p className="text-sm text-gray-500">Commercial totals from the posted document</p>
          </div>
          <div className="card-body space-y-4">
            <SummaryLine label="Net Total" value={formatCurrency(invoice.net_total, invoice.currency)} />
            <SummaryLine label="Taxes" value={formatCurrency(invoice.total_taxes_and_charges, invoice.currency)} />
            <SummaryLine label="Grand Total" value={formatCurrency(invoice.grand_total, invoice.currency)} />
            <SummaryLine label="Paid Amount" value={formatCurrency(invoice.paid_amount, invoice.currency)} />
            <SummaryLine label="Outstanding" value={formatCurrency(invoice.outstanding_amount, invoice.currency)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Invoice Items</h2>
          <p className="text-sm text-gray-500">Line items captured in this invoice</p>
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
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">No invoice items found.</td>
                </tr>
              ) : (
                itemRows.map((item, index) => (
                  <tr key={`${item.item_code || item.item_name || 'item'}-${index}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{item.item_code || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{item.description || item.item_name || '—'}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">{item.qty ?? 0}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">{formatCurrency(item.rate, invoice.currency)}</td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(item.amount, invoice.currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DetailKPI({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: 'blue' | 'green' | 'red' | 'purple'; }) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
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

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string; }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="text-sm text-gray-900 break-words">{value}</div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string; }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}

function TraceBanner({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-brand-800/80">{value}</div>
      </div>
      <button onClick={onClick} className="btn-secondary whitespace-nowrap">
        Open Source
      </button>
    </div>
  );
}
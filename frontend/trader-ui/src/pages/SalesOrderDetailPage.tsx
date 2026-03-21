import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ClipboardCheck,
  FileText,
  Package,
  PackageOpen,
  Printer,
  ReceiptText,
  ShoppingCart,
  User,
} from 'lucide-react';
import { salesApi } from '../lib/api';
import { appendPreservedListQuery, classNames, extractFrappeError, formatCurrency, formatDate, getStatusColor, isOperationsContext } from '../lib/utils';

type SalesOrderDetail = Record<string, any>;

export default function SalesOrderDetailPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<SalesOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!orderId) {
        setError('Sales order not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setFeedback(null);

      try {
        const decodedId = decodeURIComponent(orderId);
        const response = await salesApi.getOrderDetail(decodedId);
        setOrder(response.data.message);
      } catch (err) {
        console.error('Failed to load sales order detail:', err);
        setError('Could not load sales order details at the moment.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [orderId]);

  const reloadOrder = async () => {
    if (!orderId) return;

    const decodedId = decodeURIComponent(orderId);
    const response = await salesApi.getOrderDetail(decodedId);
    setOrder(response.data.message);
  };

  const handleSubmitOrder = async () => {
    if (!order?.name) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      await salesApi.submitOrder(order.name);
      await reloadOrder();
      setFeedback({ type: 'success', message: 'Sales order submitted successfully.' });
    } catch (err) {
      console.error('Failed to submit sales order:', err);
      setFeedback({ type: 'error', message: extractFrappeError(err, 'Could not submit this sales order.') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order?.name) return;
    if (!window.confirm('Are you sure you want to cancel this sales order? This action cannot be undone.')) return;

    setCancelling(true);
    setFeedback(null);
    try {
      await salesApi.cancelOrder(order.name);
      await reloadOrder();
      setFeedback({ type: 'success', message: 'Sales order cancelled successfully.' });
    } catch (err) {
      console.error('Failed to cancel sales order:', err);
      setFeedback({ type: 'error', message: extractFrappeError(err, 'Could not cancel this sales order.') });
    } finally {
      setCancelling(false);
    }
  };

  const itemRows = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order]);
  const linkedInvoices = useMemo(() => (Array.isArray(order?.linked_sales_invoices) ? order.linked_sales_invoices : []), [order]);
  const statusLabel = order?.status || (order?.docstatus === 0 ? 'Draft' : 'Submitted');
  const listSearch = searchParams.get('list');
  const backToListPath = listSearch
    ? isOperationsContext(listSearch)
      ? `/operations?${listSearch}`
      : `/sales/orders?${listSearch}`
    : '/sales/orders';
  const backLabel = listSearch && isOperationsContext(listSearch) ? 'Back to Operations' : 'Back to Sales Orders';
  const hasLinkedInvoices = linkedInvoices.length > 0;
  const canCreateDispatch = (order?.docstatus ?? 0) === 1 && itemRows.length > 0;
  const encodedLines = useMemo(() => encodeURIComponent(JSON.stringify(
    itemRows.map((item) => ({
      item_code: item.item_code || item.item_name || '',
      qty: item.qty ?? 1,
      rate: item.rate ?? 0,
      warehouse: item.warehouse || order?.set_warehouse || '',
    })),
  )), [itemRows, order?.set_warehouse]);

  const buildQuotationDetailPath = (quotationName: string) => appendPreservedListQuery(`/sales/quotations/${encodeURIComponent(quotationName)}`, listSearch);

  const buildInvoiceDetailPath = (invoiceName: string) => appendPreservedListQuery(`/sales/${encodeURIComponent(invoiceName)}`, listSearch);

  if (loading) {
    return <div className="flex justify-center py-16"><div className="spinner" /></div>;
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(backToListPath)} className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </button>
        <div className="card p-8 text-center text-gray-500">{error || 'Sales order not found.'}</div>
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
          <h1 className="text-2xl font-bold text-gray-900">{order.name}</h1>
          <p className="mt-1 text-gray-500">Sales order detail and fulfillment context</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <span className={classNames('inline-flex rounded-full px-3 py-1 text-sm font-medium', getStatusColor(statusLabel))}>
            {statusLabel}
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => navigate(`/print?doctype=Sales%20Order&name=${encodeURIComponent(order.name)}`)}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <Printer className="h-4 w-4" /> Print / Preview
            </button>
            {order.customer && (
              <button
                onClick={() => navigate(`/customers/${encodeURIComponent(order.customer)}`)}
                className="btn-secondary"
              >
                View Customer
              </button>
            )}
            {order.quotation && (
              <button
                onClick={() => navigate(buildQuotationDetailPath(order.quotation))}
                className="btn-secondary"
              >
                View Quotation
              </button>
            )}
            {order.customer && !hasLinkedInvoices && (
              <button
                onClick={() => navigate(`/sales/new?customer=${encodeURIComponent(order.customer)}&postingDate=${encodeURIComponent(order.transaction_date || '')}&dueDate=${encodeURIComponent(order.delivery_date || order.transaction_date || '')}&sourceType=sales-order&sourceName=${encodeURIComponent(order.name || '')}&lines=${encodedLines}`)}
                className="btn-secondary"
              >
                Create Invoice
              </button>
            )}
            {canCreateDispatch && (
              <button
                onClick={() => navigate(appendPreservedListQuery(`/inventory/dispatches/new?orderName=${encodeURIComponent(order.name || '')}&customer=${encodeURIComponent(order.customer || '')}&warehouse=${encodeURIComponent(order.set_warehouse || '')}&postingDate=${encodeURIComponent(order.delivery_date || order.transaction_date || '')}&lines=${encodedLines}`, listSearch))}
                className="btn-secondary"
              >
                Create Dispatch
              </button>
            )}
            {hasLinkedInvoices && (
              <button
                onClick={() => navigate(buildInvoiceDetailPath(linkedInvoices[0].name))}
                className="btn-secondary"
              >
                {linkedInvoices.length === 1 ? 'Open Invoice' : 'Review Invoices'}
              </button>
            )}
          </div>
          {order.docstatus === 0 && (
            <button onClick={handleSubmitOrder} disabled={submitting} className="btn-primary disabled:opacity-60">
              {submitting ? 'Submitting…' : 'Submit Order'}
            </button>
          )}
          {order.docstatus === 1 && (
            <button onClick={handleCancelOrder} disabled={cancelling} className="btn-danger disabled:opacity-60">
              {cancelling ? 'Cancelling…' : 'Cancel Order'}
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm ${feedback.type === 'success' ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

      {order.quotation && (
        <TraceBanner
          label="Started from quotation"
          value={order.quotation}
          onClick={() => navigate(buildQuotationDetailPath(order.quotation))}
        />
      )}

      {hasLinkedInvoices && (
        <TraceBanner
          label={linkedInvoices.length === 1 ? 'Invoice already created' : 'Invoices already created'}
          value={linkedInvoices.length === 1 ? linkedInvoices[0].name : `${linkedInvoices.length} linked sales invoices`}
          onClick={() => navigate(buildInvoiceDetailPath(linkedInvoices[0].name))}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailKPI icon={ReceiptText} label="Grand Total" value={formatCurrency(order.grand_total, order.currency)} tone="green" />
        <DetailKPI icon={Package} label="Items" value={String(itemRows.length)} tone="blue" />
        <DetailKPI icon={ClipboardCheck} label="Delivery Date" value={formatDate(order.delivery_date)} tone="purple" />
        <DetailKPI icon={canCreateDispatch ? PackageOpen : FileText} label={canCreateDispatch ? 'Dispatch Ready' : 'Currency'} value={canCreateDispatch ? 'Create Stock Issue' : (order.currency || 'PKR')} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Order Overview</h2>
            <p className="text-sm text-gray-500">Customer, dates, and linked quotation context</p>
          </div>
          <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoRow icon={User} label="Customer" value={order.customer_name || order.customer || '—'} />
            <InfoRow icon={Calendar} label="Transaction Date" value={formatDate(order.transaction_date)} />
            <InfoRow icon={Calendar} label="Delivery Date" value={formatDate(order.delivery_date)} />
            <InfoRow icon={ShoppingCart} label="Order Type" value={order.order_type || 'Sales'} />
            <InfoRow icon={FileText} label="Quotation" value={order.quotation || '—'} />
            <InfoRow icon={ReceiptText} label="Tax Template" value={order.taxes_and_charges || 'None'} />
            <InfoRow icon={ReceiptText} label="Remarks" value={order.remarks || order.note || '—'} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Totals Summary</h2>
            <p className="text-sm text-gray-500">Commercial totals from the order</p>
          </div>
          <div className="card-body space-y-4">
            <SummaryLine label="Net Total" value={formatCurrency(order.net_total, order.currency)} />
            {(order.taxes || []).length > 0 ? (
              (order.taxes as any[]).map((tax: any, i: number) => (
                <SummaryLine
                  key={i}
                  label={`${tax.description || 'Tax'} (${tax.rate || 0}%)${tax.included_in_print_rate ? ' incl.' : ''}`}
                  value={formatCurrency(tax.tax_amount, order.currency)}
                />
              ))
            ) : (
              <SummaryLine label="Taxes" value={formatCurrency(order.total_taxes_and_charges, order.currency)} />
            )}
            <SummaryLine label="Grand Total" value={formatCurrency(order.grand_total, order.currency)} />
            <SummaryLine label="Rounded Total" value={formatCurrency(order.rounded_total, order.currency)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
          <p className="text-sm text-gray-500">Line items captured on this sales order</p>
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
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">No sales order items found.</td>
                </tr>
              ) : (
                itemRows.map((item, index) => (
                  <tr key={`${item.item_code || item.item_name || 'item'}-${index}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{item.item_code || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{item.description || item.item_name || '—'}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">{item.qty ?? 0}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">{formatCurrency(item.rate, order.currency)}</td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(item.amount, order.currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {linkedInvoices.length > 0 && (
        <LinkedDocumentsCard
          title="Resulting Sales Invoices"
          description="Invoices created from this sales order"
          documents={linkedInvoices.map((entry) => ({
            name: entry.name,
            meta: `${formatDate(entry.posting_date)} • ${formatCurrency(entry.grand_total, entry.currency)}`,
            status: entry.status || ((entry.outstanding_amount ?? 0) <= 0 ? 'Paid' : 'Unpaid'),
            outstanding: formatCurrency(entry.outstanding_amount, entry.currency),
            actionLabel: (entry.status || '').toLowerCase() === 'draft'
              ? 'Resume Draft'
              : (entry.outstanding_amount ?? 0) > 0 && order.customer
                ? 'Collect Payment'
                : undefined,
            onAction: (entry.status || '').toLowerCase() === 'draft'
              ? () => navigate(buildInvoiceDetailPath(entry.name))
              : (entry.outstanding_amount ?? 0) > 0 && order.customer
                ? () => navigate(appendPreservedListQuery(`/finance/payments/new?paymentType=Receive&partyType=Customer&party=${encodeURIComponent(order.customer)}&amount=${encodeURIComponent(String(entry.outstanding_amount || 0))}&referenceName=${encodeURIComponent(entry.name)}`, listSearch))
                : undefined,
          }))}
          onOpen={(name) => navigate(buildInvoiceDetailPath(name))}
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
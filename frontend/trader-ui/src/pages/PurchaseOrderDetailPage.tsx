import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ClipboardCheck,
  FileText,
  PackageCheck,
  Package,
  ReceiptText,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { purchasesApi } from '../lib/api';
import { appendPreservedListQuery, classNames, extractFrappeError, formatCurrency, formatDate, getStatusColor, isOperationsContext } from '../lib/utils';

type PurchaseOrderDetail = Record<string, any>;

export default function PurchaseOrderDetailPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!orderId) {
        setError('Purchase order not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setFeedback(null);

      try {
        const decodedId = decodeURIComponent(orderId);
        const response = await purchasesApi.getOrderDetail(decodedId);
        setOrder(response.data.message);
      } catch (err) {
        console.error('Failed to load purchase order detail:', err);
        setError('Could not load purchase order details at the moment.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [orderId]);

  const reloadOrder = async () => {
    if (!orderId) return;

    const decodedId = decodeURIComponent(orderId);
    const response = await purchasesApi.getOrderDetail(decodedId);
    setOrder(response.data.message);
  };

  const handleSubmitOrder = async () => {
    if (!order?.name) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      await purchasesApi.submitOrder(order.name);
      await reloadOrder();
      setFeedback({ type: 'success', message: 'Purchase order submitted successfully.' });
    } catch (err) {
      console.error('Failed to submit purchase order:', err);
      setFeedback({ type: 'error', message: extractFrappeError(err, 'Could not submit this purchase order.') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order?.name) return;
    if (!window.confirm('Are you sure you want to cancel this purchase order? This action cannot be undone.')) return;

    setCancelling(true);
    setFeedback(null);
    try {
      await purchasesApi.cancelOrder(order.name);
      await reloadOrder();
      setFeedback({ type: 'success', message: 'Purchase order cancelled successfully.' });
    } catch (err) {
      console.error('Failed to cancel purchase order:', err);
      setFeedback({ type: 'error', message: extractFrappeError(err, 'Could not cancel this purchase order.') });
    } finally {
      setCancelling(false);
    }
  };

  const itemRows = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order]);
  const linkedInvoices = useMemo(() => (Array.isArray(order?.linked_purchase_invoices) ? order.linked_purchase_invoices : []), [order]);
  const statusLabel = order?.status || (order?.docstatus === 0 ? 'Draft' : 'Submitted');
  const listSearch = searchParams.get('list');
  const backToListPath = listSearch
    ? isOperationsContext(listSearch)
      ? `/operations?${listSearch}`
      : `/purchases/orders?${listSearch}`
    : '/purchases/orders';
  const backLabel = listSearch && isOperationsContext(listSearch) ? 'Back to Operations' : 'Back to Purchase Orders';
  const hasLinkedInvoices = linkedInvoices.length > 0;
  const canCreateReceipt = (order?.docstatus ?? 0) === 1 && itemRows.length > 0;
  const encodedLines = useMemo(() => encodeURIComponent(JSON.stringify(
    itemRows.map((item) => ({
      item_code: item.item_code || item.item_name || '',
      qty: item.qty ?? 1,
      rate: item.rate ?? 0,
      warehouse: item.warehouse || order?.set_warehouse || '',
    })),
  )), [itemRows, order?.set_warehouse]);

  const buildInvoiceDetailPath = (invoiceName: string) => appendPreservedListQuery(`/purchases/${encodeURIComponent(invoiceName)}`, listSearch);

  if (loading) {
    return <div className="flex justify-center py-16"><div className="spinner" /></div>;
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(backToListPath)} className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </button>
        <div className="card p-8 text-center text-gray-500">{error || 'Purchase order not found.'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => navigate(backToListPath)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </button>
          <h1 className="page-title">{order.name}</h1>
          <p className="mt-1 text-gray-500">Purchase order detail and procurement context</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <span className={classNames('inline-flex rounded-full px-3 py-1 text-sm font-medium', getStatusColor(statusLabel))}>
            {statusLabel}
          </span>
          {order.supplier && (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => navigate(`/suppliers/${encodeURIComponent(order.supplier)}`)}
                className="btn-secondary"
              >
                View Supplier
              </button>
              {!hasLinkedInvoices && (
                <button
                  onClick={() => navigate(`/purchases/new?supplier=${encodeURIComponent(order.supplier)}&postingDate=${encodeURIComponent(order.transaction_date || '')}&dueDate=${encodeURIComponent(order.schedule_date || order.transaction_date || '')}&sourceType=purchase-order&sourceName=${encodeURIComponent(order.name || '')}&lines=${encodedLines}`)}
                  className="btn-secondary"
                >
                  Create Invoice
                </button>
              )}
              {canCreateReceipt && (
                <button
                  onClick={() => navigate(appendPreservedListQuery(`/purchases/receipts/new?orderName=${encodeURIComponent(order.name || '')}&supplier=${encodeURIComponent(order.supplier || '')}&warehouse=${encodeURIComponent(order.set_warehouse || '')}&postingDate=${encodeURIComponent(order.schedule_date || order.transaction_date || '')}&lines=${encodedLines}`, listSearch))}
                  className="btn-secondary"
                >
                  Create Receipt
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
          )}
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

      {hasLinkedInvoices && (
        <TraceBanner
          label={linkedInvoices.length === 1 ? 'Invoice already created' : 'Invoices already created'}
          value={linkedInvoices.length === 1 ? linkedInvoices[0].name : `${linkedInvoices.length} linked purchase invoices`}
          onClick={() => navigate(buildInvoiceDetailPath(linkedInvoices[0].name))}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailKPI icon={ReceiptText} label="Grand Total" value={formatCurrency(order.grand_total, order.currency)} tone="green" />
        <DetailKPI icon={Package} label="Items" value={String(itemRows.length)} tone="blue" />
        <DetailKPI icon={ClipboardCheck} label="Schedule Date" value={formatDate(order.schedule_date || order.transaction_date)} tone="purple" />
        <DetailKPI icon={canCreateReceipt ? PackageCheck : FileText} label={canCreateReceipt ? 'Receipt Ready' : 'Currency'} value={canCreateReceipt ? 'Create Material Receipt' : (order.currency || 'PKR')} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Order Overview</h2>
            <p className="text-sm text-gray-500">Supplier, timing, and procurement context</p>
          </div>
          <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoRow icon={Truck} label="Supplier" value={order.supplier_name || order.supplier || '—'} />
            <InfoRow icon={Calendar} label="Transaction Date" value={formatDate(order.transaction_date)} />
            <InfoRow icon={Calendar} label="Schedule Date" value={formatDate(order.schedule_date || order.transaction_date)} />
            <InfoRow icon={ShoppingCart} label="Status" value={order.status || 'Draft'} />
            <InfoRow icon={FileText} label="Set Warehouse" value={order.set_warehouse || '—'} />
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
            <SummaryLine label="Taxes" value={formatCurrency(order.total_taxes_and_charges, order.currency)} />
            <SummaryLine label="Grand Total" value={formatCurrency(order.grand_total, order.currency)} />
            <SummaryLine label="Rounded Total" value={formatCurrency(order.rounded_total, order.currency)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
          <p className="text-sm text-gray-500">Line items captured on this purchase order</p>
        </div>
        {/* Desktop table */}
        <div className="hidden md:block">
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
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400">No purchase order items found.</td>
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
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {itemRows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">No purchase order items found.</p>
          ) : (
            itemRows.map((item, index) => (
              <div key={`m-${item.item_code || index}`} className="px-4 py-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.item_code || '—'}</p>
                    <p className="text-xs text-gray-500 truncate">{item.description || item.item_name || '—'}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(item.amount, order.currency)}</p>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  <span>Qty: {item.qty ?? 0}</span>
                  <span>Rate: {formatCurrency(item.rate, order.currency)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {linkedInvoices.length > 0 && (
        <LinkedDocumentsCard
          title="Resulting Purchase Invoices"
          description="Invoices created from this purchase order"
          documents={linkedInvoices.map((entry) => ({
            name: entry.name,
            meta: `${formatDate(entry.posting_date)} • ${formatCurrency(entry.grand_total, entry.currency)}`,
            status: entry.status || ((entry.outstanding_amount ?? 0) <= 0 ? 'Paid' : 'Unpaid'),
            outstanding: formatCurrency(entry.outstanding_amount, entry.currency),
            actionLabel: (entry.status || '').toLowerCase() === 'draft'
              ? 'Resume Draft'
              : (entry.outstanding_amount ?? 0) > 0 && order.supplier
                ? 'Pay Supplier'
                : undefined,
            onAction: (entry.status || '').toLowerCase() === 'draft'
              ? () => navigate(buildInvoiceDetailPath(entry.name))
              : (entry.outstanding_amount ?? 0) > 0 && order.supplier
                ? () => navigate(appendPreservedListQuery(`/finance/payments/new?paymentType=Pay&partyType=Supplier&party=${encodeURIComponent(order.supplier)}&amount=${encodeURIComponent(String(entry.outstanding_amount || 0))}&referenceName=${encodeURIComponent(entry.name)}`, listSearch))
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
        Open Invoice
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
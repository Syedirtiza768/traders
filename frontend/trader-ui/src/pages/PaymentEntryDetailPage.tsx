import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  ReceiptText,
  Wallet,
} from 'lucide-react';
import { financeApi } from '../lib/api';
import { classNames, formatCurrency, formatDate, getStatusColor, isFilterListContext, isOperationsContext, isReportContext, isWorkflowContext } from '../lib/utils';

type PaymentEntryDetail = Record<string, any>;

export default function PaymentEntryDetailPage() {
  const navigate = useNavigate();
  const { paymentId } = useParams();
  const [searchParams] = useSearchParams();
  const [payment, setPayment] = useState<PaymentEntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!paymentId) {
        setError('Payment entry not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setFeedback(null);

      try {
        const decodedId = decodeURIComponent(paymentId);
        const response = await financeApi.getPaymentEntryDetail(decodedId);
        setPayment(response.data.message);
      } catch (err) {
        console.error('Failed to load payment entry detail:', err);
        setError('Could not load payment entry details at the moment.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [paymentId]);

  const reloadPayment = async () => {
    if (!paymentId) return;

    const decodedId = decodeURIComponent(paymentId);
    const response = await financeApi.getPaymentEntryDetail(decodedId);
    setPayment(response.data.message);
  };

  const handleSubmitPayment = async () => {
    if (!payment?.name) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      await financeApi.submitPaymentEntry(payment.name);
      await reloadPayment();
      setFeedback({ type: 'success', message: 'Payment entry submitted successfully.' });
    } catch (err) {
      console.error('Failed to submit payment entry:', err);
      setFeedback({ type: 'error', message: 'Could not submit this payment entry.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!payment?.name) return;
    if (!window.confirm('Are you sure you want to cancel this payment entry? This action cannot be undone.')) return;

    setCancelling(true);
    setFeedback(null);
    try {
      await financeApi.cancelPaymentEntry(payment.name);
      await reloadPayment();
      setFeedback({ type: 'success', message: 'Payment entry cancelled successfully.' });
    } catch (err) {
      console.error('Failed to cancel payment entry:', err);
      setFeedback({ type: 'error', message: 'Could not cancel this payment entry.' });
    } finally {
      setCancelling(false);
    }
  };

  const referenceRows = useMemo(() => (Array.isArray(payment?.references) ? payment.references : []), [payment]);
  const statusLabel = payment?.docstatus === 0 ? 'Draft' : payment?.docstatus === 2 ? 'Cancelled' : 'Submitted';
  const listSearch = searchParams.get('list');
  const backToPath = useMemo(() => {
    if (!listSearch) {
      return '/finance/payments';
    }

    if (isReportContext(listSearch)) {
      return `/reports?${listSearch}`;
    }
    if (isOperationsContext(listSearch)) {
      return `/operations?${listSearch}`;
    }
    const parsedList = new URLSearchParams(listSearch);
    if (parsedList.has('paymentType') || parsedList.has('page')) {
      return `/finance/payments?${listSearch}`;
    }
    if (isFilterListContext(listSearch)) {
      if (payment?.party_type === 'Supplier' || payment?.payment_type === 'Pay') {
        return `/suppliers?${listSearch}`;
      }
      if (payment?.party_type === 'Customer' || payment?.payment_type === 'Receive') {
        return `/customers?${listSearch}`;
      }
    }
    if (isWorkflowContext(listSearch)) {
      return (payment?.party_type === 'Supplier' || payment?.payment_type === 'Pay')
        ? `/purchases/orders?${listSearch}`
        : `/sales/orders?${listSearch}`;
    }

    return '/finance/payments';
  }, [listSearch, payment?.party_type, payment?.payment_type]);
  const backLabel = backToPath.startsWith('/reports')
    ? 'Back to Reports'
    : backToPath.startsWith('/operations')
      ? 'Back to Operations'
      : backToPath.startsWith('/customers')
        ? 'Back to Customers'
        : backToPath.startsWith('/suppliers')
          ? 'Back to Suppliers'
          : backToPath.startsWith('/sales/orders')
            ? 'Back to Sales Orders'
            : backToPath.startsWith('/purchases/orders')
              ? 'Back to Purchase Orders'
              : 'Back to Payment Entries';

  if (loading) {
    return <div className="flex justify-center py-16"><div className="spinner" /></div>;
  }

  if (error || !payment) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(backToPath)} className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </button>
        <div className="card p-8 text-center text-gray-500">{error || 'Payment entry not found.'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => navigate(backToPath)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{payment.name}</h1>
          <p className="mt-1 text-gray-500">Payment entry detail, party context, and allocated references</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <span className={classNames('inline-flex rounded-full px-3 py-1 text-sm font-medium', getStatusColor(statusLabel))}>
            {statusLabel}
          </span>
          {payment.docstatus === 0 && (
            <button onClick={handleSubmitPayment} disabled={submitting} className="btn-primary disabled:opacity-60">
              {submitting ? 'Submitting…' : 'Submit Payment'}
            </button>
          )}
          {payment.docstatus === 1 && (
            <button onClick={handleCancelPayment} disabled={cancelling} className="btn-danger disabled:opacity-60">
              {cancelling ? 'Cancelling…' : 'Cancel Payment'}
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
        <DetailKPI icon={Wallet} label="Paid Amount" value={formatCurrency(payment.paid_amount)} tone="green" />
        <DetailKPI icon={Wallet} label="Received Amount" value={formatCurrency(payment.received_amount)} tone="blue" />
        <DetailKPI icon={CreditCard} label="Payment Type" value={payment.payment_type || '—'} tone="purple" />
        <DetailKPI icon={Calendar} label="Posting Date" value={formatDate(payment.posting_date)} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Payment Overview</h2>
            <p className="text-sm text-gray-500">Party, payment mode, and source references</p>
          </div>
          <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoRow icon={CreditCard} label="Payment Type" value={payment.payment_type || '—'} />
            <InfoRow icon={FileText} label="Party Type" value={payment.party_type || '—'} />
            <InfoRow icon={FileText} label="Party" value={payment.party_name || payment.party || '—'} />
            <InfoRow icon={Calendar} label="Posting Date" value={formatDate(payment.posting_date)} />
            <InfoRow icon={ReceiptText} label="Mode of Payment" value={payment.mode_of_payment || '—'} />
            <InfoRow icon={ReceiptText} label="Reference No" value={payment.reference_no || '—'} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Amount Summary</h2>
            <p className="text-sm text-gray-500">Commercial totals from the payment entry</p>
          </div>
          <div className="card-body space-y-4">
            <SummaryLine label="Paid Amount" value={formatCurrency(payment.paid_amount)} />
            <SummaryLine label="Received Amount" value={formatCurrency(payment.received_amount)} />
            <SummaryLine label="Difference" value={formatCurrency((payment.received_amount || 0) - (payment.paid_amount || 0))} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Allocated References</h2>
          <p className="text-sm text-gray-500">Documents linked to this payment entry</p>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Reference Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Reference Name</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Allocated</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {referenceRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400">No references linked to this payment entry.</td>
                </tr>
              ) : (
                referenceRows.map((reference, index) => (
                  <tr key={`${reference.reference_doctype || 'ref'}-${index}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-700">{reference.reference_doctype || '—'}</td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{reference.reference_name || '—'}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">{formatCurrency(reference.allocated_amount)}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{formatCurrency(reference.outstanding_amount)}</td>
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
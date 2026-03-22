import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle, ClipboardList, XCircle } from 'lucide-react';
import { purchasesApi } from '../lib/api';
import { appendPreservedListQuery, extractFrappeError, formatCurrency, formatDate, getStatusColor } from '../lib/utils';

export default function PurchaseRequisitionDetailPage() {
  const navigate = useNavigate();
  const { reqId } = useParams();
  const [searchParams] = useSearchParams();
  const [req, setReq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const listSearch = searchParams.toString();
  const backToList = appendPreservedListQuery('/purchases/requisitions', listSearch);

  useEffect(() => {
    const load = async () => {
      if (!reqId) { setError('Requisition not found.'); setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const res = await purchasesApi.getRequisitionDetail(decodeURIComponent(reqId));
        setReq(res.data.message);
      } catch {
        setError('Could not load purchase requisition details.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [reqId]);

  const reload = async () => {
    if (!reqId) return;
    const res = await purchasesApi.getRequisitionDetail(decodeURIComponent(reqId));
    setReq(res.data.message);
  };

  const handleSubmit = async () => {
    if (!req?.name) return;
    setSubmitting(true); setFeedback(null);
    try {
      await purchasesApi.submitRequisition(req.name);
      await reload();
      setFeedback({ type: 'success', message: 'Requisition submitted successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', message: extractFrappeError(err, 'Could not submit this requisition.') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!req?.name) return;
    setCancelling(true); setFeedback(null);
    try {
      await purchasesApi.cancelMaterialRequest(req.name);
      await reload();
      setFeedback({ type: 'success', message: 'Requisition cancelled.' });
    } catch (err) {
      setFeedback({ type: 'error', message: extractFrappeError(err, 'Could not cancel this requisition.') });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;
  if (error || !req) return (
    <div className="space-y-4">
      <button onClick={() => navigate(backToList)} className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800"><ArrowLeft size={16} /> Back to Requisitions</button>
      <div className="card p-8 text-center text-gray-500">{error || 'Requisition not found.'}</div>
    </div>
  );

  const isDraft = req.docstatus === 0;
  const isSubmitted = req.docstatus === 1;
  const statusLabel = isDraft ? 'Draft' : isSubmitted ? (req.status || 'Open') : 'Cancelled';
  const items: any[] = req.items || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back */}
      <button onClick={() => navigate(backToList)} className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
        <ArrowLeft size={16} /> Back to Requisitions
      </button>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${feedback.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

      {/* Header card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><ClipboardList className="w-6 h-6 text-blue-600" /></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{req.name}</h1>
              <span className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(statusLabel)}`}>{statusLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isDraft && (
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-1.5 disabled:opacity-60">
                <CheckCircle size={15} />{submitting ? 'Submitting…' : 'Submit'}
              </button>
            )}
            {isDraft && (
              <button onClick={handleCancel} disabled={cancelling} className="btn-secondary text-red-600 flex items-center gap-1.5 disabled:opacity-60">
                <XCircle size={15} />{cancelling ? 'Cancelling…' : 'Cancel'}
              </button>
            )}
            {isSubmitted && (
              <button
                onClick={() => navigate(appendPreservedListQuery(`/purchases/rfqs/new?requisitionName=${encodeURIComponent(req.name)}`, listSearch))}
                className="btn-primary flex items-center gap-1.5"
              >
                Create RFQ
              </button>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-1">Transaction Date</p>
            <div className="flex items-center gap-1.5 text-gray-700"><Calendar size={14} />{formatDate(req.transaction_date)}</div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Required By</p>
            <div className="flex items-center gap-1.5 text-gray-700"><Calendar size={14} />{formatDate(req.schedule_date) || '—'}</div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">% Ordered</p>
            <p className="font-medium text-gray-900">{req.per_ordered ?? 0}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Company</p>
            <p className="font-medium text-gray-900">{req.company || '—'}</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Requested Items</h2>
        </div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">#</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Item</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">UOM</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Warehouse</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Est. Rate</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Est. Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No items.</td></tr>
              ) : items.map((item: any, idx: number) => (
                <tr key={item.name || idx}>
                  <td className="px-6 py-3 text-sm text-gray-400">{idx + 1}</td>
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-gray-900">{item.item_name || item.item_code}</p>
                    {item.item_name && item.item_code !== item.item_name && <p className="text-xs text-gray-400">{item.item_code}</p>}
                    {item.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>}
                  </td>
                  <td className="px-6 py-3 text-sm text-right">{item.qty}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{item.uom}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{item.warehouse || '—'}</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-600">{item.rate ? formatCurrency(item.rate) : '—'}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium">{item.amount ? formatCurrency(item.amount) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">No items.</p>
          ) : (
            items.map((item: any, idx: number) => (
              <div key={`m-${item.name || idx}`} className="px-4 py-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.item_name || item.item_code}</p>
                    {item.item_name && item.item_code !== item.item_name && <p className="text-xs text-gray-400">{item.item_code}</p>}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{item.amount ? formatCurrency(item.amount) : '—'}</p>
                </div>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                  <span>Qty: {item.qty} {item.uom || ''}</span>
                  {item.rate && <span>Rate: {formatCurrency(item.rate)}</span>}
                  {item.warehouse && <span>{item.warehouse}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

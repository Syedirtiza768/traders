import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Truck } from 'lucide-react';
import { salesApi } from '../lib/api';
import { formatDate } from '../lib/utils';
import CommercialHierarchyEditor from '../components/CommercialHierarchyEditor';
import { PageHeader, LoadingBlock, AlertBanner, StatusBadge } from '../components/ui';

export default function DeliveryChallanDetailPage() {
  const navigate = useNavigate();
  const { challanId } = useParams();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!challanId) return;
    setLoading(true);
    try {
      const res = await salesApi.getDeliveryNoteDetail(decodeURIComponent(challanId));
      setDoc(res.data.message);
    } catch {
      setError('Could not load delivery challan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [challanId]);

  const handleSubmit = async () => {
    if (!doc?.name) return;
    setSubmitting(true);
    try {
      await salesApi.submitDeliveryNote(doc.name);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMakeInvoice = async () => {
    if (!doc?.name) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await salesApi.createInvoiceFromChallan(doc.name);
      const name = res.data.message?.invoice;
      if (name) navigate(`/sales/${encodeURIComponent(name)}`);
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Invoice creation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingBlock label="Loading delivery challan…" />;
  }

  if (!doc) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => navigate('/sales/challans')} className="inline-flex items-center gap-2 text-sm text-brand-700">
          <ArrowLeft size={16} /> Back to challans
        </button>
        <AlertBanner tone="error">{error || 'Delivery challan not found.'}</AlertBanner>
      </div>
    );
  }

  const printFormat = doc.print_format || 'delivery_challan';

  return (
    <div className="space-y-6">
      <PageHeader
        title={doc.name}
        description={`${doc.customer_name || doc.customer} · ${formatDate(doc.posting_date)}`}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 dark:text-brand-300">
              <Truck className="h-4 w-4" aria-hidden="true" />
              Delivery Challan
            </span>
            <StatusBadge status={doc.status || (doc.docstatus === 0 ? 'Draft' : 'Submitted')} />
          </div>
        }
        actions={
          <>
            <button type="button" onClick={() => navigate('/sales/challans')} className="btn-secondary inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
            {doc.docstatus === 0 && (
              <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary">
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            )}
            {doc.docstatus === 1 && (doc.per_billed ?? 0) < 100 && (
              <button type="button" onClick={handleMakeInvoice} disabled={submitting} className="btn-primary">
                {submitting ? 'Creating…' : 'Make Invoice'}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(`/print?doctype=Delivery%20Note&name=${encodeURIComponent(doc.name)}&format=${printFormat}`)}
              className="btn-secondary flex items-center gap-2"
            >
              <Printer size={14} /> Print
            </button>
          </>
        }
      />

      {error ? <AlertBanner tone="error" onDismiss={() => setError(null)}>{error}</AlertBanner> : null}

      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(doc.items || []).map((line: any) => (
              <tr key={line.name || line.item_code}>
                <td className="px-4 py-3">{line.item_name || line.item_code}</td>
                <td className="px-4 py-3 text-right">{line.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CommercialHierarchyEditor
        doctype="Delivery Note"
        name={doc.name}
        initialOptions={doc.trader_commercial_options}
        readOnly={doc.docstatus !== 0}
        onSaved={() => { void load(); }}
      />
    </div>
  );
}

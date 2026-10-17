import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Truck } from 'lucide-react';
import { gatePassApi, opportunityApi, salesApi } from '../lib/api';
import { extractFrappeError, formatDate } from '../lib/utils';
import CommercialHierarchyEditor from '../components/CommercialHierarchyEditor';
import { PageHeader, LoadingBlock, AlertBanner, StatusBadge } from '../components/ui';

/** Outward gate pass: the physical release of goods on a submitted challan. */
function GatePassPanel({ deliveryNote }: { deliveryNote: string }) {
  const [status, setStatus] = useState<any>(null);
  const [passes, setPasses] = useState<any[]>([]);
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [dispatch, list] = await Promise.all([
        gatePassApi.dispatchStatus(deliveryNote),
        gatePassApi.list({ delivery_note: deliveryNote }),
      ]);
      setStatus(dispatch.data.message);
      setPasses(Array.isArray(list.data.message) ? list.data.message : []);
    } catch (err) {
      setMessage({ type: 'error', text: extractFrappeError(err, 'Could not load gate passes.') });
    }
  }, [deliveryNote]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const issue = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await gatePassApi.create({
        delivery_note: deliveryNote,
        vehicle_no: vehicleNo || undefined,
        driver_name: driverName || undefined,
        received_by: receivedBy || undefined,
      });
      setMessage({ type: 'success', text: `Gate pass ${res.data.message?.name ?? ''} issued.` });
      setVehicleNo('');
      setDriverName('');
      setReceivedBy('');
      await refresh();
    } catch (err) {
      setMessage({ type: 'error', text: extractFrappeError(err, 'Gate pass could not be issued.') });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (name: string) => {
    if (!window.confirm(`Cancel gate pass ${name}? The goods stay on the challan.`)) return;
    setBusy(true);
    try {
      await gatePassApi.cancel(name);
      await refresh();
    } catch (err) {
      setMessage({ type: 'error', text: extractFrappeError(err, 'Gate pass could not be cancelled.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-gray-900">Outward gate pass</h2>
        <span className="text-xs text-gray-500">
          {status?.fully_released ? 'Everything on this challan has left the gate.' : 'Goods still to release.'}
        </span>
      </div>
      {message ? (
        <AlertBanner tone={message.type === 'error' ? 'error' : 'success'}>{message.text}</AlertBanner>
      ) : null}
      {status?.items?.length ? (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="py-1 pr-3">Item</th>
              <th className="py-1 pr-3 text-right">Challan qty</th>
              <th className="py-1 pr-3 text-right">Released</th>
              <th className="py-1 text-right">Pending</th>
            </tr>
          </thead>
          <tbody>
            {status.items.map((row: any) => (
              <tr key={row.item_code} className="border-t border-gray-100">
                <td className="py-1 pr-3">{row.item_code}</td>
                <td className="py-1 pr-3 text-right">{row.challan_qty}</td>
                <td className="py-1 pr-3 text-right">{row.released_qty}</td>
                <td className="py-1 text-right">{row.pending_release_qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {!status?.fully_released ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-xs text-gray-500">Vehicle no.</span>
            <input className="input-field" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-gray-500">Driver</span>
            <input className="input-field" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-gray-500">Received by</span>
            <input className="input-field" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
          </label>
          <div className="sm:col-span-3">
            <button type="button" className="btn-primary" disabled={busy} onClick={() => void issue()}>
              Issue gate pass for pending goods
            </button>
          </div>
        </div>
      ) : null}
      {passes.length > 0 ? (
        <ul className="divide-y divide-gray-100 text-sm">
          {passes.map((gp: any) => (
            <li key={gp.name} className="flex flex-wrap items-center gap-3 py-2">
              <span className="font-medium text-gray-900">{gp.name}</span>
              <span className="text-gray-500">{formatDate(gp.pass_date)}</span>
              <span className="text-gray-500">{gp.vehicle_no || '—'}</span>
              <span className="text-gray-500">{gp.status}</span>
              {gp.status !== 'Cancelled' ? (
                <button
                  type="button"
                  className="ml-auto text-xs text-red-600 hover:underline"
                  disabled={busy}
                  onClick={() => void cancel(gp.name)}
                >
                  Cancel
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

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

  const handleGoodsReturn = async () => {
    if (!doc?.name) return;
    if (!window.confirm('Create a goods return against this challan? Submitting it puts the goods back into stock.')) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await opportunityApi.createReturnDeliveryNote(doc.name);
      const name = res.data.message?.name;
      if (name) navigate(`/sales/challans/${encodeURIComponent(name)}`);
    } catch (err) {
      setError(extractFrappeError(err, 'Goods return could not be created.'));
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
            {doc.docstatus === 1 && !doc.is_return && (
              <button type="button" onClick={handleGoodsReturn} disabled={submitting} className="btn-secondary">
                Goods return
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

      {doc.docstatus === 1 && !doc.is_return ? <GatePassPanel deliveryNote={doc.name} /> : null}

      <CommercialHierarchyEditor
        doctype="Delivery Note"
        name={doc.name}
        initialOptions={doc.trader_commercial_options}
        modified={doc.modified}
        readOnly={doc.docstatus !== 0}
        onSaved={() => { void load(); }}
      />
    </div>
  );
}

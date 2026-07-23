import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Package,
  ReceiptText,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { opportunityApi } from '../lib/api';
import { extractFrappeError, formatCurrency, formatDate, getStatusColor } from '../lib/utils';
import { LoadingBlock, AlertBanner } from '../components/ui';

const CLOSE_STAGES = ['Enquiry', 'Quotation', 'Customer PO', 'Delivery', 'Other'] as const;
const HUB_TABS = ['Details', 'Quotations', 'Order Confirmations', 'Delivery Notes', 'Invoices', 'Activity'] as const;

type HubTab = (typeof HUB_TABS)[number];

export default function OpportunityDetailPage() {
  const navigate = useNavigate();
  const { opportunityId } = useParams();
  const [searchParams] = useSearchParams();
  const listQuery = searchParams.get('list');
  const backPath = listQuery
    ? `/sales/opportunities?${listQuery}`
    : '/sales/opportunities';

  const [hub, setHub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [tab, setTab] = useState<HubTab>('Details');
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [closeStage, setCloseStage] = useState<(typeof CLOSE_STAGES)[number]>('Quotation');
  const [poNo, setPoNo] = useState('');
  const [poDate, setPoDate] = useState('');
  const [poAmount, setPoAmount] = useState('');
  const [sourceQuotes, setSourceQuotes] = useState<{ name: string }[]>([]);
  const [selectedQuote, setSelectedQuote] = useState('');
  const [selectedPo, setSelectedPo] = useState('');
  const [invoiceableDns, setInvoiceableDns] = useState<any[]>([]);
  const [selectedDns, setSelectedDns] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!opportunityId) {
      setError('Project not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const decoded = decodeURIComponent(opportunityId);
      const res = await opportunityApi.get(decoded);
      setHub(res.data.message);
      try {
        const sq = await opportunityApi.listSourceQuotations(decoded);
        const rows = sq.data.message?.quotations || [];
        setSourceQuotes(rows);
        setSelectedQuote(sq.data.message?.default || rows[0]?.name || '');
      } catch {
        setSourceQuotes([]);
      }
      try {
        const inv = await opportunityApi.listInvoiceableDeliveryNotes(decoded);
        const rows = inv.data.message?.delivery_notes || [];
        setInvoiceableDns(rows);
        setSelectedDns(rows.map((r: any) => r.name));
      } catch {
        setInvoiceableDns([]);
        setSelectedDns([]);
      }
    } catch (err) {
      console.error(err);
      setError(extractFrappeError(err, 'Could not load project.'));
      setHub(null);
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const opp = hub?.opportunity;
  const counts = opp?.counts || {};

  const runAction = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      await fn();
      await load();
      setFeedback({ type: 'success', message: success });
    } catch (err) {
      setFeedback({ type: 'error', message: extractFrappeError(err, 'Action failed.') });
    } finally {
      setBusy(false);
    }
  };

  const docLinks = useMemo(
    () => ({
      Quotation: (name: string) => `/sales/quotations/${encodeURIComponent(name)}`,
      'Sales Order': (name: string) => `/sales/orders/${encodeURIComponent(name)}`,
      'Delivery Note': (name: string) => `/sales/challans/${encodeURIComponent(name)}`,
      'Sales Invoice': (name: string) => `/sales/${encodeURIComponent(name)}`,
    }),
    [],
  );

  if (loading) {
    return <LoadingBlock label="Loading project…" />;
  }

  if (error || !opp) {
    return (
      <div className="space-y-4">
        <button type="button" className="inline-flex items-center gap-2 text-sm text-brand-700" onClick={() => navigate(backPath)}>
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </button>
        <AlertBanner tone="error">{error || 'Project not found.'}</AlertBanner>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <button type="button" className="inline-flex items-center gap-2 text-sm text-brand-700" onClick={() => navigate(backPath)}>
        <ArrowLeft className="h-4 w-4" /> Back to Projects
      </button>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title">{opp.opportunity_ref}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(opp.status)}`}>
              {opp.status}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              {opp.display_stage}
            </span>
          </div>
          <p className="mt-1 text-base text-gray-800">{opp.title}</p>
          <p className="mt-1 text-sm text-gray-500">
            {opp.customer_name || opp.customer}
            {opp.branch ? ` · ${opp.branch}` : ''}
            {opp.enquiry_date ? ` · Enquiry ${formatDate(opp.enquiry_date)}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {opp.status === 'Open' ? (
            <>
              {hub?.open_quotation_draft ? (
                <>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={busy}
                    onClick={() =>
                      navigate(`/sales/quotations/${encodeURIComponent(hub.open_quotation_draft.name)}/edit`)
                    }
                  >
                    Continue Quotation
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy}
                    onClick={async () => {
                      if (!window.confirm('Discard the open draft quotation? This deletes it.')) return;
                      await runAction(
                        () => opportunityApi.discardQuotationDraft(hub.open_quotation_draft.name),
                        'Draft quotation discarded.',
                      );
                    }}
                  >
                    Discard Draft
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busy}
                  onClick={() =>
                    navigate(`/sales/quotations/make?opportunity=${encodeURIComponent(opp.name)}`)
                  }
                >
                  Make Quotation
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() =>
                  runAction(async () => {
                    const res = await opportunityApi.createOrderConfirmation({
                      opportunity: opp.name,
                      source_quotation: selectedQuote || undefined,
                      customer_po_no: selectedPo || undefined,
                    });
                    const name = res.data.message?.name;
                    if (name) navigate(`/sales/orders/${encodeURIComponent(name)}`);
                  }, 'Order Confirmation created.')
                }
              >
                Make OC
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() =>
                  runAction(async () => {
                    const res = await opportunityApi.createDeliveryNote(opp.name);
                    const name = res.data.message?.name;
                    if (name) navigate(`/sales/challans/${encodeURIComponent(name)}`);
                  }, 'Delivery Note created.')
                }
              >
                Make Delivery Note
              </button>
              {invoiceableDns.length > 0 ? (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy || selectedDns.length === 0}
                  onClick={() =>
                    runAction(async () => {
                      const res = await opportunityApi.createInvoice({
                        opportunity: opp.name,
                        delivery_notes: selectedDns,
                      });
                      const name = res.data.message?.name;
                      if (name) navigate(`/sales/${encodeURIComponent(name)}`);
                    }, 'Invoice created.')
                  }
                >
                  Make Invoice
                </button>
              ) : null}
              <select
                className="input-field w-auto"
                value={closeStage}
                onChange={(e) => setCloseStage(e.target.value as typeof closeStage)}
              >
                {CLOSE_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => runAction(() => opportunityApi.close(opp.name, closeStage), 'Project closed.')}
              >
                Close
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => runAction(() => opportunityApi.reopen(opp.name), 'Project reopened.')}
            >
              Reopen
            </button>
          )}
        </div>
      </div>

      {opp.status === 'Open' && (sourceQuotes.length > 0 || (opp.customer_pos || []).length > 0) ? (
        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          {sourceQuotes.length > 0 ? (
            <label className="block flex-1 space-y-1">
              <span className="text-xs font-medium text-gray-600">OC source quotation (default = latest)</span>
              <select className="input-field" value={selectedQuote} onChange={(e) => setSelectedQuote(e.target.value)}>
                {sourceQuotes.map((q) => (
                  <option key={q.name} value={q.name}>{q.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          {(opp.customer_pos || []).length > 0 ? (
            <label className="block flex-1 space-y-1">
              <span className="text-xs font-medium text-gray-600">Customer PO for OC</span>
              <select className="input-field" value={selectedPo} onChange={(e) => setSelectedPo(e.target.value)}>
                <option value="">Optional…</option>
                {opp.customer_pos.map((po: { customer_po_no: string }) => (
                  <option key={po.customer_po_no} value={po.customer_po_no}>{po.customer_po_no}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {opp.status === 'Open' && invoiceableDns.length > 0 ? (
        <div className="card p-4 space-y-2">
          <p className="text-xs font-medium text-gray-600">Delivery challans to invoice</p>
          <div className="space-y-1">
            {invoiceableDns.map((dn: any) => (
              <label key={dn.name} className="flex flex-wrap items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedDns.includes(dn.name)}
                  onChange={(e) => {
                    setSelectedDns((prev) =>
                      e.target.checked ? [...prev, dn.name] : prev.filter((n) => n !== dn.name),
                    );
                  }}
                />
                <span className="font-medium text-gray-800">{dn.name}</span>
                <span className="text-gray-500">· {formatDate(dn.posting_date)}</span>
                <span className="text-gray-700">· {formatCurrency(dn.grand_total || 0)}</span>
                <span className="text-gray-400">· {dn.per_billed ?? 0}% billed</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={FileText} label="Quotations" value={counts.quotations || 0} />
        <Kpi icon={ShoppingCart} label="Order Confirmations" value={counts.order_confirmations || 0} />
        <Kpi icon={Truck} label="Delivery Notes" value={counts.delivery_notes || 0} />
        <Kpi icon={ReceiptText} label="Invoices" value={counts.invoices || 0} />
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 scrollbar-hide">
        {HUB_TABS.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setTab(entry)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === entry ? 'bg-white text-brand-700 shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {entry}
          </button>
        ))}
      </div>

      {tab === 'Details' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Details</h2>
            <DetailRow label="Priority" value={opp.priority} />
            <DetailRow label="Owner" value={opp.owner_user || '—'} />
            <DetailRow label="Enquiry value" value={opp.enquiry_value ? formatCurrency(opp.enquiry_value) : '—'} />
            <DetailRow label="Watchlist" value={opp.watchlist ? 'Yes' : 'No'} />
            {opp.status === 'Closed' ? (
              <>
                <DetailRow label="Close stage" value={opp.close_stage || '—'} />
                <DetailRow label="Closed by" value={opp.closed_by || '—'} />
              </>
            ) : null}
            {opp.description ? (
              <div className="prose prose-sm max-w-none border-t border-gray-100 pt-3 text-gray-700"
                dangerouslySetInnerHTML={{ __html: opp.description }}
              />
            ) : (
              <p className="text-sm text-gray-400">No description.</p>
            )}
          </div>

          <div className="card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Customer purchase orders</h2>
            {(opp.customer_pos || []).length === 0 ? (
              <p className="text-sm text-gray-400">No customer POs yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {opp.customer_pos.map((po: any) => (
                  <li key={po.name || po.customer_po_no} className="flex justify-between gap-2 py-2 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">{po.customer_po_no}</p>
                      <p className="text-xs text-gray-500">{po.po_date ? formatDate(po.po_date) : '—'}</p>
                    </div>
                    <p className="text-gray-700">{po.po_amount ? formatCurrency(po.po_amount) : ''}</p>
                  </li>
                ))}
              </ul>
            )}

            {opp.status === 'Open' ? (
              <div className="space-y-2 border-t border-gray-100 pt-3">
                <p className="text-xs font-medium text-gray-600">Add customer PO</p>
                <input className="input-field" placeholder="PO number" value={poNo} onChange={(e) => setPoNo(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input-field" type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
                  <input className="input-field" type="number" min="0" step="0.01" placeholder="Amount" value={poAmount} onChange={(e) => setPoAmount(e.target.value)} />
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy || !poNo.trim()}
                  onClick={() =>
                    runAction(async () => {
                      await opportunityApi.addCustomerPo(opp.name, {
                        customer_po_no: poNo.trim(),
                        po_date: poDate || undefined,
                        po_amount: poAmount ? Number(poAmount) : 0,
                      });
                      setPoNo('');
                      setPoDate('');
                      setPoAmount('');
                    }, 'Customer PO added.')
                  }
                >
                  Add PO
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {tab === 'Quotations' && (
        <DocTable
          empty="No quotations linked."
          rows={hub.quotations || []}
          columns={[
            { key: 'name', label: 'Quotation' },
            { key: 'transaction_date', label: 'Date', format: formatDate },
            { key: 'grand_total', label: 'Amount', format: (v) => formatCurrency(v || 0), align: 'right' },
            { key: 'status', label: 'Status' },
          ]}
          onOpen={(name) => navigate(docLinks.Quotation(name))}
        />
      )}

      {tab === 'Order Confirmations' && (
        <DocTable
          empty="No order confirmations linked."
          rows={hub.order_confirmations || []}
          columns={[
            { key: 'name', label: 'Sales Order' },
            { key: 'po_no', label: 'Customer PO' },
            { key: 'transaction_date', label: 'Date', format: formatDate },
            { key: 'grand_total', label: 'Amount', format: (v) => formatCurrency(v || 0), align: 'right' },
            { key: 'status', label: 'Status' },
          ]}
          onOpen={(name) => navigate(docLinks['Sales Order'](name))}
        />
      )}

      {tab === 'Delivery Notes' && (
        <DocTable
          empty="No delivery notes linked."
          rows={hub.delivery_notes || []}
          columns={[
            { key: 'name', label: 'Delivery Note' },
            { key: 'posting_date', label: 'Date', format: formatDate },
            { key: 'grand_total', label: 'Amount', format: (v) => formatCurrency(v || 0), align: 'right' },
            { key: 'per_billed', label: '% Billed', format: (v) => `${v ?? 0}%` },
            { key: 'status', label: 'Status' },
          ]}
          onOpen={(name) => navigate(docLinks['Delivery Note'](name))}
        />
      )}

      {tab === 'Invoices' && (
        <DocTable
          empty="No invoices linked."
          rows={hub.invoices || []}
          columns={[
            { key: 'name', label: 'Invoice' },
            { key: 'posting_date', label: 'Date', format: formatDate },
            { key: 'grand_total', label: 'Amount', format: (v) => formatCurrency(v || 0), align: 'right' },
            { key: 'outstanding_amount', label: 'Outstanding', format: (v) => formatCurrency(v || 0), align: 'right' },
            { key: 'status', label: 'Status' },
          ]}
          onOpen={(name) => navigate(docLinks['Sales Invoice'](name))}
        />
      )}

      {tab === 'Activity' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-brand-700" />
              <h2 className="text-sm font-semibold text-gray-900">Comments</h2>
            </div>
            {(opp.comments || []).length === 0 ? (
              <p className="text-sm text-gray-400">No comments yet.</p>
            ) : (
              <ul className="space-y-3">
                {opp.comments.map((c: any) => (
                  <li key={c.name} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                    <p className="text-gray-800 whitespace-pre-wrap">{c.comment}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {c.commented_by || '—'} · {c.commented_at ? formatDate(c.commented_at) : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <textarea
              className="input-field min-h-[80px]"
              placeholder="Add a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={busy || !comment.trim()}
              onClick={() =>
                runAction(async () => {
                  await opportunityApi.addComment(opp.name, comment.trim());
                  setComment('');
                }, 'Comment added.')
              }
            >
              Post comment
            </button>
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-brand-700" />
              <h2 className="text-sm font-semibold text-gray-900">Attachments</h2>
            </div>
            {(hub.attachments || []).length === 0 ? (
              <p className="text-sm text-gray-400">No files attached. Upload via Desk or attach on customer PO rows.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {hub.attachments.map((f: any) => (
                  <li key={f.name} className="py-2 text-sm">
                    <a className="text-brand-700 hover:underline" href={f.file_url} target="_blank" rel="noreferrer">
                      {f.file_name}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-gray-500">
              Use Make Quotation above for the full-page tabbed editor (Sahamid-style), or Continue /
              Discard when a draft exists. Hierarchy copies Quote → OC → DN; first option per line is billed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right text-gray-800">{value}</span>
    </div>
  );
}

function DocTable({
  rows,
  columns,
  empty,
  onOpen,
}: {
  rows: any[];
  columns: { key: string; label: string; format?: (v: any) => string; align?: 'left' | 'right' }[];
  empty: string;
  onOpen: (name: string) => void;
}) {
  return (
    <div className="table-container">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-6 py-3 text-xs font-semibold uppercase text-gray-500 ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-10 text-center text-gray-400">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.name}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onOpen(row.name)}
              >
                {columns.map((col) => {
                  const raw = row[col.key];
                  const text = col.format ? col.format(raw) : (raw ?? '—');
                  return (
                    <td
                      key={col.key}
                      className={`px-6 py-3 text-sm text-gray-700 ${col.align === 'right' ? 'text-right' : 'text-left'} ${
                        col.key === 'name' ? 'font-medium text-brand-700' : ''
                      }`}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

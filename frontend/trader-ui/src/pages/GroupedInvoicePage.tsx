import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Layers, ArrowLeft } from 'lucide-react';
import { salesApi } from '../lib/api';
import { extractFrappeError, formatCurrency, formatDate, getActiveCurrency } from '../lib/utils';
import { PageHeader, LoadingBlock, EmptyState, AlertBanner } from '../components/ui';

type InvoiceableDn = {
  name: string;
  customer: string;
  customer_name?: string;
  posting_date: string;
  grand_total: number;
  per_billed: number;
};

export default function GroupedInvoicePage() {
  const navigate = useNavigate();
  const [dns, setDns] = useState<InvoiceableDn[]>([]);
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [postingDate, setPostingDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [autoSubmit, setAutoSubmit] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await salesApi.getInvoiceableDeliveryNotes(customerFilter || undefined);
      setDns(res.data.message || []);
    } catch (err) {
      console.error(err);
      setError(extractFrappeError(err, 'Could not load invoiceable delivery challans.'));
      setDns([]);
    } finally {
      setLoading(false);
    }
  }, [customerFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  // Clear selections that no longer match the filter.
  useEffect(() => {
    setSelected((prev) => {
      const next: Record<string, boolean> = {};
      for (const dn of dns) if (prev[dn.name]) next[dn.name] = true;
      return next;
    });
  }, [dns]);

  const customerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const dn of dns) map.set(dn.customer, dn.customer_name || dn.customer);
    return Array.from(map.entries());
  }, [dns]);

  const grouped = useMemo(() => {
    const map = new Map<string, { customer: string; customer_name?: string; rows: InvoiceableDn[] }>();
    for (const dn of dns) {
      const key = dn.customer;
      if (!map.has(key)) map.set(key, { customer: key, customer_name: dn.customer_name, rows: [] });
      map.get(key)!.rows.push(dn);
    }
    return Array.from(map.values());
  }, [dns]);

  const selectedDns = useMemo(() => dns.filter((d) => selected[d.name]), [dns, selected]);
  const selectedTotal = useMemo(() => selectedDns.reduce((s, d) => s + (d.grand_total || 0), 0), [selectedDns]);
  const selectedCustomers = useMemo(() => new Set(selectedDns.map((d) => d.customer)), [selectedDns]);
  const sameCustomerOk = selectedCustomers.size <= 1;

  const toggle = (name: string) => setSelected((p) => ({ ...p, [name]: !p[name] }));
  const toggleGroup = (customer: string, rows: InvoiceableDn[]) => {
    const allOn = rows.every((r) => selected[r.name]);
    setSelected((p) => {
      const next = { ...p };
      for (const r of rows) next[r.name] = !allOn;
      return next;
    });
    void customer;
  };

  const handleCreate = async () => {
    if (selectedDns.length === 0) return;
    if (!sameCustomerOk) {
      setError('All selected challans must belong to the same customer (grouping policy).');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSubmitMsg(null);
    try {
      const res = await salesApi.createGroupedInvoice(
        selectedDns.map((d) => d.name),
        postingDate,
        autoSubmit,
      );
      const invName = res.data?.message?.invoice || res.data?.message?.name || res.data?.message;
      if (invName) {
        navigate(`/sales/${encodeURIComponent(invName)}`);
      } else {
        setSubmitMsg('Invoice created.');
        setSelected({});
        void load();
      }
    } catch (err) {
      console.error(err);
      setError(extractFrappeError(err, 'Could not create grouped invoice.'));
    } finally {
      setSubmitting(false);
    }
  };

  const currency = getActiveCurrency();

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand-700" aria-hidden="true" />
            Grouped Invoice
          </span>
        }
        description={
          <>
            Select one or more submitted delivery challans for the <span className="font-medium">same customer</span> to roll
            them into a single Sales Invoice. The grouping policy is enforced server-side.
          </>
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => navigate('/sales/challans')}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
              <span className="font-medium">Customer</span>
              <select
                className="input-field w-56"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
              >
                <option value="">All customers</option>
                {customerOptions.map(([name, label]) => (
                  <option key={name} value={name}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </>
        }
      />

      {error ? <AlertBanner tone="error" onDismiss={() => setError(null)}>{error}</AlertBanner> : null}
      {submitMsg ? <AlertBanner tone="success">{submitMsg}</AlertBanner> : null}

      {loading ? (
        <LoadingBlock label="Loading invoiceable challans…" />
      ) : dns.length === 0 ? (
        <EmptyState
          title="No invoiceable delivery challans"
          description={customerFilter ? 'Try another customer or clear the filter.' : 'Submitted challans ready to bill will appear here.'}
          icon={<FileText className="h-5 w-5" aria-hidden="true" />}
        />
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <div key={g.customer} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-brand-600"
                    checked={g.rows.every((r) => selected[r.name])}
                    onChange={() => toggleGroup(g.customer, g.rows)}
                  />
                  <span className="text-sm font-semibold text-gray-900">{g.customer_name || g.customer}</span>
                  <span className="text-xs text-gray-400">· {g.rows.length} challan(s)</span>
                </div>
                <span className="text-xs text-gray-500">{g.customer}</span>
              </div>
              <div className="table-container overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/60">
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500"></th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Challan</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-500">Billed %</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {g.rows.map((dn) => (
                      <tr key={dn.name} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-brand-600"
                            checked={!!selected[dn.name]}
                            onChange={() => toggle(dn.name)}
                          />
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-brand-700">{dn.name}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{formatDate(dn.posting_date)}</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-700">{dn.per_billed ?? 0}%</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-900">
                          {formatCurrency(dn.grand_total, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {dns.length > 0 && (
        <div className="card sticky bottom-0 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{selectedDns.length}</span> challan(s) selected
            {selectedDns.length > 0 && (
              <>
                {' · '}<span className="font-medium text-gray-900">{formatCurrency(selectedTotal, currency)}</span>
                {!sameCustomerOk && (
                  <span className="ml-2 text-red-600">· multiple customers selected — not allowed</span>
                )}
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Posting date</span>
              <input
                type="date"
                className="input-field w-40"
                value={postingDate}
                onChange={(e) => setPostingDate(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
                checked={autoSubmit}
                onChange={(e) => setAutoSubmit(e.target.checked)}
              />
              <span>Submit on create</span>
            </label>
            <button
              type="button"
              disabled={selectedDns.length === 0 || !sameCustomerOk || submitting}
              onClick={handleCreate}
              className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {submitting ? 'Creating…' : 'Create Invoice'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

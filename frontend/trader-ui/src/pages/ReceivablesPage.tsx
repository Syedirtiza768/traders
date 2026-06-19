import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft, RefreshCw, Search, AlertTriangle,
  ChevronLeft, ChevronRight, CheckCircle, X,
} from 'lucide-react';
import { daybookApi } from '../lib/api';
import { useCompanyStore } from '../stores/companyStore';
import PaymentAllocationPanel, {
  type InvoiceAllocation,
  buildFifoAllocations,
} from '../components/PaymentAllocationPanel';

function fmtAmt(n: number) {
  return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

interface PartyRow {
  party: string;
  customer_name: string;
  short_code: string;
  open_invoices: number;
  total_outstanding: number;
  opening_balance?: number;
  oldest_invoice_date: string;
}

interface SettleState {
  party: string;
  name: string;
  balance: number;
  amount: string;
  loading: boolean;
  error: string | null;
}

export default function ReceivablesPage() {
  const navigate = useNavigate();
  const componentsEnabled = useCompanyStore((s) => s.componentsEnabled);
  const company = useCompanyStore((s) => s.company);
  const revision = useCompanyStore((s) => s.revision);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<PartyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settle, setSettle] = useState<SettleState | null>(null);
  const [settleSuccess, setSettleSuccess] = useState<string | null>(null);
  const [settleInvoices, setSettleInvoices] = useState<any[]>([]);
  const [settleAllocations, setSettleAllocations] = useState<InvoiceAllocation[]>([]);
  const [loadingSettleInvoices, setLoadingSettleInvoices] = useState(false);

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const res = await daybookApi.getIncoming({ page, page_size: 20, search: search || undefined });
      const msg = res.data.message as any;
      setRows(msg.data || []);
      setTotal(msg.total || 0);
      setGrandTotal(msg.grand_total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Failed to load receivables.');
    } finally {
      setLoading(false);
    }
  }, [company, page, search, revision]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!settle) {
      setSettleInvoices([]);
      setSettleAllocations([]);
      return;
    }
    setLoadingSettleInvoices(true);
    daybookApi.getPartyOpenInvoices({ party_type: 'Customer', party: settle.party })
      .then((res) => {
        const invoices = (res.data.message as any)?.invoices || [];
        setSettleInvoices(invoices);
        const amt = parseFloat(settle.amount) || 0;
        setSettleAllocations(buildFifoAllocations(invoices, amt));
      })
      .catch(() => {
        setSettleInvoices([]);
        setSettleAllocations([]);
      })
      .finally(() => setLoadingSettleInvoices(false));
  }, [settle?.party]);

  const handleSettle = async () => {
    if (!settle) return;
    const amt = parseFloat(settle.amount);
    if (isNaN(amt) || amt <= 0) return;
    const totalAllocated = settleAllocations.reduce(
      (sum, row) => sum + (Number(row.allocated_amount) || 0),
      0,
    );
    if (totalAllocated > amt + 0.005) {
      setSettle((s) => s ? { ...s, error: 'Allocated total exceeds payment amount.' } : null);
      return;
    }
    const activeAllocations = settleAllocations
      .filter((row) => Number(row.allocated_amount) > 0)
      .map((row) => ({
        reference_name: row.reference_name,
        allocated_amount: Number(row.allocated_amount),
      }));
    setSettle((s) => s ? { ...s, loading: true, error: null } : null);
    try {
      await daybookApi.settleParty({
        party_type: 'Customer',
        party: settle.party,
        amount: amt,
        allocations: settleInvoices.length > 0 ? activeAllocations : undefined,
      });
      setSettleSuccess(`Payment of ${fmtAmt(amt)} received from ${settle.name}.`);
      setSettle(null);
      void load();
    } catch (err: any) {
      setSettle((s) => s ? { ...s, loading: false, error: err?.response?.data?.exception || 'Failed to settle.' } : null);
    }
  };

  if (!componentsEnabled) {
    return (
      <div className="p-8 flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Components Trading Not Enabled</h2>
        <button onClick={() => navigate('/settings')} className="btn-primary text-sm px-4 py-2">Go to Settings</button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ArrowDownLeft className="w-6 h-6 text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">In-Coming (AR)</h1>
        </div>
        <button onClick={() => void load()} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-brand-600">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grand total tile */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Total Receivable</span>
        <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{fmtAmt(grandTotal)}</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by party name or short code…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input-field pl-9 text-sm"
        />
      </div>

      {settleSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 flex items-center justify-between text-sm text-green-700 dark:text-green-400">
          <span><CheckCircle className="inline w-4 h-4 mr-1" />{settleSuccess}</span>
          <button onClick={() => setSettleSuccess(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">{error}</div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="spinner" /></div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <ArrowDownLeft className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No outstanding receivables</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Open Invoices</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Oldest</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Settle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {rows.map((r) => (
                  <tr key={r.party} className="hover:bg-gray-50 dark:hover:bg-slate-900/30">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{r.customer_name}</td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{r.short_code || '—'}</td>
                    <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{r.open_invoices}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {fmtAmt(r.total_outstanding)}
                      {(r.opening_balance ?? 0) > 0 && (
                        <span className="block text-[10px] font-normal text-amber-600 dark:text-amber-400">
                          incl. opening {fmtAmt(r.opening_balance!)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-500">{r.oldest_invoice_date || '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => setSettle({ party: r.party, name: r.customer_name, balance: r.total_outstanding, amount: String(r.total_outstanding), loading: false, error: null })}
                        className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 rounded px-2 py-1 hover:bg-emerald-100 transition-colors"
                      >
                        Settle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs text-gray-400">
          <span>{total} parties</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>Page {page}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={rows.length < 20} className="p-1 rounded disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Settle modal */}
      {settle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Settle — {settle.name}</h3>
              <button onClick={() => setSettle(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500">Outstanding: <span className="font-bold text-emerald-600">{fmtAmt(settle.balance)}</span></p>
            <input
              type="number"
              value={settle.amount}
              min={0}
              max={settle.balance}
              onChange={(e) => {
                const next = e.target.value;
                setSettle((s) => s ? { ...s, amount: next } : null);
                const amt = parseFloat(next) || 0;
                if (settleInvoices.length > 0) {
                  setSettleAllocations(buildFifoAllocations(settleInvoices, amt));
                }
              }}
              className="input-field"
              placeholder="Amount to settle"
            />
            <PaymentAllocationPanel
              invoices={settleInvoices}
              amount={parseFloat(settle.amount) || 0}
              allocations={settleAllocations}
              onChange={setSettleAllocations}
              loading={loadingSettleInvoices}
            />
            {settle.error && <p className="text-xs text-red-600">{settle.error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setSettle(null)} className="flex-1 btn-secondary text-sm py-2">Cancel</button>
              <button
                onClick={handleSettle}
                disabled={settle.loading}
                className="flex-1 btn-primary text-sm py-2 disabled:opacity-60"
              >
                {settle.loading ? 'Posting…' : 'Post Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

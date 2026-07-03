import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, RefreshCw, Search, AlertTriangle,
  ChevronLeft, ChevronRight, CheckCircle, X,
} from 'lucide-react';
import { daybookApi } from '../lib/api';
import { useCompanyStore } from '../stores/companyStore';
import { debounce } from '../lib/utils';
import PartySettleModal from '../components/PartySettleModal';

const PAGE_SIZE = 20;

function fmtAmt(n: number) {
  return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

interface PartyRow {
  party: string;
  supplier_name: string;
  short_code: string;
  open_invoices: number;
  total_outstanding: number;
  opening_balance?: number;
  oldest_invoice_date: string;
}

interface SettleTarget {
  party: string;
  name: string;
  balance: number;
}

export default function PayablesPage() {
  const navigate = useNavigate();
  const componentsEnabled = useCompanyStore((s) => s.componentsEnabled);
  const company = useCompanyStore((s) => s.company);
  const revision = useCompanyStore((s) => s.revision);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<PartyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settle, setSettle] = useState<SettleTarget | null>(null);
  const [settleSuccess, setSettleSuccess] = useState<string | null>(null);

  const debouncedSetSearch = useCallback(
    debounce((value: string) => { setSearch(value); setPage(1); }, 400),
    [],
  );

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const res = await daybookApi.getOutgoing({ page, page_size: PAGE_SIZE, search: search || undefined });
      const msg = res.data.message as any;
      setRows(msg.data || []);
      setTotal(msg.total || 0);
      setGrandTotal(msg.grand_total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Failed to load payables.');
    } finally {
      setLoading(false);
    }
  }, [company, page, search, revision]);

  useEffect(() => { void load(); }, [load]);

  if (!componentsEnabled) {
    return (
      <div className="p-8 flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Components Trading Not Enabled</h2>
        <button onClick={() => navigate('/settings')} className="btn-primary text-sm px-4 py-2">Go to Settings</button>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ArrowUpRight className="w-6 h-6 text-rose-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Out-Going (AP)</h1>
        </div>
        <button onClick={() => void load()} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-brand-600">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-rose-700 dark:text-rose-400">Total Payable</span>
        <span className="text-2xl font-bold text-rose-700 dark:text-rose-400">{fmtAmt(grandTotal)}</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by supplier name or short code…"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            debouncedSetSearch(e.target.value);
          }}
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
            <ArrowUpRight className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No outstanding payables</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
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
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{r.supplier_name}</td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{r.short_code || '—'}</td>
                    <td className="px-4 py-2.5 text-center text-gray-600 dark:text-gray-400">{r.open_invoices}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
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
                        onClick={() => setSettle({ party: r.party, name: r.supplier_name, balance: r.total_outstanding })}
                        className="text-xs bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-700 rounded px-2 py-1 hover:bg-rose-100 transition-colors"
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
          <div className="flex gap-2 items-center">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="p-1 rounded disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {settle && (
        <PartySettleModal
          partyType="Supplier"
          party={settle.party}
          partyName={settle.name}
          balance={settle.balance}
          variant="pay"
          onClose={() => setSettle(null)}
          onSuccess={(message) => {
            setSettleSuccess(message);
            setSettle(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

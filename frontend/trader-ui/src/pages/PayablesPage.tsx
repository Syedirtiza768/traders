import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, RefreshCw, AlertTriangle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { daybookApi } from '../lib/api';
import { useCompanyStore } from '../stores/companyStore';
import { debounce, formatAmount } from '../lib/utils';
import PartySettleModal from '../components/PartySettleModal';
import { PageHeader, LoadingBlock, EmptyState, AlertBanner, SearchField } from '../components/ui';

const PAGE_SIZE = 20;

function fmtAmt(n: number) {
  return formatAmount(n);
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
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            <ArrowUpRight className="w-6 h-6 text-rose-600" aria-hidden="true" />
            Out-Going (AP)
          </span>
        }
        actions={
          <button type="button" onClick={() => void load()} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-brand-600 min-h-[44px] min-w-[44px]" aria-label="Refresh payables">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-rose-700 dark:text-rose-400">Total Payable</span>
        <span className="text-2xl font-bold text-rose-700 dark:text-rose-400">{fmtAmt(grandTotal)}</span>
      </div>

      <SearchField
        placeholder="Search by supplier name or short code…"
        value={searchInput}
        onChange={(value) => {
          setSearchInput(value);
          debouncedSetSearch(value);
        }}
        className="w-full"
        aria-label="Search payables"
      />

      {settleSuccess ? (
        <AlertBanner tone="success" onDismiss={() => setSettleSuccess(null)}>{settleSuccess}</AlertBanner>
      ) : null}
      {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <LoadingBlock compact label="Loading payables…" />
        ) : rows.length === 0 ? (
          <EmptyState
            compact
            title="No outstanding payables"
            icon={<ArrowUpRight className="h-5 w-5" aria-hidden="true" />}
          />
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
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                      <Link
                        to={`/suppliers/${encodeURIComponent(r.party)}`}
                        className="text-brand-700 dark:text-brand-300 hover:underline"
                      >
                        {r.supplier_name}
                      </Link>
                    </td>
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
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/suppliers/${encodeURIComponent(r.party)}`}
                          className="text-xs text-gray-500 hover:text-brand-600 px-1.5 py-1"
                        >
                          Ledger
                        </Link>
                        <button
                          onClick={() => setSettle({ party: r.party, name: r.supplier_name, balance: r.total_outstanding })}
                          className="text-xs bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-700 rounded px-2 py-1 hover:bg-rose-100 transition-colors"
                        >
                          Settle
                        </button>
                      </div>
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

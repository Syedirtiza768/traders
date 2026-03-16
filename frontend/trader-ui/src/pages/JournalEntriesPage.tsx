import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookText, ChevronLeft, ChevronRight, Plus, Search, Scale } from 'lucide-react';
import { financeApi } from '../lib/api';
import { appendPreservedListQuery, debounce, formatCurrency, formatDate, formatCompact } from '../lib/utils';

export default function JournalEntriesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const search = searchParams.get('search') || '';
  const listSearch = searchParams.toString();

  const pageSize = 15;

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    setSearchParams(nextParams);
  };

  const buildDetailPath = (journalName: string) => {
    return appendPreservedListQuery(`/finance/journals/${encodeURIComponent(journalName)}`, listSearch);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await financeApi.getJournalEntries({ page, page_size: pageSize });
      const payload = response.data.message;
      const filtered = search
        ? (payload.data || []).filter((row: any) =>
            [row.name, row.voucher_type, row.user_remark].some((value) =>
              String(value || '').toLowerCase().includes(search.toLowerCase()),
            ),
          )
        : payload.data || [];

      setEntries(filtered);
      setTotal(search ? filtered.length : payload.total || 0);
    } catch (err) {
      console.error('Failed to load journal entries:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      updateSearchParams({ search: value || null, page: null });
    }, 400),
    [searchParams],
  );

  const totalPages = Math.ceil(total / pageSize);
  const visibleDebit = entries.reduce((sum, row) => sum + (row.total_debit || 0), 0);
  const visibleCredit = entries.reduce((sum, row) => sum + (row.total_credit || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
        <p className="mt-1 text-gray-500">Review general ledger adjustments, accruals, and reclassification entries.</p>
      </div>

      <div className="flex justify-end">
        <button onClick={() => navigate(appendPreservedListQuery('/finance/journals/new', listSearch))} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Journal Entry
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={BookText} label="Visible Entries" value={total.toLocaleString()} color="blue" />
        <StatCard icon={Scale} label="Visible Debit" value={formatCompact(visibleDebit)} color="green" />
        <StatCard icon={Scale} label="Visible Credit" value={formatCompact(visibleCredit)} color="amber" />
      </div>

      <div className="flex justify-end">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search journal entries..." defaultValue={search} onChange={(e) => debouncedSearch(e.target.value)} className="input-field pl-9" />
        </div>
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Entry</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Voucher Type</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Debit</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Credit</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No journal entries found.</td></tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.name}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(buildDetailPath(entry.name))}
                >
                  <td className="px-6 py-3 text-sm font-medium text-brand-700">{entry.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatDate(entry.posting_date)}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{entry.voucher_type || 'Journal Entry'}</td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(entry.total_debit)}</td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(entry.total_credit)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{entry.user_remark || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && !search && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}</span>
          <div className="flex gap-1">
            <button onClick={() => updateSearchParams({ page: page > 2 ? String(page - 1) : null })} disabled={page === 1} className="btn-secondary px-2 py-1 text-xs">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => updateSearchParams({ page: String(Math.min(totalPages, page + 1)) })} disabled={page === totalPages} className="btn-secondary px-2 py-1 text-xs">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: 'blue' | 'green' | 'amber' }) {
  const tone = {
    blue: { bg: 'bg-blue-50', fg: 'text-blue-600' },
    green: { bg: 'bg-green-50', fg: 'text-green-600' },
    amber: { bg: 'bg-amber-50', fg: 'text-amber-600' },
  }[color];

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${tone.bg}`}><Icon className={`h-5 w-5 ${tone.fg}`} /></div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
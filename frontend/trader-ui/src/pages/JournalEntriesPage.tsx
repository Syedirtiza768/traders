import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookText, Plus, Scale } from 'lucide-react';
import { financeApi } from '../lib/api';
import { appendPreservedListQuery, debounce, formatCurrency, formatDate, formatCompact } from '../lib/utils';
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
  SearchField,
  PaginationBar,
  StatCard,
} from '../components/ui';

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
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Journal Entries"
        description="Review general ledger adjustments, accruals, and reclassification entries."
        actions={
          <button type="button" onClick={() => navigate(appendPreservedListQuery('/finance/journals/new', listSearch))} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" /> New Journal Entry
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <StatCard icon={BookText} label="Visible Entries" display={total.toLocaleString()} color="blue" />
        <StatCard icon={Scale} label="Visible Debit" display={formatCompact(visibleDebit)} color="green" />
        <StatCard icon={Scale} label="Visible Credit" display={formatCompact(visibleCredit)} color="amber" />
      </div>

      <div className="flex justify-end">
        <SearchField
          placeholder="Search journal entries..."
          aria-label="Search journal entries"
          defaultValue={search}
          onChange={debouncedSearch}
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block table-container">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th scope="col">Entry</th>
              <th scope="col">Date</th>
              <th scope="col">Voucher Type</th>
              <th scope="col" className="text-right">Debit</th>
              <th scope="col" className="text-right">Credit</th>
              <th scope="col">Remark</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><LoadingBlock compact label="Loading journal entries…" /></td></tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    compact
                    title="No journal entries found"
                    description={search ? 'Try adjusting your search.' : undefined}
                    action={
                      <button type="button" className="btn-primary" onClick={() => navigate(appendPreservedListQuery('/finance/journals/new', listSearch))}>
                        New Journal Entry
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.name}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(buildDetailPath(entry.name))}
                >
                  <td className="font-medium text-brand-700 dark:text-brand-300">{entry.name}</td>
                  <td className="text-gray-500 dark:text-slate-400">{formatDate(entry.posting_date)}</td>
                  <td className="text-gray-700 dark:text-slate-300">{entry.voucher_type || 'Journal Entry'}</td>
                  <td className="num font-medium text-gray-900 dark:text-gray-100">{formatCurrency(entry.total_debit)}</td>
                  <td className="num font-medium text-gray-900 dark:text-gray-100">{formatCurrency(entry.total_credit)}</td>
                  <td className="text-gray-500 dark:text-slate-400">{entry.user_remark || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden card divide-y divide-gray-100 dark:divide-slate-800">
        {loading ? (
          <LoadingBlock compact label="Loading journal entries…" />
        ) : entries.length === 0 ? (
          <EmptyState compact title="No journal entries found" description={search ? 'Try adjusting your search.' : undefined} />
        ) : (
          entries.map((entry) => (
            <div key={entry.name} className="px-4 py-3 space-y-1.5 active:bg-gray-50" onClick={() => navigate(buildDetailPath(entry.name))}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-700">{entry.name}</span>
                <span className="text-[10px] text-gray-500">{entry.voucher_type || 'Journal Entry'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{formatDate(entry.posting_date)}</span>
                <div className="flex gap-3">
                  <span className="font-medium text-gray-900">Dr {formatCurrency(entry.total_debit)}</span>
                  <span className="font-medium text-gray-900">Cr {formatCurrency(entry.total_credit)}</span>
                </div>
              </div>
              {entry.user_remark && <div className="text-[10px] text-gray-400 truncate">{entry.user_remark}</div>}
            </div>
          ))
        )}
      </div>

      {!search && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={(p) => updateSearchParams({ page: p > 1 ? String(p) : null })}
        />
      )}
    </div>
  );
}
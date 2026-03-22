import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileText, Plus, Search, TrendingUp } from 'lucide-react';
import { salesApi } from '../lib/api';
import { appendPreservedListQuery, debounce, formatCurrency, formatDate, formatCompact, getStatusColor } from '../lib/utils';

const STATUS_TABS = ['All', 'Draft', 'Open', 'Ordered', 'Lost'];
const PAGE_SIZE = 15;

function buildSalesOrderPrefill(quote: any, listSearch?: string) {
  const params = new URLSearchParams();

  if (quote.customer) params.set('customer', quote.customer);
  if (quote.transaction_date) params.set('transactionDate', quote.transaction_date);
  if (quote.valid_till) params.set('validTill', quote.valid_till);
  if (quote.name) params.set('sourceName', quote.name);
  params.set('sourceType', 'quotation');
  if (listSearch) params.set('list', listSearch);

  const query = params.toString();
  return `/sales/orders/new${query ? `?${query}` : ''}`;
}

export default function QuotationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const workflow = searchParams.get('workflow');
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const status = searchParams.get('status') || 'All';
  const search = searchParams.get('search') || '';
  const listSearch = searchParams.toString();

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

  const buildDetailPath = (quotationName: string) => {
    const query = listSearch ? `?list=${encodeURIComponent(listSearch)}` : '';
    return `/sales/quotations/${encodeURIComponent(quotationName)}${query}`;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: PAGE_SIZE };
      if (status !== 'All') params.status = status;
      if (search) params.search = search;

      const res = await salesApi.getQuotations(params);
      const payload = res.data.message;
      setQuotations(payload.data || []);
      setTotal(payload.total || 0);
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      updateSearchParams({ search: value || null, page: null });
    }, 400),
    [searchParams],
  );

  const filteredQuotations = workflow === 'awaiting-conversion'
    ? quotations.filter((row) => (row.linked_order_count || 0) === 0)
    : quotations;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const draftCount = quotations.filter((row) => row.docstatus === 0).length;
  const openValue = quotations.reduce((sum, row) => sum + (row.grand_total || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Quotations</h1>
          <p className="mt-1 text-gray-500 text-sm">Track customer quotations before they convert into sales orders and invoices.</p>
        </div>
        <button onClick={() => navigate('/sales/quotations/new')} className="btn-primary inline-flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" />
          New Quotation
        </button>
      </div>

      {workflow === 'awaiting-conversion' && (
        <WorkflowFilterBanner
          title="Workflow filter active"
          description="Showing quotations that have not yet converted into sales orders."
          onClear={() => updateSearchParams({ workflow: null, page: null })}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <StatCard icon={FileText} label="Total Quotations" value={total.toLocaleString()} color="blue" />
        <StatCard icon={TrendingUp} label="Visible Pipeline" value={formatCompact(openValue)} color="green" />
        <StatCard icon={FileText} label="Draft Quotations" value={draftCount.toLocaleString()} color="amber" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 overflow-x-auto scrollbar-hide w-full sm:w-auto">
          {STATUS_TABS.map((entry) => (
            <button
              key={entry}
              onClick={() => {
                updateSearchParams({ status: entry === 'All' ? null : entry, page: null });
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                status === entry ? 'bg-white text-brand-700 shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {entry}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search quotations..."
            defaultValue={search}
            onChange={(e) => debouncedSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block table-container">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Quotation</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Valid Till</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></td>
              </tr>
            ) : filteredQuotations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">No quotations found.</td>
              </tr>
            ) : (
              filteredQuotations.map((quote) => (
                <tr
                  key={quote.name}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(buildDetailPath(quote.name))}
                >
                  <td className="px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-brand-700">{quote.name}</p>
                      <p className="text-xs text-gray-400">{quote.order_type || 'Sales'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700">{quote.customer_name || quote.customer || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatDate(quote.transaction_date)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatDate(quote.valid_till)}</td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(quote.grand_total)}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(quote.status)}`}>
                        {quote.status || (quote.docstatus === 0 ? 'Draft' : 'Open')}
                      </span>
                      {(quote.linked_order_count || 0) > 0 && (
                        <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {quote.linked_order_count} order{quote.linked_order_count === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {quote.customer ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(buildSalesOrderPrefill(quote, listSearch));
                            }}
                            className="btn-primary text-xs"
                          >
                            Create Order
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(appendPreservedListQuery(`/customers/${encodeURIComponent(quote.customer)}`, listSearch));
                            }}
                            className="btn-secondary text-xs"
                          >
                            View Customer
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden card divide-y divide-gray-100">
        {loading ? (
          <div className="px-4 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></div>
        ) : filteredQuotations.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-400 text-sm">No quotations found.</div>
        ) : (
          filteredQuotations.map((quote) => (
            <div key={quote.name} className="px-4 py-3 space-y-1.5 active:bg-gray-50" onClick={() => navigate(buildDetailPath(quote.name))}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-700">{quote.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(quote.status)}`}>
                  {quote.status || (quote.docstatus === 0 ? 'Draft' : 'Open')}
                </span>
              </div>
              <div className="text-xs text-gray-500 truncate">{quote.customer_name || quote.customer || '—'}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{formatDate(quote.transaction_date)}</span>
                <span className="font-medium text-gray-900">{formatCurrency(quote.grand_total)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
          <span>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
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
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`rounded-lg p-1.5 sm:p-2 ${tone.bg}`}><Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${tone.fg}`} /></div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 truncate">{label}</p>
          <p className="text-sm sm:text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function WorkflowFilterBanner({ title, description, onClear }: { title: string; description: string; onClear: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-medium text-brand-900">{title}</div>
        <div className="text-sm text-brand-800">{description}</div>
      </div>
      <button onClick={onClear} className="btn-secondary whitespace-nowrap">
        Clear Filter
      </button>
    </div>
  );
}
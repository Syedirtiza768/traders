import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Plus, TrendingUp } from 'lucide-react';
import { salesApi } from '../lib/api';
import { appendPreservedListQuery, debounce, formatCurrency, formatDate, formatCompact } from '../lib/utils';
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
  FilterTabs,
  SearchField,
  StatusBadge,
  PaginationBar,
  StatCard,
} from '../components/ui';

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
      <PageHeader
        title="Quotations"
        description="Track customer quotations before they convert into sales orders and invoices."
        actions={
          <button type="button" onClick={() => navigate('/sales/quotations/new')} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Quotation
          </button>
        }
      />

      {workflow === 'awaiting-conversion' && (
        <WorkflowFilterBanner
          title="Workflow filter active"
          description="Showing quotations that have not yet converted into sales orders."
          onClear={() => updateSearchParams({ workflow: null, page: null })}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <StatCard icon={FileText} label="Total Quotations" display={total.toLocaleString()} color="blue" />
        <StatCard icon={TrendingUp} label="Visible Pipeline" display={formatCompact(openValue)} color="green" />
        <StatCard icon={FileText} label="Draft Quotations" display={draftCount.toLocaleString()} color="amber" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          options={[...STATUS_TABS]}
          value={status}
          onChange={(entry) => updateSearchParams({ status: entry === 'All' ? null : entry, page: null })}
          ariaLabel="Quotation status"
        />
        <SearchField
          placeholder="Search quotations..."
          aria-label="Search quotations"
          defaultValue={search}
          onChange={debouncedSearch}
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block table-container">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th scope="col">Quotation</th>
              <th scope="col">Customer</th>
              <th scope="col">Date</th>
              <th scope="col">Valid Till</th>
              <th scope="col" className="text-right">Amount</th>
              <th scope="col">Status</th>
              <th scope="col" className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}><LoadingBlock compact label="Loading quotations…" /></td>
              </tr>
            ) : filteredQuotations.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    compact
                    title="No quotations found"
                    description={search || status !== 'All' || workflow ? 'Try adjusting filters or search.' : undefined}
                    action={
                      <button type="button" className="btn-primary" onClick={() => navigate('/sales/quotations/new')}>
                        New Quotation
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : (
              filteredQuotations.map((quote) => (
                <tr
                  key={quote.name}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(buildDetailPath(quote.name))}
                >
                  <td>
                    <div>
                      <p className="font-medium text-brand-700 dark:text-brand-300">{quote.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{quote.order_type || 'Sales'}</p>
                    </div>
                  </td>
                  <td className="text-gray-700 dark:text-slate-300">{quote.customer_name || quote.customer || '—'}</td>
                  <td className="text-gray-500 dark:text-slate-400">{formatDate(quote.transaction_date)}</td>
                  <td className="text-gray-500 dark:text-slate-400">{formatDate(quote.valid_till)}</td>
                  <td className="num font-medium text-gray-900 dark:text-gray-100">{formatCurrency(quote.grand_total)}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={quote.status || (quote.docstatus === 0 ? 'Draft' : 'Open')} />
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
      <div className="md:hidden card divide-y divide-gray-100 dark:divide-slate-800">
        {loading ? (
          <LoadingBlock compact label="Loading quotations…" />
        ) : filteredQuotations.length === 0 ? (
          <EmptyState compact title="No quotations found" description={search || status !== 'All' || workflow ? 'Try adjusting filters or search.' : undefined} />
        ) : (
          filteredQuotations.map((quote) => (
            <div key={quote.name} className="px-4 py-3 space-y-1.5 active:bg-gray-50" onClick={() => navigate(buildDetailPath(quote.name))}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-700 dark:text-brand-300">{quote.name}</span>
                <StatusBadge status={quote.status || (quote.docstatus === 0 ? 'Draft' : 'Open')} />
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

      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={(p) => updateSearchParams({ page: p > 1 ? String(p) : null })}
      />
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
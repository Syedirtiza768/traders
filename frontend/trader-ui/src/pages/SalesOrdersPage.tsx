import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, PackageOpen, Plus, ShoppingCart, TrendingUp } from 'lucide-react';
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

const STATUS_TABS = ['All', 'Draft', 'To Deliver and Bill', 'To Bill', 'Completed', 'Cancelled'];
const PAGE_SIZE = 15;

function buildSalesInvoicePrefill(order: any, listSearch?: string) {
  const params = new URLSearchParams();

  if (order.customer) params.set('customer', order.customer);
  if (order.transaction_date) params.set('postingDate', order.transaction_date);
  if (order.delivery_date) params.set('deliveryDate', order.delivery_date);
  if (order.name) params.set('sourceName', order.name);
  params.set('sourceType', 'sales-order');
  if (listSearch) params.set('list', listSearch);

  const query = params.toString();
  return `/sales/new${query ? `?${query}` : ''}`;
}

function buildSalesDispatchPrefill(order: any, listSearch?: string) {
  const params = new URLSearchParams();

  if (order.customer) params.set('customer', order.customer);
  if (order.delivery_date || order.transaction_date) params.set('postingDate', order.delivery_date || order.transaction_date);
  if (order.name) params.set('orderName', order.name);
  if (listSearch) params.set('list', listSearch);

  const query = params.toString();
  return `/inventory/dispatches/new${query ? `?${query}` : ''}`;
}

export default function SalesOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
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

  const buildDetailPath = (orderName: string) => {
    const query = listSearch ? `?list=${encodeURIComponent(listSearch)}` : '';
    return `/sales/orders/${encodeURIComponent(orderName)}${query}`;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: PAGE_SIZE };
      if (status !== 'All') params.status = status;
      if (search) params.search = search;

      const response = await salesApi.getOrders(params);
      const payload = response.data.message;
      setOrders(payload.data || []);
      setTotal(payload.total || 0);
    } catch (err) {
      console.error('Failed to load sales orders:', err);
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

  const filteredOrders = workflow === 'unpaid-invoices'
    ? orders.filter((row) => (row.unpaid_invoice_count || 0) > 0)
    : workflow === 'awaiting-invoice'
      ? orders.filter((row) => (row.linked_invoice_count || 0) === 0 && (row.docstatus || 0) === 1)
      : workflow === 'approval-review'
        ? orders.filter((row) => ((row.docstatus || 0) === 0) || ((row.linked_invoice_count || 0) === 0 && (row.docstatus || 0) === 1))
    : orders;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const draftOrders = orders.filter((row) => row.docstatus === 0).length;
  const visibleValue = orders.reduce((sum, row) => sum + (row.grand_total || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Sales Orders"
        description="Manage confirmed selling commitments between quotations and final invoicing."
        actions={
          <button type="button" onClick={() => navigate('/sales/orders/new')} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" /> New Sales Order
          </button>
        }
      />

      {workflow === 'unpaid-invoices' && (
        <WorkflowFilterBanner
          title="Workflow filter active"
          description="Showing sales orders that still have unpaid downstream invoices."
          onClear={() => updateSearchParams({ workflow: null, page: null })}
        />
      )}

      {workflow === 'awaiting-invoice' && (
        <WorkflowFilterBanner
          title="Workflow filter active"
          description="Showing submitted sales orders that have not yet produced any sales invoice."
          onClear={() => updateSearchParams({ workflow: null, page: null })}
        />
      )}

      {workflow === 'approval-review' && (
        <WorkflowFilterBanner
          title="Approval and exception queue active"
          description="Showing draft orders and submitted orders that still need billing follow-up or managerial review."
          onClear={() => updateSearchParams({ workflow: null, page: null })}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <StatCard icon={ShoppingCart} label="Total Orders" display={total.toLocaleString()} color="blue" />
        <StatCard icon={TrendingUp} label="Visible Order Value" display={formatCompact(visibleValue)} color="green" />
        <StatCard icon={FileText} label="Draft Orders" display={draftOrders.toLocaleString()} color="amber" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          options={[...STATUS_TABS]}
          value={status}
          onChange={(entry) => updateSearchParams({ status: entry === 'All' ? null : entry, page: null })}
          ariaLabel="Sales order status"
        />
        <SearchField
          placeholder="Search sales orders..."
          aria-label="Search sales orders"
          defaultValue={search}
          onChange={debouncedSearch}
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block table-container">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Customer</th>
              <th scope="col">Date</th>
              <th scope="col">Delivery</th>
              <th scope="col" className="text-right">Amount</th>
              <th scope="col">Status</th>
              <th scope="col" className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><LoadingBlock compact label="Loading sales orders…" /></td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    compact
                    title="No sales orders found"
                    description={search || status !== 'All' || workflow ? 'Try adjusting filters or search.' : undefined}
                    action={
                      <button type="button" className="btn-primary" onClick={() => navigate('/sales/orders/new')}>
                        New Sales Order
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr
                  key={order.name}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(buildDetailPath(order.name))}
                >
                  <td className="font-medium text-brand-700 dark:text-brand-300">{order.name}</td>
                  <td className="text-gray-700 dark:text-slate-300">{order.customer_name || order.customer || '—'}</td>
                  <td className="text-gray-500 dark:text-slate-400">{formatDate(order.transaction_date)}</td>
                  <td className="text-gray-500 dark:text-slate-400">{formatDate(order.delivery_date)}</td>
                  <td className="num font-medium text-gray-900 dark:text-gray-100">{formatCurrency(order.grand_total, order.currency)}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={order.status || (order.docstatus === 0 ? 'Draft' : 'Submitted')} />
                      {(order.linked_invoice_count || 0) > 0 && (
                        <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {order.linked_invoice_count} invoice{order.linked_invoice_count === 1 ? '' : 's'}
                        </span>
                      )}
                      {(order.unpaid_invoice_count || 0) > 0 && (
                        <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          {order.unpaid_invoice_count} unpaid
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {order.customer ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(buildSalesDispatchPrefill(order, listSearch));
                            }}
                            className="btn-secondary text-xs"
                          >
                            <PackageOpen className="mr-1 inline h-3.5 w-3.5" /> Dispatch
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(buildSalesInvoicePrefill(order, listSearch));
                            }}
                            className="btn-primary text-xs"
                          >
                            Create Invoice
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(appendPreservedListQuery(`/customers/${encodeURIComponent(order.customer)}`, listSearch));
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
          <LoadingBlock compact label="Loading sales orders…" />
        ) : filteredOrders.length === 0 ? (
          <EmptyState compact title="No sales orders found" description={search || status !== 'All' || workflow ? 'Try adjusting filters or search.' : undefined} />
        ) : (
          filteredOrders.map((order) => (
            <div key={order.name} className="px-4 py-3 space-y-1.5 active:bg-gray-50" onClick={() => navigate(buildDetailPath(order.name))}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-700 dark:text-brand-300">{order.name}</span>
                <StatusBadge status={order.status || (order.docstatus === 0 ? 'Draft' : 'Submitted')} />
              </div>
              <div className="text-xs text-gray-500 truncate">{order.customer_name || order.customer || '—'}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{formatDate(order.transaction_date)}</span>
                <span className="font-medium text-gray-900">{formatCurrency(order.grand_total, order.currency)}</span>
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
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileText, PackageOpen, Plus, Search, ShoppingCart, TrendingUp } from 'lucide-react';
import { salesApi } from '../lib/api';
import { appendPreservedListQuery, debounce, formatCurrency, formatDate, formatCompact, getStatusColor } from '../lib/utils';

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
      <div>
        <h1 className="page-title">Sales Orders</h1>
        <p className="mt-1 text-gray-500 text-sm">Manage confirmed selling commitments between quotations and final invoicing.</p>
      </div>

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

      <div className="flex justify-end">
        <button onClick={() => navigate('/sales/orders/new')} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="h-4 w-4" /> New Sales Order
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <StatCard icon={ShoppingCart} label="Total Orders" value={total.toLocaleString()} color="blue" />
        <StatCard icon={TrendingUp} label="Visible Order Value" value={formatCompact(visibleValue)} color="green" />
        <StatCard icon={FileText} label="Draft Orders" value={draftOrders.toLocaleString()} color="amber" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide rounded-lg bg-gray-100 p-1 w-full sm:w-auto">
          {STATUS_TABS.map((entry) => (
            <button
              key={entry}
              onClick={() => {
                updateSearchParams({ status: entry === 'All' ? null : entry, page: null });
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                status === entry ? 'bg-white text-brand-700 shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {entry}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search sales orders..." defaultValue={search} onChange={(e) => debouncedSearch(e.target.value)} className="input-field pl-9" />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block table-container">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Order</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Delivery</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No sales orders found.</td></tr>
            ) : (
              filteredOrders.map((order) => (
                <tr
                  key={order.name}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(buildDetailPath(order.name))}
                >
                  <td className="px-6 py-3 text-sm font-medium text-brand-700">{order.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{order.customer_name || order.customer || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatDate(order.transaction_date)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatDate(order.delivery_date)}</td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(order.grand_total, order.currency)}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status || (order.docstatus === 0 ? 'Draft' : 'Submitted')}
                      </span>
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
      <div className="md:hidden card divide-y divide-gray-100">
        {loading ? (
          <div className="px-4 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-400 text-sm">No sales orders found.</div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.name} className="px-4 py-3 space-y-1.5 active:bg-gray-50" onClick={() => navigate(buildDetailPath(order.name))}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-700">{order.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(order.status)}`}>
                  {order.status || (order.docstatus === 0 ? 'Draft' : 'Submitted')}
                </span>
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
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, FilePlus2, FileText, DollarSign, TrendingUp, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { salesApi } from '../lib/api';
import { appendPreservedListQuery, debounce, downloadTextFile, formatCurrency, formatDate, formatCompact, getStatusColor, toCsv } from '../lib/utils';

const STATUS_TABS = ['All', 'Unpaid', 'Paid', 'Overdue', 'Draft'];

export default function SalesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const status = searchParams.get('status') || 'All';
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

  const buildDetailPath = (invoiceName: string) => {
    return appendPreservedListQuery(`/sales/${encodeURIComponent(invoiceName)}`, listSearch);
  };

  const buildReturnPath = (invoice: any) => {
    const params = new URLSearchParams();

    if (invoice.name) params.set('invoiceName', invoice.name);
    if (invoice.customer) params.set('customer', invoice.customer);
    if (invoice.posting_date) params.set('postingDate', invoice.posting_date);
    if (invoice.due_date) params.set('dueDate', invoice.due_date);
    if (listSearch) params.set('list', listSearch);

    const query = params.toString();
    return `/sales/returns/new${query ? `?${query}` : ''}`;
  };

  const handleExport = () => {
    const content = toCsv(
      invoices.map((invoice) => ({
        invoice: invoice.name,
        customer: invoice.customer_name || invoice.customer,
        posting_date: invoice.posting_date,
        status: invoice.status,
        grand_total: invoice.grand_total,
        outstanding_amount: invoice.outstanding_amount,
      })),
    );

    downloadTextFile(`sales-invoices-page-${page}.csv`, content || '');
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, page_size: pageSize };
      if (status !== 'All') params.status = status;
      if (search) params.search = search;

      const [invoiceRes, summaryRes] = await Promise.all([
        salesApi.getInvoices(params),
        salesApi.getSummary(),
      ]);

      const d = invoiceRes.data.message;
      setInvoices(d.data || []);
      setTotal(d.total || 0);
      setSummary(summaryRes.data.message);
    } catch (err) {
      console.error('Failed to load sales data:', err);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      updateSearchParams({ search: value || null, page: null });
    }, 400),
    [searchParams],
  );

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
        <p className="text-gray-500 mt-1">Manage sales invoices and orders</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button onClick={handleExport} disabled={loading || invoices.length === 0} className="btn-secondary flex items-center gap-2 disabled:opacity-60">
          <Download className="h-4 w-4" /> Export Visible
        </button>
        <button onClick={() => navigate(appendPreservedListQuery('/sales/new', listSearch))} className="btn-primary flex items-center gap-2">
          <FilePlus2 className="h-4 w-4" /> New Sales Invoice
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Invoices" value={summary?.total_invoices} color="blue" />
        <StatCard icon={TrendingUp} label="Monthly Sales" value={summary?.monthly_sales} format="currency" color="green" />
        <StatCard icon={AlertCircle} label="Outstanding" value={summary?.total_outstanding} format="currency" color="red" />
        <StatCard icon={DollarSign} label="Avg Order Value" value={summary?.avg_order_value} format="currency" color="purple" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => {
                updateSearchParams({ status: s === 'All' ? null : s, page: null });
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                status === s ? 'bg-white shadow text-brand-700' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            defaultValue={search}
            onChange={(e) => debouncedSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Outstanding</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No invoices found.</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr
                  key={inv.name}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(buildDetailPath(inv.name))}
                >
                  <td className="px-6 py-3 text-sm font-medium text-brand-700">{inv.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{inv.customer_name || inv.customer}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatDate(inv.posting_date)}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(inv.grand_total)}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium text-red-600">{formatCurrency(inv.outstanding_amount)}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {!inv.is_return && inv.docstatus === 1 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(buildReturnPath(inv));
                          }}
                          className="btn-secondary text-xs"
                        >
                          Create Return
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">{inv.is_return ? 'Return' : '—'}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}</span>
          <div className="flex gap-1">
            <button onClick={() => updateSearchParams({ page: page > 2 ? String(page - 1) : null })} disabled={page === 1} className="btn-secondary px-2 py-1 text-xs">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => updateSearchParams({ page: String(Math.min(totalPages, page + 1)) })} disabled={page === totalPages} className="btn-secondary px-2 py-1 text-xs">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Small Stat Card ──────────────────────────────── */

function StatCard({ icon: Icon, label, value, format, color = 'blue' }: {
  icon: any; label: string; value: any; format?: string; color?: string;
}) {
  const bg = `bg-${color}-50`;
  const ic = `text-${color}-600`;
  const display = value == null
    ? '—'
    : format === 'currency'
      ? formatCompact(value)
      : (value ?? 0).toLocaleString();

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2 ${bg} rounded-lg`}><Icon className={`w-5 h-5 ${ic}`} /></div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{display}</p>
        </div>
      </div>
    </div>
  );
}

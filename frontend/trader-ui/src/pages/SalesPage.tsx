import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, DollarSign, TrendingUp, AlertCircle, Plus } from 'lucide-react';
import { salesApi } from '../lib/api';
import { formatCurrency, formatDate, debounce } from '../lib/utils';
import { documentTypeBadge } from '../lib/invoiceTypes';
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

const STATUS_TABS = ['All', 'Unpaid', 'Paid', 'Overdue', 'Draft'];

export default function SalesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const pageSize = 15;

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
    debounce((val: string) => { setSearch(val); setPage(1); }, 400),
    [],
  );

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Sales"
        description="Manage sales invoices and orders"
        actions={
          <button type="button" onClick={() => navigate('/sales/documents/new')} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" aria-hidden="true" /> New Document
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={FileText} label="Total Invoices" value={summary?.total_invoices} color="blue" />
        <StatCard icon={TrendingUp} label="Monthly Sales" value={summary?.monthly_sales} format="currency" color="green" />
        <StatCard icon={AlertCircle} label="Outstanding" value={summary?.total_outstanding} format="currency" color="red" />
        <StatCard icon={DollarSign} label="Avg Order Value" value={summary?.avg_order_value} format="currency" color="purple" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <FilterTabs
          options={STATUS_TABS}
          value={status}
          onChange={(s) => { setStatus(s); setPage(1); }}
          ariaLabel="Invoice status"
        />
        <SearchField
          placeholder="Search invoices..."
          aria-label="Search invoices"
          onChange={debouncedSearch}
        />
      </div>

      <div className="hidden md:block table-container">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th scope="col">Invoice</th>
              <th scope="col">Type</th>
              <th scope="col">Customer</th>
              <th scope="col">Date</th>
              <th scope="col" className="text-right">Amount</th>
              <th scope="col" className="text-right">Outstanding</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <LoadingBlock compact label="Loading invoices…" />
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    compact
                    title="No invoices found"
                    description={search || status !== 'All' ? 'Try adjusting filters or search.' : 'Create a sales document to get started.'}
                    action={
                      <button type="button" className="btn-primary" onClick={() => navigate('/sales/documents/new')}>
                        New Document
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr
                  key={inv.name}
                  className="cursor-pointer"
                  onClick={() => navigate(`/sales/${encodeURIComponent(inv.name)}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/sales/${encodeURIComponent(inv.name)}`);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                >
                  <td className="font-medium text-brand-700 dark:text-brand-300">{inv.name}</td>
                  <td className="text-gray-600 dark:text-slate-300">{documentTypeBadge(inv.trader_invoice_type, inv.is_return)}</td>
                  <td>{inv.customer_name || inv.customer}</td>
                  <td className="text-gray-500 dark:text-slate-400">{formatDate(inv.posting_date)}</td>
                  <td className="num font-medium text-gray-900 dark:text-gray-100">{formatCurrency(inv.grand_total)}</td>
                  <td className="num font-medium text-red-600">{formatCurrency(inv.outstanding_amount)}</td>
                  <td><StatusBadge status={inv.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden card divide-y divide-gray-100 dark:divide-slate-800">
        {loading ? (
          <LoadingBlock compact label="Loading invoices…" />
        ) : invoices.length === 0 ? (
          <EmptyState
            compact
            title="No invoices found"
            description={search || status !== 'All' ? 'Try adjusting filters or search.' : 'Create a sales document to get started.'}
          />
        ) : (
          invoices.map((inv) => (
            <button
              type="button"
              key={inv.name}
              className="w-full px-4 py-3 space-y-1.5 text-left active:bg-gray-50 dark:active:bg-slate-800"
              onClick={() => navigate(`/sales/${encodeURIComponent(inv.name)}`)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-brand-700 dark:text-brand-300">{inv.name}</span>
                <StatusBadge status={inv.status} />
              </div>
              <div className="text-xs text-gray-500 truncate dark:text-slate-400">{inv.customer_name || inv.customer}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{formatDate(inv.posting_date)}</span>
                <div className="flex gap-3 tabular-nums">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(inv.grand_total)}</span>
                  {inv.outstanding_amount > 0 && (
                    <span className="font-medium text-red-600">{formatCurrency(inv.outstanding_amount)}</span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, DollarSign, Truck, AlertCircle, Plus } from 'lucide-react';
import { purchasesApi } from '../lib/api';
import { formatCurrency, formatDate, debounce } from '../lib/utils';
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

export default function PurchasesPage() {
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
        purchasesApi.getInvoices(params),
        purchasesApi.getSummary(),
      ]);

      const d = invoiceRes.data.message;
      setInvoices(d.data || []);
      setTotal(d.total || 0);
      setSummary(summaryRes.data.message);
    } catch (err) {
      console.error('Failed to load purchases data:', err);
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
        title="Purchases"
        description="Manage purchase invoices and orders"
        actions={
          <>
            <button type="button" onClick={() => navigate('/purchases/returns/new')} className="btn-secondary flex items-center gap-2 text-sm">
              New Return
            </button>
            <button type="button" onClick={() => navigate('/purchases/documents/new')} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" aria-hidden="true" /> New Document
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={FileText} label="Total Invoices" value={summary?.total_invoices} color="blue" />
        <StatCard icon={DollarSign} label="Monthly Purchases" value={summary?.monthly_purchases} format="currency" color="green" />
        <StatCard icon={AlertCircle} label="Outstanding Payable" value={summary?.total_outstanding} format="currency" color="red" />
        <StatCard icon={Truck} label="Active Suppliers" value={summary?.total_suppliers} color="purple" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <FilterTabs
          options={STATUS_TABS}
          value={status}
          onChange={(s) => { setStatus(s); setPage(1); }}
          ariaLabel="Purchase invoice status"
        />
        <SearchField
          placeholder="Search purchases..."
          aria-label="Search purchases"
          onChange={debouncedSearch}
        />
      </div>

      <div className="hidden md:block table-container">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th scope="col">Invoice</th>
              <th scope="col">Supplier</th>
              <th scope="col">Date</th>
              <th scope="col" className="text-right">Amount</th>
              <th scope="col" className="text-right">Outstanding</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <LoadingBlock compact label="Loading invoices…" />
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    compact
                    title="No invoices found"
                    description={search || status !== 'All' ? 'Try adjusting filters or search.' : 'Create a purchase document to get started.'}
                    action={
                      <button type="button" className="btn-primary" onClick={() => navigate('/purchases/documents/new')}>
                        New Document
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.name}>
                  <td className="font-medium text-brand-700 dark:text-brand-300">{inv.name}</td>
                  <td className="text-gray-700 dark:text-slate-300">{inv.supplier_name || inv.supplier}</td>
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
            description={search || status !== 'All' ? 'Try adjusting filters or search.' : undefined}
          />
        ) : (
          invoices.map((inv) => (
            <div key={inv.name} className="px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-700 dark:text-brand-300">{inv.name}</span>
                <StatusBadge status={inv.status} />
              </div>
              <div className="text-xs text-gray-500 truncate dark:text-slate-400">{inv.supplier_name || inv.supplier}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 dark:text-slate-500">{formatDate(inv.posting_date)}</span>
                <div className="flex gap-3 tabular-nums">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(inv.grand_total)}</span>
                  {inv.outstanding_amount > 0 && (
                    <span className="font-medium text-red-600">{formatCurrency(inv.outstanding_amount)}</span>
                  )}
                </div>
              </div>
            </div>
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

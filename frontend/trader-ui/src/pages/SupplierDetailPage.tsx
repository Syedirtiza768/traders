import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, CreditCard, Edit, Globe, Ban, Mail, Package, Phone, ReceiptText, Truck } from 'lucide-react';
import { suppliersApi } from '../lib/api';
import { appendPreservedListQuery, formatCurrency, formatDate, getStatusColor, isOperationsContext, isReportContext } from '../lib/utils';

type SupplierDetail = Record<string, any>;

export default function SupplierDetailPage() {
  const navigate = useNavigate();
  const { supplierId } = useParams();
  const [searchParams] = useSearchParams();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!supplierId) {
        setError('Supplier not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const decodedId = decodeURIComponent(supplierId);
        const [detailRes, txRes] = await Promise.all([
          suppliersApi.getDetail(decodedId),
          suppliersApi.getTransactions(decodedId, { page: 1, page_size: 8 }),
        ]);
        setSupplier(detailRes.data.message);
        setTransactions(txRes.data.message?.data || []);
      } catch (err) {
        console.error('Failed to load supplier detail:', err);
        setError('Could not load supplier details at the moment.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [supplierId]);

  const handleToggleDisable = async () => {
    if (!supplier?.name) return;
    const isCurrentlyDisabled = supplier.disabled === 1;
    const action = isCurrentlyDisabled ? 'enable' : 'disable';
    if (!isCurrentlyDisabled && !window.confirm('Are you sure you want to disable this supplier?')) return;

    setToggling(true);
    setFeedback(null);
    try {
      if (isCurrentlyDisabled) {
        await suppliersApi.enable(supplier.name);
      } else {
        await suppliersApi.disable(supplier.name);
      }
      const decodedId = decodeURIComponent(supplierId!);
      const detailRes = await suppliersApi.getDetail(decodedId);
      setSupplier(detailRes.data.message);
      setFeedback({ type: 'success', message: `Supplier ${action}d successfully.` });
    } catch (err) {
      console.error(`Failed to ${action} supplier:`, err);
      setFeedback({ type: 'error', message: `Could not ${action} this supplier.` });
    } finally {
      setToggling(false);
    }
  };

  const listSearch = searchParams.get('list');
  const backToPath = useMemo(() => {
    if (!listSearch) {
      return '/suppliers';
    }

    if (isReportContext(listSearch)) {
      return `/reports?${listSearch}`;
    }

    if (isOperationsContext(listSearch)) {
      return `/operations?${listSearch}`;
    }

    return `/suppliers?${listSearch}`;
  }, [listSearch]);
  const backLabel = backToPath.startsWith('/reports')
    ? 'Back to Reports'
    : backToPath.startsWith('/operations')
      ? 'Back to Operations'
      : 'Back to Suppliers';

  const buildInvoiceDetailPath = (invoiceName: string) => {
    return appendPreservedListQuery(`/purchases/${encodeURIComponent(invoiceName)}`, listSearch);
  };

  if (loading) {
    return <div className="py-16 flex justify-center"><div className="spinner" /></div>;
  }

  if (error || !supplier) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(backToPath)} className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </button>
        <div className="card p-8 text-center text-gray-500">{error || 'Supplier not found.'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => navigate(backToPath)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </button>
          <h1 className="page-title">{supplier.supplier_name || supplier.name}</h1>
          <p className="mt-1 text-gray-500">Supplier 360 view for `{supplier.name}`</p>
        </div>
        <div className="rounded-full px-3 py-1 text-sm font-medium bg-purple-50 text-purple-700">
          {supplier.supplier_group || 'Supplier'}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate(appendPreservedListQuery(`/suppliers/${encodeURIComponent(supplier.name)}/edit`, listSearch))}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={handleToggleDisable}
          disabled={toggling}
          className="btn-secondary inline-flex items-center gap-2 text-amber-700 hover:text-amber-800 disabled:opacity-60"
        >
          <Ban className="w-4 h-4" /> {supplier.disabled ? (toggling ? 'Enabling…' : 'Enable') : (toggling ? 'Disabling…' : 'Disable')}
        </button>
        {(supplier.outstanding_amount || 0) > 0 && (
          <button
            onClick={() => navigate(appendPreservedListQuery(`/finance/payments/new?paymentType=Pay&partyType=Supplier&party=${encodeURIComponent(supplier.name)}&amount=${encodeURIComponent(String(supplier.outstanding_amount || 0))}`, listSearch))}
            className="btn-primary"
          >
            Pay Supplier Balance
          </button>
        )}
      </div>

      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm ${feedback.type === 'success' ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailKPI icon={Truck} label="Total Purchases" value={formatCurrency(supplier.total_purchases)} tone="green" />
        <DetailKPI icon={CreditCard} label="Outstanding" value={formatCurrency(supplier.outstanding_amount)} tone="red" />
        <DetailKPI icon={ReceiptText} label="Invoices" value={String(supplier.invoice_count ?? 0)} tone="blue" />
        <DetailKPI icon={Globe} label="Country" value={supplier.country || '—'} tone="purple" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
            <p className="text-sm text-gray-500">Master data and contact basics</p>
          </div>
          <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoRow icon={Building2} label="Supplier Name" value={supplier.supplier_name || supplier.name} />
            <InfoRow icon={Package} label="Supplier Group" value={supplier.supplier_group || '—'} />
            <InfoRow icon={Globe} label="Country" value={supplier.country || '—'} />
            <InfoRow icon={Phone} label="Mobile" value={supplier.mobile_no || '—'} />
            <InfoRow icon={Mail} label="Email" value={supplier.email_id || '—'} />
            <InfoRow icon={ReceiptText} label="Tax ID" value={supplier.tax_id || supplier.tax_id_number || '—'} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Commercial Summary</h2>
            <p className="text-sm text-gray-500">Payables and vendor context</p>
          </div>
          <div className="card-body space-y-4">
            <SummaryLine label="Default Currency" value={supplier.default_currency || 'PKR'} />
            <SummaryLine label="Payment Terms" value={supplier.payment_terms || '—'} />
            <SummaryLine label="Supplier Type" value={supplier.supplier_type || '—'} />
            <SummaryLine label="Disabled" value={supplier.disabled ? 'Yes' : 'No'} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          <p className="text-sm text-gray-500">Latest posted purchase invoices for this supplier</p>
        </div>
        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Outstanding</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400">No recent transactions found.</td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-brand-700">
                        <button
                          onClick={() => navigate(buildInvoiceDetailPath(tx.name))}
                          className="hover:text-brand-800 hover:underline"
                        >
                          {tx.name}
                        </button>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{formatDate(tx.posting_date)}</td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(tx.grand_total)}</td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-red-600">{formatCurrency(tx.outstanding_amount)}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(tx.status)}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {(tx.outstanding_amount || 0) > 0 ? (
                          <button
                            onClick={() => navigate(`/finance/payments/new?paymentType=Pay&partyType=Supplier&party=${encodeURIComponent(supplier.name)}&amount=${encodeURIComponent(String(tx.outstanding_amount || 0))}&referenceName=${encodeURIComponent(tx.name)}${listSearch ? `&list=${encodeURIComponent(listSearch)}` : ''}`)}
                            className="btn-secondary text-xs"
                          >
                            Pay Now
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Settled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {transactions.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">No recent transactions found.</p>
          ) : (
            transactions.map((tx) => (
              <div key={`m-${tx.name}`} className="px-4 py-3">
                <div className="flex justify-between items-start gap-2">
                  <button
                    onClick={() => navigate(buildInvoiceDetailPath(tx.name))}
                    className="text-sm font-medium text-brand-700 hover:underline truncate"
                  >
                    {tx.name}
                  </button>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${getStatusColor(tx.status)}`}>
                    {tx.status}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">{formatDate(tx.posting_date)}</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(tx.grand_total)}</span>
                </div>
                {(tx.outstanding_amount || 0) > 0 && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-red-600">Outstanding: {formatCurrency(tx.outstanding_amount)}</span>
                    <button
                      onClick={() => navigate(`/finance/payments/new?paymentType=Pay&partyType=Supplier&party=${encodeURIComponent(supplier.name)}&amount=${encodeURIComponent(String(tx.outstanding_amount || 0))}&referenceName=${encodeURIComponent(tx.name)}${listSearch ? `&list=${encodeURIComponent(listSearch)}` : ''}`)}
                      className="btn-secondary text-xs py-1 px-2"
                    >
                      Pay Now
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DetailKPI({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: 'blue' | 'green' | 'red' | 'purple'; }) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  } as const;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string; }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string; }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}
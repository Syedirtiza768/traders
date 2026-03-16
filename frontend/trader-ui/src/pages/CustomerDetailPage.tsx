import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, CreditCard, Edit, Mail, MapPin, Phone, ReceiptText, TrendingUp, User, Ban } from 'lucide-react';
import { customersApi } from '../lib/api';
import { appendPreservedListQuery, formatCurrency, formatDate, getStatusColor, isOperationsContext, isReportContext } from '../lib/utils';

type CustomerDetail = Record<string, any>;

export default function CustomerDetailPage() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const [searchParams] = useSearchParams();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!customerId) {
        setError('Customer not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const decodedId = decodeURIComponent(customerId);
        const [detailRes, txRes] = await Promise.all([
          customersApi.getDetail(decodedId),
          customersApi.getTransactions(decodedId, { page: 1, page_size: 8 }),
        ]);
        setCustomer(detailRes.data.message);
        setTransactions(txRes.data.message?.data || []);
      } catch (err) {
        console.error('Failed to load customer detail:', err);
        setError('Could not load customer details at the moment.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [customerId]);

  const handleToggleDisable = async () => {
    if (!customer?.name) return;
    const isCurrentlyDisabled = customer.disabled === 1;
    const action = isCurrentlyDisabled ? 'enable' : 'disable';
    if (!isCurrentlyDisabled && !window.confirm('Are you sure you want to disable this customer?')) return;

    setToggling(true);
    setFeedback(null);
    try {
      if (isCurrentlyDisabled) {
        await customersApi.enable(customer.name);
      } else {
        await customersApi.disable(customer.name);
      }
      // Reload customer
      const decodedId = decodeURIComponent(customerId!);
      const detailRes = await customersApi.getDetail(decodedId);
      setCustomer(detailRes.data.message);
      setFeedback({ type: 'success', message: `Customer ${action}d successfully.` });
    } catch (err) {
      console.error(`Failed to ${action} customer:`, err);
      setFeedback({ type: 'error', message: `Could not ${action} this customer.` });
    } finally {
      setToggling(false);
    }
  };

  const primaryAddress = useMemo(() => {
    const links = customer?.__onload?.addr_list;
    if (Array.isArray(links) && links.length > 0) return links[0];
    return null;
  }, [customer]);
  const listSearch = searchParams.get('list');
  const backToPath = useMemo(() => {
    if (!listSearch) {
      return '/customers';
    }

    if (isReportContext(listSearch)) {
      return `/reports?${listSearch}`;
    }

    if (isOperationsContext(listSearch)) {
      return `/operations?${listSearch}`;
    }

    return `/finance/customer-outstanding?${listSearch}`;
  }, [listSearch]);
  const backLabel = backToPath.startsWith('/reports')
    ? 'Back to Reports'
    : backToPath.startsWith('/operations')
      ? 'Back to Operations'
      : listSearch
        ? 'Back to Controller'
        : 'Back to Customers';

  const buildInvoiceDetailPath = (invoiceName: string) => {
    return appendPreservedListQuery(`/sales/${encodeURIComponent(invoiceName)}`, listSearch);
  };

  if (loading) {
    return <div className="py-16 flex justify-center"><div className="spinner" /></div>;
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(backToPath)} className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </button>
        <div className="card p-8 text-center text-gray-500">{error || 'Customer not found.'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => navigate(backToPath)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{customer.customer_name || customer.name}</h1>
          <p className="mt-1 text-gray-500">Customer 360 view for `{customer.name}`</p>
        </div>
        <div className="rounded-full px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700">
          {customer.customer_group || 'Customer'}
        </div>
      </div>

      {(customer.outstanding_amount || 0) > 0 && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => navigate(`/customers/${encodeURIComponent(customer.name)}/edit`)}
            className="btn-secondary flex items-center gap-2"
          >
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button
            onClick={handleToggleDisable}
            disabled={toggling}
            className="btn-secondary flex items-center gap-2 text-amber-700 hover:text-amber-800 disabled:opacity-60"
          >
            <Ban className="w-4 h-4" /> {customer.disabled ? (toggling ? 'Enabling…' : 'Enable') : (toggling ? 'Disabling…' : 'Disable')}
          </button>
          <button
            onClick={() => navigate(appendPreservedListQuery(`/finance/payments/new?paymentType=Receive&partyType=Customer&party=${encodeURIComponent(customer.name)}&amount=${encodeURIComponent(String(customer.outstanding_amount || 0))}`, listSearch))}
            className="btn-primary"
          >
            Collect Payment
          </button>
        </div>
      )}
      {!(customer.outstanding_amount > 0) && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => navigate(`/customers/${encodeURIComponent(customer.name)}/edit`)}
            className="btn-secondary flex items-center gap-2"
          >
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button
            onClick={handleToggleDisable}
            disabled={toggling}
            className="btn-secondary flex items-center gap-2 text-amber-700 hover:text-amber-800 disabled:opacity-60"
          >
            <Ban className="w-4 h-4" /> {customer.disabled ? (toggling ? 'Enabling…' : 'Enable') : (toggling ? 'Disabling…' : 'Disable')}
          </button>
        </div>
      )}

      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm ${feedback.type === 'success' ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailKPI icon={TrendingUp} label="Total Revenue" value={formatCurrency(customer.total_revenue)} tone="green" />
        <DetailKPI icon={CreditCard} label="Outstanding" value={formatCurrency(customer.outstanding_amount)} tone="red" />
        <DetailKPI icon={ReceiptText} label="Invoices" value={String(customer.invoice_count ?? 0)} tone="blue" />
        <DetailKPI icon={Building2} label="Territory" value={customer.territory || '—'} tone="purple" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
            <p className="text-sm text-gray-500">Master data and contact basics</p>
          </div>
          <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoRow icon={User} label="Customer Name" value={customer.customer_name || customer.name} />
            <InfoRow icon={Building2} label="Customer Group" value={customer.customer_group || '—'} />
            <InfoRow icon={MapPin} label="Territory" value={customer.territory || '—'} />
            <InfoRow icon={Phone} label="Mobile" value={customer.mobile_no || '—'} />
            <InfoRow icon={Mail} label="Email" value={customer.email_id || '—'} />
            <InfoRow icon={ReceiptText} label="Primary Address" value={primaryAddress?.address_display || primaryAddress?.address || '—'} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Commercial Summary</h2>
            <p className="text-sm text-gray-500">High-level billing context</p>
          </div>
          <div className="card-body space-y-4">
            <SummaryLine label="Default Currency" value={customer.default_currency || 'PKR'} />
            <SummaryLine label="Credit Limit" value={formatCurrency(customer.credit_limit)} />
            <SummaryLine label="Payment Terms" value={customer.payment_terms || '—'} />
            <SummaryLine label="Tax ID" value={customer.tax_id || customer.tax_id_number || '—'} />
            <SummaryLine label="Disabled" value={customer.disabled ? 'Yes' : 'No'} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          <p className="text-sm text-gray-500">Latest posted sales invoices for this customer</p>
        </div>
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
                          onClick={() => navigate(`/finance/payments/new?paymentType=Receive&partyType=Customer&party=${encodeURIComponent(customer.name)}&amount=${encodeURIComponent(String(tx.outstanding_amount || 0))}&referenceName=${encodeURIComponent(tx.name)}${listSearch ? `&list=${encodeURIComponent(listSearch)}` : ''}`)}
                          className="btn-secondary text-xs"
                        >
                          Collect
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
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, CreditCard, Edit, FilePlus2, Mail, MapPin, Phone, Plus, ReceiptText, TrendingUp, User, Ban, BookOpen, Trash2 } from 'lucide-react';
import { customersApi } from '../lib/api';
import { appendPreservedListQuery, formatCurrency, formatDate, getActiveCurrency, isOperationsContext, isReportContext } from '../lib/utils';
import { PageHeader, LoadingBlock, AlertBanner, StatusBadge, EmptyState } from '../components/ui';
import { useTenantStore } from '../stores/tenantStore';
import { useCompanyStore } from '../stores/companyStore';
import PartySettleModal from '../components/PartySettleModal';

type CustomerDetail = Record<string, any>;

export default function CustomerDetailPage() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const [searchParams] = useSearchParams();
  const daybookShell = useTenantStore((s) => s.getNavProfile()) === 'components_daybook';
  const customerPackEnabled = useCompanyStore((s) => s.customerPackEnabled);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ first_name: '', designation: '', email_id: '', mobile_no: '' });
  const [savingContact, setSavingContact] = useState(false);

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
    const list = customer?.addresses;
    if (Array.isArray(list) && list.length > 0) return list[0];
    const links = customer?.__onload?.addr_list;
    if (Array.isArray(links) && links.length > 0) return links[0];
    return null;
  }, [customer]);

  const contactsEnabled = Boolean(
    customerPackEnabled && (customer?.pack?.profile?.contacts_enabled ?? true),
  );

  const reloadCustomer = async () => {
    const decodedId = decodeURIComponent(customerId!);
    const [detailRes, txRes] = await Promise.all([
      customersApi.getDetail(decodedId),
      customersApi.getTransactions(decodedId, { page: 1, page_size: 8 }),
    ]);
    setCustomer(detailRes.data.message);
    setTransactions(txRes.data.message?.data || []);
  };

  const handleAddContact = async () => {
    if (!customer?.name || !contactForm.first_name.trim()) {
      setFeedback({ type: 'error', message: 'Contact name is required.' });
      return;
    }
    setSavingContact(true);
    setFeedback(null);
    try {
      await customersApi.addContact({
        customer: customer.name,
        first_name: contactForm.first_name,
        designation: contactForm.designation || undefined,
        email_id: contactForm.email_id || undefined,
        mobile_no: contactForm.mobile_no || undefined,
      });
      setContactForm({ first_name: '', designation: '', email_id: '', mobile_no: '' });
      await reloadCustomer();
      setFeedback({ type: 'success', message: 'Contact added.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.exception || 'Could not add contact.' });
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async (name: string) => {
    if (!customer?.name || !window.confirm('Delete this contact?')) return;
    try {
      await customersApi.deleteContact(name, customer.name);
      await reloadCustomer();
      setFeedback({ type: 'success', message: 'Contact deleted.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.exception || 'Could not delete contact.' });
    }
  };
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
    return <LoadingBlock label="Loading customer…" />;
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(backToPath)} className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </button>
        <AlertBanner tone="error">{error || 'Customer not found.'}</AlertBanner>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <button onClick={() => navigate(backToPath)} className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </button>

      <PageHeader
        title={customer.customer_name || customer.name}
        description={<>Customer 360 view for <code className="text-sm">{customer.name}</code></>}
        meta={<StatusBadge status={customer.customer_group || 'Customer'} />}
      />

      <div className="flex flex-wrap justify-end gap-2">
        {daybookShell ? (
          <>
            <button
              onClick={() => navigate('/finance/day-book')}
              className="btn-secondary flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" /> Day Book
            </button>
            <button
              onClick={() => navigate(`/customers/${encodeURIComponent(customer.name)}/edit`)}
              className="btn-secondary flex items-center gap-2"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={() => navigate(appendPreservedListQuery(`/customers/${encodeURIComponent(customer.name)}/statement`, listSearch))}
              className="btn-secondary flex items-center gap-2"
            >
              <ReceiptText className="w-4 h-4" /> Statement
            </button>
            {(customer.outstanding_amount || 0) > 0 && (
              <button onClick={() => setSettleOpen(true)} className="btn-primary">
                Receive / Settle
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => navigate(`/sales/new?customer=${encodeURIComponent(customer.name)}`)}
              className="btn-secondary flex items-center gap-2"
            >
              <FilePlus2 className="w-4 h-4" /> New Invoice
            </button>
            <button
              onClick={() => navigate(`/sales/orders/new?customer=${encodeURIComponent(customer.name)}`)}
              className="btn-secondary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Order
            </button>
            <button
              onClick={() => navigate(appendPreservedListQuery(`/customers/${encodeURIComponent(customer.name)}/statement`, listSearch))}
              className="btn-secondary flex items-center gap-2"
            >
              <ReceiptText className="w-4 h-4" /> Statement
            </button>
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
            {(customer.outstanding_amount || 0) > 0 && (
              <button
                onClick={() => navigate(appendPreservedListQuery(`/finance/payments/new?paymentType=Receive&partyType=Customer&party=${encodeURIComponent(customer.name)}&amount=${encodeURIComponent(String(customer.outstanding_amount || 0))}`, listSearch))}
                className="btn-primary"
              >
                Collect Payment
              </button>
            )}
          </>
        )}
      </div>

      {feedback && (
        <AlertBanner tone={feedback.type === 'success' ? 'success' : 'error'}>{feedback.message}</AlertBanner>
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
            <InfoRow icon={Building2} label="Doing Business As" value={customer.trader_dba || '—'} />
            <InfoRow icon={Building2} label="Customer Group" value={customer.customer_group || '—'} />
            <InfoRow icon={MapPin} label="Territory" value={customer.territory || '—'} />
            <InfoRow icon={Phone} label="Mobile" value={customer.mobile_no || '—'} />
            <InfoRow icon={Mail} label="Email" value={customer.email_id || '—'} />
            <InfoRow icon={ReceiptText} label="Short Code" value={customer.trader_short_code || '—'} />
            <InfoRow icon={CreditCard} label="Opening Balance" value={formatCurrency(customer.trader_opening_balance)} />
            <InfoRow icon={ReceiptText} label="Primary Address" value={primaryAddress?.address_display || [primaryAddress?.address_line1, primaryAddress?.city].filter(Boolean).join(', ') || '—'} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Commercial Summary</h2>
            <p className="text-sm text-gray-500">High-level billing context</p>
          </div>
          <div className="card-body space-y-4">
            <SummaryLine label="Default Currency" value={customer.default_currency || getActiveCurrency()} />
            <SummaryLine label="Credit Limit" value={formatCurrency(customer.credit_limit)} />
            <SummaryLine label="Payment Terms" value={customer.payment_terms || '—'} />
            <SummaryLine label="Tax ID" value={customer.tax_id || customer.tax_id_number || '—'} />
            <SummaryLine label="Disabled" value={customer.disabled ? 'Yes' : 'No'} />
          </div>
        </div>
      </div>

      {contactsEnabled && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>
            <p className="text-sm text-gray-500">People linked to this customer (buyer, accounts, site)</p>
          </div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <input
                className="input-field"
                placeholder="Name *"
                value={contactForm.first_name}
                onChange={(e) => setContactForm((c) => ({ ...c, first_name: e.target.value }))}
              />
              <input
                className="input-field"
                placeholder="Role / designation"
                value={contactForm.designation}
                onChange={(e) => setContactForm((c) => ({ ...c, designation: e.target.value }))}
              />
              <input
                className="input-field"
                placeholder="Email"
                value={contactForm.email_id}
                onChange={(e) => setContactForm((c) => ({ ...c, email_id: e.target.value }))}
              />
              <div className="flex gap-2">
                <input
                  className="input-field flex-1"
                  placeholder="Mobile"
                  value={contactForm.mobile_no}
                  onChange={(e) => setContactForm((c) => ({ ...c, mobile_no: e.target.value }))}
                />
                <button onClick={handleAddContact} disabled={savingContact} className="btn-primary whitespace-nowrap disabled:opacity-60">
                  {savingContact ? '…' : 'Add'}
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
              {(customer.contacts || []).length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">No contacts yet.</p>
              ) : (
                (customer.contacts || []).map((c: any) => (
                  <div key={c.name} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {[c.first_name, c.last_name].filter(Boolean).join(' ')}
                        {c.designation ? <span className="text-gray-500 font-normal"> · {c.designation}</span> : null}
                      </p>
                      <p className="text-xs text-gray-500">
                        {[c.email_id || c.email, c.mobile_no || c.phone].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteContact(c.name)}
                      className="btn-secondary text-xs text-red-600 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          <p className="text-sm text-gray-500">Latest posted sales invoices for this customer</p>
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
                    <td colSpan={6} className="p-0">
                      <EmptyState compact title="No recent transactions found." />
                    </td>
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
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        {(tx.outstanding_amount || 0) > 0 ? (
                          <button
                            onClick={() => {
                              if (daybookShell) {
                                setSettleOpen(true);
                                return;
                              }
                              navigate(`/finance/payments/new?paymentType=Receive&partyType=Customer&party=${encodeURIComponent(customer.name)}&amount=${encodeURIComponent(String(tx.outstanding_amount || 0))}&referenceName=${encodeURIComponent(tx.name)}${listSearch ? `&list=${encodeURIComponent(listSearch)}` : ''}`);
                            }}
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
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {transactions.length === 0 ? (
            <EmptyState compact title="No recent transactions found." />
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
                  <StatusBadge status={tx.status} className="text-[10px]" />
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">{formatDate(tx.posting_date)}</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(tx.grand_total)}</span>
                </div>
                {(tx.outstanding_amount || 0) > 0 && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-red-600">Outstanding: {formatCurrency(tx.outstanding_amount)}</span>
                    <button
                      onClick={() => {
                        if (daybookShell) {
                          setSettleOpen(true);
                          return;
                        }
                        navigate(`/finance/payments/new?paymentType=Receive&partyType=Customer&party=${encodeURIComponent(customer.name)}&amount=${encodeURIComponent(String(tx.outstanding_amount || 0))}&referenceName=${encodeURIComponent(tx.name)}${listSearch ? `&list=${encodeURIComponent(listSearch)}` : ''}`);
                      }}
                      className="btn-secondary text-xs py-1 px-2"
                    >
                      Collect
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      {settleOpen && (
        <PartySettleModal
          partyType="Customer"
          party={customer.name}
          partyName={customer.customer_name || customer.name}
          balance={Number(customer.outstanding_amount) || 0}
          variant="receive"
          onClose={() => setSettleOpen(false)}
          onSuccess={(message) => {
            setFeedback({ type: 'success', message });
            setSettleOpen(false);
            void (async () => {
              const decodedId = decodeURIComponent(customerId!);
              const [detailRes, txRes] = await Promise.all([
                customersApi.getDetail(decodedId),
                customersApi.getTransactions(decodedId, { page: 1, page_size: 8 }),
              ]);
              setCustomer(detailRes.data.message);
              setTransactions(txRes.data.message?.data || []);
            })();
          }}
        />
      )}
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
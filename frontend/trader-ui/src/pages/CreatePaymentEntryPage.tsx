import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { customersApi, financeApi, suppliersApi } from '../lib/api';
import { appendPreservedListQuery, formatCurrency, formatDate, isFilterListContext, isOperationsContext, isReportContext, isWorkflowContext } from '../lib/utils';

type PartyTransaction = {
  name: string;
  posting_date?: string;
  grand_total?: number;
  outstanding_amount?: number;
  status?: string;
};

type PaymentMode = {
  name: string;
  type?: string;
};

export default function CreatePaymentEntryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBootstrappingFromQuery = useRef(true);
  const [paymentType, setPaymentType] = useState<'Receive' | 'Pay'>('Receive');
  const [partyType, setPartyType] = useState<'Customer' | 'Supplier'>('Customer');
  const [party, setParty] = useState('');
  const [amount, setAmount] = useState(0);
  const [postingDate, setPostingDate] = useState(today());
  const [modeOfPayment, setModeOfPayment] = useState('Cash');
  const [referenceDoctype, setReferenceDoctype] = useState('');
  const [referenceName, setReferenceName] = useState('');
  const [parties, setParties] = useState<any[]>([]);
  const [references, setReferences] = useState<PartyTransaction[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [accountDefaults, setAccountDefaults] = useState<Record<string, string>>({});
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listSearch = searchParams.get('list');
  const backToPath = useMemo(() => {
    if (!listSearch) {
      return '/finance/payments';
    }

    if (isReportContext(listSearch)) {
      return `/reports?${listSearch}`;
    }
    if (isOperationsContext(listSearch)) {
      return `/operations?${listSearch}`;
    }
    if (isFilterListContext(listSearch)) {
      if (searchParams.get('partyType') === 'Supplier' || searchParams.get('paymentType') === 'Pay') {
        return `/suppliers?${listSearch}`;
      }
      if (searchParams.get('partyType') === 'Customer' || searchParams.get('paymentType') === 'Receive') {
        return `/customers?${listSearch}`;
      }
    }
    if (isWorkflowContext(listSearch)) {
      return (searchParams.get('partyType') === 'Supplier' || searchParams.get('paymentType') === 'Pay')
        ? `/purchases/orders?${listSearch}`
        : `/sales/orders?${listSearch}`;
    }

    return '/finance/payments';
  }, [listSearch, searchParams]);
  const backLabel = backToPath.startsWith('/reports')
    ? 'Back to Reports'
    : backToPath.startsWith('/operations')
      ? 'Back to Operations'
      : backToPath.startsWith('/customers')
        ? 'Back to Customers'
        : backToPath.startsWith('/suppliers')
          ? 'Back to Suppliers'
          : backToPath.startsWith('/sales/orders')
            ? 'Back to Sales Orders'
            : backToPath.startsWith('/purchases/orders')
              ? 'Back to Purchase Orders'
              : 'Back to Payment Entries';

  useEffect(() => {
    const paymentTypeParam = searchParams.get('paymentType');
    const partyTypeParam = searchParams.get('partyType');
    const partyParam = searchParams.get('party');
    const amountParam = searchParams.get('amount');
    const postingDateParam = searchParams.get('postingDate');
    const referenceNameParam = searchParams.get('referenceName');

    if (paymentTypeParam === 'Receive' || paymentTypeParam === 'Pay') {
      setPaymentType(paymentTypeParam);
    }
    if (partyTypeParam === 'Customer' || partyTypeParam === 'Supplier') {
      setPartyType(partyTypeParam);
    }
    if (partyParam) {
      setParty(partyParam);
    }
    if (amountParam && !Number.isNaN(Number(amountParam))) {
      setAmount(Number(amountParam));
    }
    if (postingDateParam) {
      setPostingDate(postingDateParam);
    }
    if (referenceNameParam) {
      setReferenceName(referenceNameParam);
    }

    isBootstrappingFromQuery.current = false;
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [partyResponse, setupResponse] = await Promise.all([
          partyType === 'Customer'
            ? customersApi.getList({ page: 1, page_size: 100 })
            : suppliersApi.getList({ page: 1, page_size: 100 }),
          financeApi.getPaymentEntrySetup(),
        ]);
        setParties(partyResponse.data.message?.data || []);
        setPaymentModes(setupResponse.data.message?.modes || []);
        setAccountDefaults(setupResponse.data.message?.defaults || {});
      } catch (err) {
        console.error('Failed to load payment form data:', err);
        setError('Could not load available parties and payment settings.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [partyType]);

  useEffect(() => {
    if (paymentType === 'Receive') {
      setPartyType('Customer');
      setReferenceDoctype('Sales Invoice');
    } else {
      setPartyType('Supplier');
      setReferenceDoctype('Purchase Invoice');
    }

    if (isBootstrappingFromQuery.current) {
      return;
    }

    setParty('');
    setReferenceName('');
    setReferences([]);
  }, [paymentType]);

  useEffect(() => {
    const loadReferences = async () => {
      if (!party) {
        setReferences([]);
        setReferenceName('');
        return;
      }

      setLoadingReferences(true);
      try {
        const response = partyType === 'Customer'
          ? await customersApi.getTransactions(party, { page: 1, page_size: 100 })
          : await suppliersApi.getTransactions(party, { page: 1, page_size: 100 });

        const rows = (response.data.message?.data || []).filter((row: PartyTransaction) => (row.outstanding_amount || 0) > 0);
        setReferences(rows);

        if (referenceName && !rows.some((row: PartyTransaction) => row.name === referenceName)) {
          setReferenceName('');
        }
      } catch (err) {
        console.error('Failed to load invoice references:', err);
        setError('Could not load invoice references for the selected party.');
        setReferences([]);
      } finally {
        setLoadingReferences(false);
      }
    };

    void loadReferences();
  }, [party, partyType, referenceName]);

  const selectedReference = references.find((entry) => entry.name === referenceName);

  useEffect(() => {
    if (selectedReference && (!amount || amount <= 0)) {
      setAmount(Number(selectedReference.outstanding_amount) || 0);
    }
  }, [selectedReference, amount]);

  const effectiveAccount = paymentType === 'Receive'
    ? (modeOfPayment.toLowerCase().includes('bank') ? accountDefaults.bank_account : accountDefaults.receive_account)
    : (modeOfPayment.toLowerCase().includes('bank') ? accountDefaults.bank_account : accountDefaults.pay_account);

  const handleSubmit = async () => {
    if (!party) {
      setError('Please select a party before creating the payment entry.');
      return;
    }

    if (!amount || amount <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await financeApi.createPaymentEntry({
        payment_type: paymentType,
        party_type: partyType,
        party,
        amount,
        posting_date: postingDate,
        mode_of_payment: modeOfPayment,
        reference_doctype: referenceDoctype || undefined,
        reference_name: referenceName || undefined,
      });
      const created = response.data.message;
      navigate(appendPreservedListQuery(`/finance/payments/${encodeURIComponent(created.name)}`, listSearch));
    } catch (err: any) {
      console.error('Failed to create payment entry:', err);
      setError(err?.response?.data?.exception || 'Could not create payment entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate(backToPath)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft size={16} /> {backLabel}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">New Payment Entry</h1>
          <p className="mt-1 text-gray-500">Create a draft payment entry for receipts or supplier payments.</p>
        </div>
        <button onClick={handleSubmit} disabled={saving || loading || loadingReferences} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Save size={14} /> {saving ? 'Creating…' : 'Create Draft'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Payment Type">
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value as 'Receive' | 'Pay')} className="input-field">
                <option value="Receive">Receive</option>
                <option value="Pay">Pay</option>
              </select>
            </Field>
            <Field label="Party Type">
              <input value={partyType} disabled className="input-field bg-gray-50" />
            </Field>
            <Field label="Party">
              <select value={party} onChange={(e) => setParty(e.target.value)} className="input-field" disabled={loading}>
                <option value="">Select {partyType.toLowerCase()}</option>
                {parties.map((entry) => (
                  <option key={entry.name} value={entry.name}>{entry.customer_name || entry.supplier_name || entry.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Amount">
              <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="input-field" />
            </Field>
            <Field label="Posting Date">
              <input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} className="input-field" />
            </Field>
            <Field label="Mode of Payment">
              <div className="space-y-1">
                <select value={modeOfPayment} onChange={(e) => setModeOfPayment(e.target.value)} className="input-field" disabled={loading}>
                  {(paymentModes.length ? paymentModes : [{ name: 'Cash' }, { name: 'Bank' }]).map((mode) => (
                    <option key={mode.name} value={mode.name}>{mode.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  {effectiveAccount
                    ? `${paymentType === 'Receive' ? 'Funds will be received into' : 'Funds will be paid from'} ${effectiveAccount}.`
                    : 'Default account will be derived from company payment settings.'}
                </p>
              </div>
            </Field>
            <Field label="Reference Doctype">
              <input value={referenceDoctype} onChange={(e) => setReferenceDoctype(e.target.value)} className="input-field bg-gray-50" placeholder="Optional" disabled />
            </Field>
            <Field label="Reference Name">
              <div className="space-y-1">
                <select value={referenceName} onChange={(e) => setReferenceName(e.target.value)} className="input-field" disabled={loadingReferences || !party}>
                  <option value="">{party ? 'Select outstanding invoice' : 'Select party first'}</option>
                  {references.map((entry) => (
                    <option key={entry.name} value={entry.name}>
                      {entry.name} · {formatDate(entry.posting_date)} · {formatCurrency(entry.outstanding_amount || 0)} outstanding
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  {selectedReference
                    ? `${selectedReference.status || 'Open'} · Total ${formatCurrency(selectedReference.grand_total || 0)} · Outstanding ${formatCurrency(selectedReference.outstanding_amount || 0)}`
                    : party
                      ? 'Choose an outstanding invoice to allocate this payment automatically.'
                      : 'Select a customer or supplier to load open invoice references.'}
                </p>
              </div>
            </Field>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
          <SummaryRow label="Payment Type" value={paymentType} />
          <SummaryRow label="Party Type" value={partyType} />
          <SummaryRow label="Reference" value={referenceName || 'Not linked'} />
          <SummaryRow label="Settlement Account" value={effectiveAccount || 'Auto-derived'} />
          <SummaryRow label="Amount" value={formatCurrency(amount)} />
          <SummaryRow label="Posting Date" value={postingDate} />
          <p className="text-xs leading-5 text-gray-500">
            This creates a draft Payment Entry through the existing whitelisted finance API and then opens the detail screen.
          </p>
        </div>
      </div>
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
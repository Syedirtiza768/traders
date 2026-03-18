import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { customersApi, financeApi, suppliersApi } from '../lib/api';
import { appendPreservedListQuery, extractFrappeError, formatCurrency, formatDate, isFilterListContext, isOperationsContext, isReportContext, isWorkflowContext } from '../lib/utils';

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
  // Holds the referenceName from the URL until references finish loading,
  // so the loadReferences effect doesn't wipe it before the list arrives.
  const pendingReferenceName = useRef<string>(searchParams.get('referenceName') || '');

  // Initialise state directly from URL params — avoids race conditions between effects
  const _initPaymentType = searchParams.get('paymentType');
  const _initPartyType = searchParams.get('partyType');
  const _initAmount = searchParams.get('amount');

  const [paymentType, setPaymentType] = useState<'Receive' | 'Pay'>(
    _initPaymentType === 'Pay' ? 'Pay' : 'Receive'
  );
  const [partyType, setPartyType] = useState<'Customer' | 'Supplier'>(
    _initPartyType === 'Supplier' ? 'Supplier' : 'Customer'
  );
  const [party, setParty] = useState('');
  const [amount, setAmount] = useState(_initAmount && !Number.isNaN(Number(_initAmount)) ? Number(_initAmount) : 0);
  const [postingDate, setPostingDate] = useState(searchParams.get('postingDate') || today());
  const [modeOfPayment, setModeOfPayment] = useState('Cash');
  const [referenceDoctype, setReferenceDoctype] = useState(
    _initPaymentType === 'Pay' ? 'Purchase Invoice' : 'Sales Invoice'
  );
  const [referenceName, setReferenceName] = useState(searchParams.get('referenceName') || '');
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

  // Mark bootstrapping done after first mount so paymentType/partyType changes
  // triggered by the user (not URL init) correctly reset party/references.
  useEffect(() => {
    isBootstrappingFromQuery.current = false;
  }, []);

  // Resolve party from URL param once the parties list is loaded.
  // The URL may pass either the doc name (e.g. "CUST-00001") or the
  // display name (e.g. "Popular Shaikh Hub") — match either field.
  // If not found in the already-loaded page, search the backend.
  useEffect(() => {
    const partyParam = searchParams.get('party');
    if (!partyParam || loading) return;

    // Check if the value already matches an existing option (exact doc name)
    const exactMatch = parties.find((p) => p.name === partyParam);
    if (exactMatch) {
      setParty(exactMatch.name);
      return;
    }

    // Otherwise match by display name (customer_name / supplier_name)
    const normalised = partyParam.trim().toLowerCase();
    const nameMatch = parties.find(
      (p) =>
        (p.customer_name || '').toLowerCase() === normalised ||
        (p.supplier_name || '').toLowerCase() === normalised ||
        p.name.toLowerCase() === normalised,
    );
    if (nameMatch) {
      setParty(nameMatch.name);
      return;
    }

    // Not in the loaded page — search backend by display name
    const search = async () => {
      try {
        const res = partyType === 'Customer'
          ? await customersApi.getList({ search: partyParam, page: 1, page_size: 10 })
          : await suppliersApi.getList({ search: partyParam, page: 1, page_size: 10 });
        const results: any[] = res.data.message?.data || [];
        const found = results.find(
          (p) =>
            p.name === partyParam ||
            (p.customer_name || '').toLowerCase() === normalised ||
            (p.supplier_name || '').toLowerCase() === normalised,
        );
        if (found) {
          // Add to parties list so the dropdown renders the option, then select it
          setParties((prev) => (prev.some((p) => p.name === found.name) ? prev : [...prev, found]));
          setParty(found.name);
        }
      } catch {
        // silently ignore — user can select manually
      }
    };
    void search();
  }, [parties, loading, searchParams, partyType]);

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
    // Only clear referenceName if there's no pending URL param in flight
    if (!pendingReferenceName.current) {
      setReferenceName('');
    }
    setReferences([]);
  }, [paymentType]);

  useEffect(() => {
    const loadReferences = async () => {
      if (!party) {
        setReferences([]);
        // Only clear referenceName state; preserve pendingReferenceName ref
        // so it's still available when party resolves
        setReferenceName((prev) => (pendingReferenceName.current ? prev : ''));
        return;
      }

      setLoadingReferences(true);
      try {
        const response = partyType === 'Customer'
          ? await customersApi.getTransactions(party, { page: 1, page_size: 100 })
          : await suppliersApi.getTransactions(party, { page: 1, page_size: 100 });

        const rows = (response.data.message?.data || []).filter((row: PartyTransaction) => (row.outstanding_amount || 0) > 0);
        setReferences(rows);

        // Apply pending reference name from URL param now that the list is loaded
        const pending = pendingReferenceName.current;
        if (pending) {
          const match = rows.find((row: PartyTransaction) => row.name === pending);
          if (match) {
            setReferenceName(match.name);
            // If no amount was passed in the URL, auto-fill from outstanding amount
            setAmount((prev) => (prev > 0 ? prev : Number(match.outstanding_amount) || 0));
          } else {
            // Invoice not in outstanding list — clear
            setReferenceName('');
          }
          pendingReferenceName.current = '';
        } else if (referenceName && !rows.some((row: PartyTransaction) => row.name === referenceName)) {
          // Active reference no longer outstanding — clear it
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
  }, [party, partyType]);

  const selectedReference = references.find((entry) => entry.name === referenceName);

  // When user manually picks a reference, auto-fill amount from outstanding_amount
  useEffect(() => {
    if (selectedReference && (!amount || amount <= 0)) {
      setAmount(Number(selectedReference.outstanding_amount) || 0);
    }
  }, [selectedReference]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setError(extractFrappeError(err, 'Could not create payment entry.'));
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
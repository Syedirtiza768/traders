import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { customersApi } from '../lib/api';
import SearchableSelect from '../components/SearchableSelect';
import { useCompanyStore } from '../stores/companyStore';
import { PageHeader, AlertBanner, LoadingBlock } from '../components/ui';

type FormState = {
  customer_name: string;
  customer_group: string;
  territory: string;
  mobile_no: string;
  email_id: string;
  trader_short_code: string;
  trader_opening_balance: string;
  trader_dba: string;
  tax_id: string;
  payment_terms: string;
  credit_limit: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

const emptyForm = (): FormState => ({
  customer_name: '',
  customer_group: '',
  territory: '',
  mobile_no: '',
  email_id: '',
  trader_short_code: '',
  trader_opening_balance: '',
  trader_dba: '',
  tax_id: '',
  payment_terms: '',
  credit_limit: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  country: '',
});

export default function CreateCustomerPage() {
  const navigate = useNavigate();
  const customerPackEnabled = useCompanyStore((s) => s.customerPackEnabled);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [groups, setGroups] = useState<string[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<string[]>([]);
  const [territories, setTerritories] = useState<string[]>([]);
  const [packProfile, setPackProfile] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extended = useMemo(
    () => Boolean(customerPackEnabled && packProfile.extended_master_fields),
    [customerPackEnabled, packProfile],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const setupRes = await customersApi.getFormSetup();
        const setup = setupRes.data.message || {};
        setGroups(setup.customer_groups || []);
        setPaymentTerms(setup.payment_terms || []);
        setTerritories(setup.territories || []);
        setPackProfile(setup.pack?.profile || {});
        setForm((prev) => ({
          ...prev,
          customer_group: setup.defaults?.customer_group || '',
          territory: setup.defaults?.territory || '',
          country: setup.defaults?.country || '',
        }));
      } catch (err) {
        console.error('Failed to load customer form setup:', err);
        try {
          const groupsRes = await customersApi.getGroups();
          setGroups(groupsRes.data.message || []);
        } catch {
          setError('Could not load customer form setup.');
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const set = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    if (!form.customer_name.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (extended && packProfile.require_tax_id && !form.tax_id.trim()) {
      setError('Tax ID is required.');
      return;
    }
    if (extended && packProfile.require_payment_terms && !form.payment_terms.trim()) {
      setError('Payment Terms are required.');
      return;
    }
    if (extended && packProfile.require_billing_address) {
      if (!form.address_line1.trim() || !form.city.trim()) {
        setError('Billing address line 1 and city are required.');
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        customer_name: form.customer_name,
        customer_group: form.customer_group || undefined,
        territory: form.territory || undefined,
        mobile_no: form.mobile_no || undefined,
        email_id: form.email_id || undefined,
        short_code: form.trader_short_code || undefined,
        opening_balance: form.trader_opening_balance
          ? parseFloat(form.trader_opening_balance)
          : undefined,
      };
      if (extended) {
        payload.dba = form.trader_dba || undefined;
        payload.tax_id = form.tax_id || undefined;
        payload.payment_terms = form.payment_terms || undefined;
        payload.credit_limit = form.credit_limit ? parseFloat(form.credit_limit) : undefined;
        if (form.address_line1.trim()) {
          payload.billing_address = {
            address_line1: form.address_line1,
            address_line2: form.address_line2 || undefined,
            city: form.city,
            state: form.state || undefined,
            pincode: form.pincode || undefined,
            country: form.country || undefined,
            address_type: 'Billing',
            is_primary_address: 1,
          };
        }
      }
      const response = await customersApi.create(payload);
      const created = response.data.message;
      navigate(`/customers/${encodeURIComponent(created.name)}`);
    } catch (err: any) {
      console.error('Failed to create customer:', err);
      setError(err?.response?.data?.exception || 'Could not create customer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <button onClick={() => navigate('/customers')} className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
        <ArrowLeft size={16} /> Back to Customers
      </button>

      <PageHeader
        title="Add Customer"
        description={
          extended
            ? 'Create a customer with commercial master fields (tax, terms, address).'
            : 'Create a new customer record with the minimum required sales fields.'
        }
        actions={
          <button onClick={handleSave} disabled={saving || loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
            <Save size={14} /> {saving ? 'Creating…' : 'Create Customer'}
          </button>
        }
      />

      {error && <AlertBanner tone="error">{error}</AlertBanner>}

      {loading ? (
        <LoadingBlock label="Loading form…" compact />
      ) : (
      <>
      <div className="card p-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Customer Name">
          <input value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} className="input-field" placeholder="e.g. Al Noor Traders" />
        </Field>
        {extended && (
          <Field label="Doing Business As">
            <input value={form.trader_dba} onChange={(e) => set('trader_dba', e.target.value)} className="input-field" placeholder="Trading name" />
          </Field>
        )}
        <Field label="Customer Group">
          <SearchableSelect
            value={form.customer_group}
            onChange={(v) => set('customer_group', v)}
            options={groups.map((g) => ({ label: g, value: g }))}
            placeholder="Use default group"
            disabled={loading}
          />
        </Field>
        <Field label="Territory">
          {territories.length > 0 ? (
            <SearchableSelect
              value={form.territory}
              onChange={(v) => set('territory', v)}
              options={territories.map((t) => ({ label: t, value: t }))}
              placeholder="Use default territory"
              disabled={loading}
            />
          ) : (
            <input value={form.territory} onChange={(e) => set('territory', e.target.value)} className="input-field" placeholder="Use default territory" />
          )}
        </Field>
        <Field label="Mobile No">
          <input value={form.mobile_no} onChange={(e) => set('mobile_no', e.target.value)} className="input-field" placeholder="03xx-xxxxxxx" />
        </Field>
        <Field label="Email Address">
          <input type="email" value={form.email_id} onChange={(e) => set('email_id', e.target.value)} className="input-field" placeholder="accounts@example.com" />
        </Field>
        <Field label="Short Code">
          <input value={form.trader_short_code} onChange={(e) => set('trader_short_code', e.target.value)} className="input-field font-mono" placeholder="e.g. ANT" />
        </Field>
        <Field label="Opening Balance">
          <input type="number" min={0} step="0.01" value={form.trader_opening_balance} onChange={(e) => set('trader_opening_balance', e.target.value)} className="input-field" placeholder="0.00" />
        </Field>
        {extended && (
          <>
            <Field label={packProfile.require_tax_id ? 'Tax ID *' : 'Tax ID'}>
              <input value={form.tax_id} onChange={(e) => set('tax_id', e.target.value)} className="input-field" placeholder="NTN / STRN" />
            </Field>
            <Field label={packProfile.require_payment_terms ? 'Payment Terms *' : 'Payment Terms'}>
              <SearchableSelect
                value={form.payment_terms}
                onChange={(v) => set('payment_terms', v)}
                options={paymentTerms.map((t) => ({ label: t, value: t }))}
                placeholder="Select payment terms"
                disabled={loading}
              />
            </Field>
            {packProfile.credit_limit_enabled ? (
              <Field label="Credit Limit">
                <input type="number" min={0} step="0.01" value={form.credit_limit} onChange={(e) => set('credit_limit', e.target.value)} className="input-field" placeholder="0.00" />
              </Field>
            ) : null}
          </>
        )}
      </div>

      {extended && (
        <div className="card p-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm font-semibold text-gray-900">
            Billing Address {packProfile.require_billing_address ? '*' : ''}
          </h2>
          <Field label="Address Line 1">
            <input value={form.address_line1} onChange={(e) => set('address_line1', e.target.value)} className="input-field" />
          </Field>
          <Field label="Address Line 2">
            <input value={form.address_line2} onChange={(e) => set('address_line2', e.target.value)} className="input-field" />
          </Field>
          <Field label="City">
            <input value={form.city} onChange={(e) => set('city', e.target.value)} className="input-field" />
          </Field>
          <Field label="State / Province">
            <input value={form.state} onChange={(e) => set('state', e.target.value)} className="input-field" />
          </Field>
          <Field label="Postal Code">
            <input value={form.pincode} onChange={(e) => set('pincode', e.target.value)} className="input-field" />
          </Field>
          <Field label="Country">
            <input value={form.country} onChange={(e) => set('country', e.target.value)} className="input-field" />
          </Field>
        </div>
      )}
      </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <label className="label-field">{label}</label>
      {children}
    </div>
  );
}

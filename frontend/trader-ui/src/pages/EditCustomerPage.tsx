import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

export default function EditCustomerPage() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const customerPackEnabled = useCompanyStore((s) => s.customerPackEnabled);
  const [groups, setGroups] = useState<string[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<string[]>([]);
  const [territories, setTerritories] = useState<string[]>([]);
  const [packProfile, setPackProfile] = useState<Record<string, any>>({});
  const [form, setForm] = useState<FormState>({
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extended = useMemo(
    () => Boolean(customerPackEnabled && packProfile.extended_master_fields),
    [customerPackEnabled, packProfile],
  );

  useEffect(() => {
    const load = async () => {
      if (!customerId) {
        setError('Customer not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const decodedId = decodeURIComponent(customerId);
        const [detailRes, setupRes] = await Promise.all([
          customersApi.getDetail(decodedId),
          customersApi.getFormSetup(),
        ]);
        const customer = detailRes.data.message;
        const setup = setupRes.data.message || {};
        const addr = (customer.addresses || [])[0] || {};
        setGroups(setup.customer_groups || []);
        setPaymentTerms(setup.payment_terms || []);
        setTerritories(setup.territories || []);
        setPackProfile(setup.pack?.profile || customer.pack?.profile || {});
        setForm({
          customer_name: customer.customer_name || '',
          customer_group: customer.customer_group || '',
          territory: customer.territory || '',
          mobile_no: customer.mobile_no || '',
          email_id: customer.email_id || '',
          trader_short_code: customer.trader_short_code || '',
          trader_opening_balance: customer.trader_opening_balance
            ? String(customer.trader_opening_balance)
            : '',
          trader_dba: customer.trader_dba || '',
          tax_id: customer.tax_id || '',
          payment_terms: customer.payment_terms || '',
          credit_limit: customer.credit_limit ? String(customer.credit_limit) : '',
          address_line1: addr.address_line1 || '',
          address_line2: addr.address_line2 || '',
          city: addr.city || '',
          state: addr.state || '',
          pincode: addr.pincode || '',
          country: addr.country || setup.defaults?.country || '',
        });
      } catch (err) {
        console.error('Failed to load customer:', err);
        setError('Could not load customer details.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [customerId]);

  const set = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    if (!form.customer_name.trim()) {
      setError('Customer name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        name: decodeURIComponent(customerId || ''),
        customer_name: form.customer_name,
        customer_group: form.customer_group || undefined,
        territory: form.territory || undefined,
        mobile_no: form.mobile_no || undefined,
        email_id: form.email_id || undefined,
        short_code: form.trader_short_code,
        opening_balance: form.trader_opening_balance
          ? parseFloat(form.trader_opening_balance)
          : 0,
      };
      if (extended) {
        payload.dba = form.trader_dba;
        payload.tax_id = form.tax_id;
        payload.payment_terms = form.payment_terms || undefined;
        payload.credit_limit = form.credit_limit ? parseFloat(form.credit_limit) : 0;
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
      await customersApi.update(payload);
      navigate(`/customers/${encodeURIComponent(customerId || '')}`);
    } catch (err: any) {
      console.error('Failed to update customer:', err);
      setError(err?.response?.data?.exception || 'Could not update customer.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingBlock label="Loading customer…" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <button onClick={() => navigate(`/customers/${encodeURIComponent(customerId || '')}`)} className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
        <ArrowLeft size={16} /> Back to Customer
      </button>

      <PageHeader
        title="Edit Customer"
        description={<>Update customer record for <strong>{form.customer_name || customerId}</strong></>}
        actions={
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        }
      />

      {error && <AlertBanner tone="error">{error}</AlertBanner>}

      <div className="card p-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Customer Name">
          <input value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} className="input-field" />
        </Field>
        {extended && (
          <Field label="Doing Business As">
            <input value={form.trader_dba} onChange={(e) => set('trader_dba', e.target.value)} className="input-field" />
          </Field>
        )}
        <Field label="Customer Group">
          <SearchableSelect
            value={form.customer_group}
            onChange={(v) => set('customer_group', v)}
            options={groups.map((g) => ({ label: g, value: g }))}
            placeholder="Use default group"
          />
        </Field>
        <Field label="Territory">
          {territories.length > 0 ? (
            <SearchableSelect
              value={form.territory}
              onChange={(v) => set('territory', v)}
              options={territories.map((t) => ({ label: t, value: t }))}
              placeholder="Territory"
            />
          ) : (
            <input value={form.territory} onChange={(e) => set('territory', e.target.value)} className="input-field" />
          )}
        </Field>
        <Field label="Mobile No">
          <input value={form.mobile_no} onChange={(e) => set('mobile_no', e.target.value)} className="input-field" />
        </Field>
        <Field label="Email Address">
          <input type="email" value={form.email_id} onChange={(e) => set('email_id', e.target.value)} className="input-field" />
        </Field>
        <Field label="Short Code">
          <input value={form.trader_short_code} onChange={(e) => set('trader_short_code', e.target.value)} className="input-field font-mono" />
        </Field>
        <Field label="Opening Balance">
          <input type="number" min={0} step="0.01" value={form.trader_opening_balance} onChange={(e) => set('trader_opening_balance', e.target.value)} className="input-field" />
        </Field>
        {extended && (
          <>
            <Field label="Tax ID">
              <input value={form.tax_id} onChange={(e) => set('tax_id', e.target.value)} className="input-field" />
            </Field>
            <Field label="Payment Terms">
              <SearchableSelect
                value={form.payment_terms}
                onChange={(v) => set('payment_terms', v)}
                options={paymentTerms.map((t) => ({ label: t, value: t }))}
                placeholder="Select payment terms"
              />
            </Field>
            {packProfile.credit_limit_enabled ? (
              <Field label="Credit Limit">
                <input type="number" min={0} step="0.01" value={form.credit_limit} onChange={(e) => set('credit_limit', e.target.value)} className="input-field" />
              </Field>
            ) : null}
          </>
        )}
      </div>

      {extended && (
        <div className="card p-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm font-semibold text-gray-900">Billing Address</h2>
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
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-field">{label}</span>
      {children}
    </label>
  );
}

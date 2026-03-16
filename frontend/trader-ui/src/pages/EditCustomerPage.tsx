import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { customersApi } from '../lib/api';

export default function EditCustomerPage() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const [groups, setGroups] = useState<string[]>([]);
  const [form, setForm] = useState({
    customer_name: '',
    customer_group: '',
    territory: '',
    mobile_no: '',
    email_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const [detailRes, groupsRes] = await Promise.all([
          customersApi.getDetail(decodedId),
          customersApi.getGroups(),
        ]);
        const customer = detailRes.data.message;
        setForm({
          customer_name: customer.customer_name || '',
          customer_group: customer.customer_group || '',
          territory: customer.territory || '',
          mobile_no: customer.mobile_no || '',
          email_id: customer.email_id || '',
        });
        setGroups(groupsRes.data.message || []);
      } catch (err) {
        console.error('Failed to load customer:', err);
        setError('Could not load customer details.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [customerId]);

  const handleSave = async () => {
    if (!form.customer_name.trim()) {
      setError('Customer name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await customersApi.update({
        name: decodeURIComponent(customerId || ''),
        ...form,
      });
      navigate(`/customers/${encodeURIComponent(customerId || '')}`);
    } catch (err: any) {
      console.error('Failed to update customer:', err);
      setError(err?.response?.data?.exception || 'Could not update customer.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-16 flex justify-center"><div className="spinner" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate(`/customers/${encodeURIComponent(customerId || '')}`)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft size={16} /> Back to Customer
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
          <p className="mt-1 text-gray-500">Update customer record for <strong>{form.customer_name || customerId}</strong></p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card p-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Customer Name">
          <input value={form.customer_name} onChange={(e) => setForm((current) => ({ ...current, customer_name: e.target.value }))} className="input-field" placeholder="e.g. Al Noor Traders" />
        </Field>
        <Field label="Customer Group">
          <select value={form.customer_group} onChange={(e) => setForm((current) => ({ ...current, customer_group: e.target.value }))} className="input-field">
            <option value="">Use default group</option>
            {groups.map((group) => <option key={group} value={group}>{group}</option>)}
          </select>
        </Field>
        <Field label="Territory">
          <input value={form.territory} onChange={(e) => setForm((current) => ({ ...current, territory: e.target.value }))} className="input-field" placeholder="Use default territory" />
        </Field>
        <Field label="Mobile No">
          <input value={form.mobile_no} onChange={(e) => setForm((current) => ({ ...current, mobile_no: e.target.value }))} className="input-field" placeholder="03xx-xxxxxxx" />
        </Field>
        <Field label="Email Address">
          <input type="email" value={form.email_id} onChange={(e) => setForm((current) => ({ ...current, email_id: e.target.value }))} className="input-field" placeholder="accounts@example.com" />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

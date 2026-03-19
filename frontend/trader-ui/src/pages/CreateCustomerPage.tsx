import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { customersApi } from '../lib/api';
import SearchableSelect from '../components/SearchableSelect';

export default function CreateCustomerPage() {
  const navigate = useNavigate();
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
      setLoading(true);
      try {
        const groupsRes = await customersApi.getGroups();
        setGroups(groupsRes.data.message || []);
      } catch (err) {
        console.error('Failed to load customer groups:', err);
        setError('Could not load customer groups.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleSave = async () => {
    if (!form.customer_name.trim()) {
      setError('Customer name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await customersApi.create(form);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/customers')} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft size={16} /> Back to Customers
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Add Customer</h1>
          <p className="mt-1 text-gray-500">Create a new customer record with the minimum required sales fields.</p>
        </div>
        <button onClick={handleSave} disabled={saving || loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Save size={14} /> {saving ? 'Creating…' : 'Create Customer'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card p-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Customer Name">
          <input value={form.customer_name} onChange={(e) => setForm((current) => ({ ...current, customer_name: e.target.value }))} className="input-field" placeholder="e.g. Al Noor Traders" />
        </Field>
        <Field label="Customer Group">
          <SearchableSelect
            value={form.customer_group}
            onChange={(v) => setForm((current) => ({ ...current, customer_group: v }))}
            options={groups.map((g) => ({ label: g, value: g }))}
            placeholder="Use default group"
            disabled={loading}
          />
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
    <div className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </div>
  );
}
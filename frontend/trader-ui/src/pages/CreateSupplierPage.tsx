import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { suppliersApi } from '../lib/api';
import SearchableSelect from '../components/SearchableSelect';
import { PageHeader, AlertBanner } from '../components/ui';

export default function CreateSupplierPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<string[]>([]);
  const [form, setForm] = useState({
    supplier_name: '',
    supplier_group: '',
    country: 'Pakistan',
    mobile_no: '',
    email_id: '',
    trader_short_code: '',
    trader_opening_balance: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const groupsRes = await suppliersApi.getGroups();
        setGroups(groupsRes.data.message || []);
      } catch (err) {
        console.error('Failed to load supplier groups:', err);
        setError('Could not load supplier groups.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleSave = async () => {
    if (!form.supplier_name.trim()) {
      setError('Supplier name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await suppliersApi.create({
        supplier_name: form.supplier_name,
        supplier_group: form.supplier_group || undefined,
        country: form.country || undefined,
        mobile_no: form.mobile_no || undefined,
        email_id: form.email_id || undefined,
        short_code: form.trader_short_code || undefined,
        opening_balance: form.trader_opening_balance
          ? parseFloat(form.trader_opening_balance)
          : undefined,
      });
      const created = response.data.message;
      navigate(`/suppliers/${encodeURIComponent(created.name)}`);
    } catch (err: any) {
      console.error('Failed to create supplier:', err);
      setError(err?.response?.data?.exception || 'Could not create supplier.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <button onClick={() => navigate('/suppliers')} className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
        <ArrowLeft size={16} /> Back to Suppliers
      </button>

      <PageHeader
        title="Add Supplier"
        description="Create a new supplier record with the minimum required purchasing fields."
        actions={
          <button onClick={handleSave} disabled={saving || loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
            <Save size={14} /> {saving ? 'Creating…' : 'Create Supplier'}
          </button>
        }
      />

      {error && <AlertBanner tone="error">{error}</AlertBanner>}

      <div className="card p-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Supplier Name">
          <input value={form.supplier_name} onChange={(e) => setForm((current) => ({ ...current, supplier_name: e.target.value }))} className="input-field" placeholder="e.g. Pak Industrial Supplies" />
        </Field>
        <Field label="Supplier Group">
          <SearchableSelect
            value={form.supplier_group}
            onChange={(v) => setForm((current) => ({ ...current, supplier_group: v }))}
            options={groups.map((g) => ({ label: g, value: g }))}
            placeholder="Use default group"
            disabled={loading}
          />
        </Field>
        <Field label="Country">
          <input value={form.country} onChange={(e) => setForm((current) => ({ ...current, country: e.target.value }))} className="input-field" />
        </Field>
        <Field label="Mobile No">
          <input value={form.mobile_no} onChange={(e) => setForm((current) => ({ ...current, mobile_no: e.target.value }))} className="input-field" placeholder="03xx-xxxxxxx" />
        </Field>
        <Field label="Email Address">
          <input type="email" value={form.email_id} onChange={(e) => setForm((current) => ({ ...current, email_id: e.target.value }))} className="input-field" placeholder="purchasing@example.com" />
        </Field>
        <Field label="Short Code">
          <input value={form.trader_short_code} onChange={(e) => setForm((current) => ({ ...current, trader_short_code: e.target.value }))} className="input-field font-mono" placeholder="e.g. PIS" />
        </Field>
        <Field label="Opening Balance">
          <input type="number" min={0} step="0.01" value={form.trader_opening_balance} onChange={(e) => setForm((current) => ({ ...current, trader_opening_balance: e.target.value }))} className="input-field" placeholder="0.00" />
        </Field>
      </div>
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
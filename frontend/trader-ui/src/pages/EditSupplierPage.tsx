import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { suppliersApi } from '../lib/api';
import SearchableSelect from '../components/SearchableSelect';

export default function EditSupplierPage() {
  const navigate = useNavigate();
  const { supplierId } = useParams();
  const [groups, setGroups] = useState<string[]>([]);
  const [form, setForm] = useState({
    supplier_name: '',
    supplier_group: '',
    country: 'Pakistan',
    mobile_no: '',
    email_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!supplierId) {
        setError('Supplier not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const decodedId = decodeURIComponent(supplierId);
        const [detailRes, groupsRes] = await Promise.all([
          suppliersApi.getDetail(decodedId),
          suppliersApi.getGroups(),
        ]);
        const supplier = detailRes.data.message;
        setForm({
          supplier_name: supplier.supplier_name || '',
          supplier_group: supplier.supplier_group || '',
          country: supplier.country || 'Pakistan',
          mobile_no: supplier.mobile_no || '',
          email_id: supplier.email_id || '',
        });
        setGroups(groupsRes.data.message || []);
      } catch (err) {
        console.error('Failed to load supplier:', err);
        setError('Could not load supplier details.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [supplierId]);

  const handleSave = async () => {
    if (!form.supplier_name.trim()) {
      setError('Supplier name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await suppliersApi.update({
        name: decodeURIComponent(supplierId || ''),
        ...form,
      });
      navigate(`/suppliers/${encodeURIComponent(supplierId || '')}`);
    } catch (err: any) {
      console.error('Failed to update supplier:', err);
      setError(err?.response?.data?.exception || 'Could not update supplier.');
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
          <button onClick={() => navigate(`/suppliers/${encodeURIComponent(supplierId || '')}`)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft size={16} /> Back to Supplier
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Supplier</h1>
          <p className="mt-1 text-gray-500">Update supplier record for <strong>{form.supplier_name || supplierId}</strong></p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

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

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminApi } from '../../lib/api';
import { PageHeader, AlertBanner } from '../../components/ui';

const MODULE_OPTIONS = [
  'dashboard', 'sales', 'purchases', 'inventory', 'finance', 'reports',
  'customers', 'suppliers', 'operations', 'components', 'pos', 'settings',
];

const COUNTRY_OPTIONS = [
  { label: 'Pakistan', value: 'Pakistan', currency: 'PKR' },
  { label: 'United States', value: 'United States', currency: 'USD' },
  { label: 'United Kingdom', value: 'United Kingdom', currency: 'GBP' },
  { label: 'India', value: 'India', currency: 'INR' },
  { label: 'United Arab Emirates', value: 'United Arab Emirates', currency: 'AED' },
  { label: 'Saudi Arabia', value: 'Saudi Arabia', currency: 'SAR' },
];

export default function CreateTenantPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    tenant_id: string;
    admin_email: string;
    admin_password: string;
  } | null>(null);
  const [form, setForm] = useState({
    tenant_name: '',
    contact_email: '',
    contact_phone: '',
    country: 'Pakistan',
    currency: 'PKR',
    admin_email: '',
    admin_first_name: '',
    admin_last_name: '',
    admin_password: '',
    max_users: 10,
    subscription_plan: 'Starter',
    enabled_modules: [...MODULE_OPTIONS.filter((m) => m !== 'components')],
  });

  const toggleModule = (module: string) => {
    setForm((prev) => ({
      ...prev,
      enabled_modules: prev.enabled_modules.includes(module)
        ? prev.enabled_modules.filter((m) => m !== module)
        : [...prev.enabled_modules, module],
    }));
  };

  const handleCountryChange = (country: string) => {
    const match = COUNTRY_OPTIONS.find((c) => c.value === country);
    setForm({ ...form, country, currency: match?.currency || form.currency });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.createTenant(form);
      const msg = res.data.message;
      const tenantId = msg?.tenant?.tenant_id;
      if (msg?.admin_email) {
        setCreated({
          tenant_id: tenantId || '',
          admin_email: msg.admin_email,
          admin_password: msg.admin_password || '',
        });
      } else {
        navigate(tenantId ? `/super-admin/tenants/${tenantId}` : '/super-admin/tenants', { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create business');
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="max-w-3xl space-y-4">
        <PageHeader
          title="Business Created"
          description="Share these credentials with the business admin."
        />
        <AlertBanner tone="success">
          Tenant <strong>{created.tenant_id}</strong> provisioned successfully.
        </AlertBanner>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Email</p>
              <p className="text-sm font-mono text-slate-900">{created.admin_email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Password</p>
              <p className="text-sm font-mono text-slate-900">{created.admin_password}</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate(`/super-admin/tenants/${created.tenant_id}`, { replace: true })}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            >
              View Tenant
            </button>
            <button
              onClick={() => navigate('/super-admin/tenants')}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm"
            >
              Back to List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        title="Create Business"
        description="Provision a new tenant with company and admin user."
      />

      {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Business name *</span>
            <input
              required
              value={form.tenant_name}
              onChange={(e) => setForm({ ...form, tenant_name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Contact email</span>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Country *</span>
            <select
              required
              value={form.country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Currency</span>
            <input
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Max users</span>
            <input
              type="number"
              min={1}
              value={form.max_users}
              onChange={(e) => setForm({ ...form, max_users: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Plan</span>
            <select
              value={form.subscription_plan}
              onChange={(e) => setForm({ ...form, subscription_plan: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="Free">Free</option>
              <option value="Starter">Starter</option>
              <option value="Professional">Professional</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </label>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <p className="text-sm font-medium text-slate-700 mb-3">Admin User</p>
          <p className="text-xs text-slate-500 mb-4">Leave blank to create the tenant without an admin account.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Admin email</span>
              <input
                type="email"
                value={form.admin_email}
                onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Password *</span>
              <input
                type="text"
                value={form.admin_password}
                onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                required={!!form.admin_email}
                placeholder={form.admin_email ? 'Required when admin email is set' : ''}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">First name *</span>
              <input
                value={form.admin_first_name}
                onChange={(e) => setForm({ ...form, admin_first_name: e.target.value })}
                required={!!form.admin_email}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Last name</span>
              <input
                value={form.admin_last_name}
                onChange={(e) => setForm({ ...form, admin_last_name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Enabled modules</p>
          <div className="flex flex-wrap gap-2">
            {MODULE_OPTIONS.map((module) => (
              <button
                key={module}
                type="button"
                onClick={() => toggleModule(module)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  form.enabled_modules.includes(module)
                    ? 'bg-brand-50 border-brand-300 text-brand-800'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                {module}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create business'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/super-admin/tenants')}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

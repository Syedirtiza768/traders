import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { superAdminApi } from '../../lib/api';
import { MODULE_LABELS, TENANT_MODULE_KEYS, type TenantModuleKey } from '../../lib/tenantModules';
import { parseTenantBranding } from '../../lib/tenantBranding';

type TenantDetail = {
  tenant_id: string;
  tenant_name: string;
  status: string;
  company?: string;
  subscription_plan?: string;
  billing_status?: string;
  max_users?: number;
  user_count?: number;
  contact_email?: string;
  contact_phone?: string;
  timezone?: string;
  logo?: string;
  branding?: Record<string, unknown>;
  enabled_modules?: string[];
};

const REQUIRED_MODULES: TenantModuleKey[] = ['dashboard', 'settings'];

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [auditRows, setAuditRows] = useState<Array<Record<string, unknown>>>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [moduleDraft, setModuleDraft] = useState<TenantModuleKey[]>([]);
  const [modulesDirty, setModulesDirty] = useState(false);
  const [brandingForm, setBrandingForm] = useState({
    appName: '',
    tagline: '',
    primaryColor: '#1d4ed8',
    accentColor: '#1e40af',
    logo: '',
  });
  const [brandingDirty, setBrandingDirty] = useState(false);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.getTenant(tenantId);
      const data = res.data.message as TenantDetail;
      setTenant(data);
      setModuleDraft((data.enabled_modules || []) as TenantModuleKey[]);
      setModulesDirty(false);
      const branding = parseTenantBranding(data);
      setBrandingForm({
        appName: branding.appName || data.tenant_name || '',
        tagline: branding.tagline || '',
        primaryColor: branding.primaryColor || '#1d4ed8',
        accentColor: branding.accentColor || '#1e40af',
        logo: data.logo || '',
      });
      setBrandingDirty(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load business');
    } finally {
      setLoading(false);
    }
  };

  const loadAudit = async () => {
    if (!tenantId) return;
    setAuditLoading(true);
    try {
      const res = await superAdminApi.getTenantAuditLog(tenantId, { page_size: 20 });
      setAuditRows(res.data.message?.data || []);
    } catch {
      setAuditRows([]);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void loadAudit();
  }, [tenantId]);

  const enabledModuleSet = useMemo(() => new Set(moduleDraft), [moduleDraft]);

  const toggleModule = (module: TenantModuleKey) => {
    if (REQUIRED_MODULES.includes(module)) return;
    setModuleDraft((prev) => {
      const next = prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module];
      return next;
    });
    setModulesDirty(true);
  };

  const saveModules = async () => {
    if (!tenantId) return;
    setActionLoading(true);
    setError(null);
    try {
      const withRequired = Array.from(new Set([...moduleDraft, ...REQUIRED_MODULES]));
      const res = await superAdminApi.setTenantModules(tenantId, withRequired);
      const enabled = res.data.message?.enabled_modules || withRequired;
      setTenant((t) => (t ? { ...t, enabled_modules: enabled } : t));
      setModuleDraft(enabled as TenantModuleKey[]);
      setModulesDirty(false);
      await loadAudit();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save modules');
    } finally {
      setActionLoading(false);
    }
  };

  const saveBranding = async () => {
    if (!tenantId) return;
    setActionLoading(true);
    setError(null);
    try {
      const branding = {
        appName: brandingForm.appName.trim(),
        tagline: brandingForm.tagline.trim(),
        primaryColor: brandingForm.primaryColor,
        accentColor: brandingForm.accentColor,
      };
      const res = await superAdminApi.setTenantBranding(tenantId, branding, brandingForm.logo || undefined);
      const updated = res.data.message?.tenant as TenantDetail;
      if (updated) setTenant(updated);
      setBrandingDirty(false);
      await loadAudit();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save branding');
    } finally {
      setActionLoading(false);
    }
  };

  const setStatus = async (status: string) => {
    if (!tenantId) return;
    setActionLoading(true);
    try {
      await superAdminApi.setTenantStatus(tenantId, status);
      await load();
      await loadAudit();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="text-slate-500">Loading...</div>;
  if (error && !tenant) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>;
  if (!tenant) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button type="button" onClick={() => navigate('/super-admin/tenants')} className="text-sm text-brand-700 hover:underline">
            ← Back to businesses
          </button>
          <h2 className="text-2xl font-bold text-slate-900 mt-2">{tenant.tenant_name}</h2>
          <p className="text-sm text-slate-500">{tenant.tenant_id}</p>
        </div>
        <div className="flex gap-2">
          {tenant.status !== 'Active' && (
            <button type="button" disabled={actionLoading} onClick={() => setStatus('Active')} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm">
              Activate
            </button>
          )}
          {tenant.status === 'Active' && (
            <button type="button" disabled={actionLoading} onClick={() => setStatus('Suspended')} className="px-3 py-2 rounded-lg bg-amber-600 text-white text-sm">
              Suspend
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Profile</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd>{tenant.status}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Company</dt><dd>{tenant.company || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Plan</dt><dd>{tenant.subscription_plan}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Billing</dt><dd>{tenant.billing_status}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Users</dt><dd>{tenant.user_count}/{tenant.max_users}</dd></div>
          </dl>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Contact</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd>{tenant.contact_email || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Phone</dt><dd>{tenant.contact_phone || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Timezone</dt><dd>{tenant.timezone || '—'}</dd></div>
          </dl>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Modules</h3>
            <p className="text-sm text-slate-500">Dashboard and Settings are always enabled.</p>
          </div>
          <button
            type="button"
            disabled={!modulesDirty || actionLoading}
            onClick={() => void saveModules()}
            className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm disabled:opacity-50"
          >
            Save modules
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {TENANT_MODULE_KEYS.map((module) => {
            const on = enabledModuleSet.has(module);
            const locked = REQUIRED_MODULES.includes(module);
            return (
              <button
                key={module}
                type="button"
                disabled={locked}
                onClick={() => toggleModule(module)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  on
                    ? 'bg-brand-50 border-brand-300 text-brand-800'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                } ${locked ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {MODULE_LABELS[module]}{locked ? ' *' : ''}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Branding</h3>
            <p className="text-sm text-slate-500">Stored in Trader Tenant.branding (JSON) and applied in the business UI.</p>
          </div>
          <button
            type="button"
            disabled={!brandingDirty || actionLoading}
            onClick={() => void saveBranding()}
            className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm disabled:opacity-50"
          >
            Save branding
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="text-slate-600">App name</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={brandingForm.appName}
              onChange={(e) => { setBrandingForm((f) => ({ ...f, appName: e.target.value })); setBrandingDirty(true); }}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Tagline</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={brandingForm.tagline}
              onChange={(e) => { setBrandingForm((f) => ({ ...f, tagline: e.target.value })); setBrandingDirty(true); }}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Primary color</span>
            <input
              type="color"
              className="mt-1 h-10 w-full rounded-lg border border-slate-300"
              value={brandingForm.primaryColor}
              onChange={(e) => { setBrandingForm((f) => ({ ...f, primaryColor: e.target.value })); setBrandingDirty(true); }}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Accent color</span>
            <input
              type="color"
              className="mt-1 h-10 w-full rounded-lg border border-slate-300"
              value={brandingForm.accentColor}
              onChange={(e) => { setBrandingForm((f) => ({ ...f, accentColor: e.target.value })); setBrandingDirty(true); }}
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="text-slate-600">Logo URL (Attach path or full URL)</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={brandingForm.logo}
              placeholder="/files/logo.png"
              onChange={(e) => { setBrandingForm((f) => ({ ...f, logo: e.target.value })); setBrandingDirty(true); }}
            />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Audit log</h3>
        {auditLoading ? (
          <p className="text-sm text-slate-500">Loading audit entries...</p>
        ) : auditRows.length === 0 ? (
          <p className="text-sm text-slate-500">No audit entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Actor</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((row) => (
                  <tr key={String(row.name)} className="border-b border-slate-50">
                    <td className="py-2 pr-4 text-slate-600">{String(row.timestamp || '')}</td>
                    <td className="py-2 pr-4 capitalize">{String(row.action || '').replace(/_/g, ' ')}</td>
                    <td className="py-2 pr-4">{String(row.actor || '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

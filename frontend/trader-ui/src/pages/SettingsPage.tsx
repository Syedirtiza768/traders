import { useState, useEffect } from 'react';
import { Building2, Users, Shield, Globe, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [companyRes, rolesRes] = await Promise.all([
        fetch('/api/method/frappe.client.get_list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': getCsrfToken() },
          body: JSON.stringify({ doctype: 'Company', fields: ['*'], limit_page_length: 1 }),
        }).then((r) => r.json()),
        fetch('/api/method/frappe.client.get_list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': getCsrfToken() },
          body: JSON.stringify({
            doctype: 'Role',
            fields: ['name', 'disabled'],
            filters: [['name', 'like', '%Trader%']],
            limit_page_length: 20,
          }),
        }).then((r) => r.json()),
      ]);
      setCompanyInfo(companyRes.message?.[0] || null);
      setRoles(rolesRes.message || []);
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const getCsrfToken = () =>
    document.cookie
      .split('; ')
      .find((c) => c.startsWith('csrf_token='))
      ?.split('=')[1] || '';

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div><h1 className="page-title">Settings</h1></div>
        <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="text-gray-500 mt-1">System configuration and information</p>
        </div>
        <button onClick={loadSettings} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Company Info */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
            <Building2 size={20} className="text-brand-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Company Information</h2>
            <p className="text-sm text-gray-500">Primary company details from ERPNext</p>
          </div>
        </div>
        {companyInfo ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <InfoRow label="Company Name" value={companyInfo.name} />
            <InfoRow label="Abbreviation" value={companyInfo.abbr} />
            <InfoRow label="Country" value={companyInfo.country} />
            <InfoRow label="Currency" value={companyInfo.default_currency} />
            <InfoRow label="Domain" value={companyInfo.domain} />
            <InfoRow label="Chart of Accounts" value={companyInfo.chart_of_accounts} />
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No company configured. Run the setup wizard first.</p>
        )}
      </div>

      {/* Custom Roles */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Shield size={20} className="text-emerald-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Trader Roles</h2>
            <p className="text-sm text-gray-500">Custom roles created by the Trader module</p>
          </div>
        </div>
        {roles.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {roles.map((role) => (
              <div key={role.name} className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-gray-800">{role.name}</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    role.disabled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}
                >
                  {role.disabled ? 'Disabled' : 'Active'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            No custom Trader roles found. Roles are created during app installation.
          </p>
        )}
      </div>

      {/* System Info */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Globe size={20} className="text-purple-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">System Information</h2>
            <p className="text-sm text-gray-500">Application and environment details</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <InfoRow label="Application" value="Trader App v1.0.0" />
          <InfoRow label="Framework" value="Frappe v15 / ERPNext v15" />
          <InfoRow label="Frontend" value="React 18 + TypeScript + Vite" />
          <InfoRow label="CSS Framework" value="Tailwind CSS 3" />
          <InfoRow label="Database" value="MariaDB 10.11" />
          <InfoRow label="Cache" value="Redis 7" />
        </div>
      </div>

      {/* Quick Links */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Users size={20} className="text-amber-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Administration Links</h2>
            <p className="text-sm text-gray-500">Jump to ERPNext admin panels</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AdminLink href="/app/user" label="User Management" description="Manage user accounts and permissions" />
          <AdminLink href="/app/role" label="Role Management" description="Configure roles and access levels" />
          <AdminLink href="/app/company" label="Company Settings" description="Edit company details and defaults" />
          <AdminLink href="/app/fiscal-year" label="Fiscal Year" description="Set active fiscal year period" />
          <AdminLink href="/app/warehouse" label="Warehouses" description="Configure warehouse structure" />
          <AdminLink href="/app/accounts-settings" label="Accounting" description="Configure accounting defaults" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5">{value || '—'}</dd>
    </div>
  );
}

function AdminLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-lg border border-gray-200 hover:border-brand-300 hover:shadow-sm transition-all"
    >
      <h4 className="text-sm font-medium text-brand-700">{label}</h4>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </a>
  );
}

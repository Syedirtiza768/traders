import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Building2, Globe, Layers, Moon, Receipt, RefreshCw, RotateCcw, Save, Shield, Users } from 'lucide-react';
import { settingsApi } from '../lib/api';
import SearchableSelect from '../components/SearchableSelect';

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: 'Urdu', value: 'ur' },
  { label: 'Arabic', value: 'ar' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Chinese (Simplified)', value: 'zh' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
];

const TIME_ZONE_OPTIONS = [
  { label: 'Asia/Karachi (PKT)', value: 'Asia/Karachi' },
  { label: 'Asia/Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
  { label: 'Asia/Riyadh (AST)', value: 'Asia/Riyadh' },
  { label: 'Europe/London (GMT/BST)', value: 'Europe/London' },
  { label: 'America/New_York (EST/EDT)', value: 'America/New_York' },
  { label: 'America/Chicago (CST/CDT)', value: 'America/Chicago' },
  { label: 'America/Los_Angeles (PST/PDT)', value: 'America/Los_Angeles' },
  { label: 'UTC', value: 'UTC' },
];

const DATE_FORMAT_OPTIONS = [
  { label: 'dd-mm-yyyy', value: 'dd-mm-yyyy' },
  { label: 'mm-dd-yyyy', value: 'mm-dd-yyyy' },
  { label: 'yyyy-mm-dd', value: 'yyyy-mm-dd' },
  { label: 'dd/mm/yyyy', value: 'dd/mm/yyyy' },
  { label: 'mm/dd/yyyy', value: 'mm/dd/yyyy' },
  { label: 'dd.mm.yyyy', value: 'dd.mm.yyyy' },
];

const NUMBER_FORMAT_OPTIONS = [
  { label: '#,###.##', value: '#,###.##' },
  { label: '#.###,##', value: '#.###,##' },
  { label: '# ###.##', value: '# ###.##' },
  { label: '#,###.###', value: '#,###.###' },
  { label: '#,##,###.##', value: '#,##,###.##' },
];

type SettingsState = {
  company: Record<string, any> | null;
  ui: {
    language: string;
    time_zone: string;
    date_format: string;
    number_format: string;
    float_precision: number;
    session_expiry: number;
    enable_two_factor: number;
    dark_mode: number;
    compact_tables: number;
    email_notifications: number;
  };
};

const DEFAULT_SETTINGS: SettingsState = {
  company: null,
  ui: {
    language: 'en',
    time_zone: 'Asia/Karachi',
    date_format: 'dd-mm-yyyy',
    number_format: '#,###.##',
    float_precision: 3,
    session_expiry: 240,
    enable_two_factor: 0,
    dark_mode: 0,
    compact_tables: 0,
    email_notifications: 1,
  },
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const validationMessage = useMemo(() => {
    if (!settings.ui.language.trim()) return 'Language is required.';
    if (!settings.ui.time_zone.trim()) return 'Time zone is required.';
    if (!settings.ui.date_format.trim()) return 'Date format is required.';
    if (!settings.ui.number_format.trim()) return 'Number format is required.';
    if (settings.ui.float_precision < 0 || settings.ui.float_precision > 9) return 'Float precision must be between 0 and 9.';
    if (settings.ui.session_expiry < 15) return 'Session expiry must be at least 15 minutes.';
    return null;
  }, [settings]);

  const isDirty = JSON.stringify(settings.ui) !== JSON.stringify(initialSettings.ui);

  useEffect(() => {
    void loadSettings();
  }, []);

  const hydrateSettings = (payload: any) => {
    const nextSettings = {
      company: payload?.company || null,
      ui: {
        ...DEFAULT_SETTINGS.ui,
        ...(payload?.ui || {}),
      },
    };

    setSettings(nextSettings);
    setInitialSettings(nextSettings);
  };

  const loadSettings = async (options?: { preserveFeedback?: boolean }) => {
    setLoading(true);
    if (!options?.preserveFeedback) {
      setFeedback(null);
    }

    try {
      const [settingsRes, rolesRes] = await Promise.all([
        settingsApi.get(),
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

      const payload = settingsRes.data.message;
      hydrateSettings(payload);
      setRoles(rolesRes.message || []);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setFeedback({ type: 'error', message: 'Could not load settings right now.' });
    } finally {
      setLoading(false);
    }
  };

  const getCsrfToken = () =>
    document.cookie
      .split('; ')
      .find((c) => c.startsWith('csrf_token='))
      ?.split('=')[1] || '';

  const updateUi = <K extends keyof SettingsState['ui']>(key: K, value: SettingsState['ui'][K]) => {
    setSettings((current) => ({
      ...current,
      ui: {
        ...current.ui,
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (validationMessage) {
      setFeedback({ type: 'error', message: validationMessage });
      return;
    }

    if (!isDirty) {
      setFeedback({ type: 'success', message: 'No changes to save.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const response = await settingsApi.save({ ui: settings.ui });
      const payload = response.data.message;
      hydrateSettings(payload?.settings || payload);
      setFeedback({ type: 'success', message: payload?.message || 'Settings saved successfully.' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setFeedback({ type: 'error', message: 'Could not save settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(initialSettings);
    setFeedback(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Settings</h1></div>
        <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">System configuration and information</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadSettings()} disabled={loading || saving} className="btn-secondary flex items-center gap-2 disabled:opacity-60">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={handleReset} disabled={!isDirty || saving} className="btn-secondary flex items-center gap-2 disabled:opacity-60">
            <RotateCcw size={14} /> Reset
          </button>
          <button onClick={handleSave} disabled={saving || !!validationMessage} className="btn-primary flex items-center gap-2 disabled:opacity-60">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-gray-500">
          Changes to localization and session fields persist for the current Trader UI user and update shared system defaults where supported.
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className={`inline-flex rounded-full px-2.5 py-1 font-medium ${isDirty ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
            {isDirty ? 'Unsaved changes' : 'All changes saved'}
          </span>
          {validationMessage && <span className="text-red-600">{validationMessage}</span>}
        </div>
      </div>

      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm ${feedback.type === 'success' ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

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
        {settings.company ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <InfoRow label="Company Name" value={settings.company.name} />
            <InfoRow label="Abbreviation" value={settings.company.abbr} />
            <InfoRow label="Country" value={settings.company.country} />
            <InfoRow label="Currency" value={settings.company.default_currency} />
            <InfoRow label="Domain" value={settings.company.domain} />
            <InfoRow label="Chart of Accounts" value={settings.company.chart_of_accounts} />
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No company configured. Run the setup wizard first.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Globe size={20} className="text-blue-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Localization</h2>
              <p className="text-sm text-gray-500">Regional defaults used by the Trader UI</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Language"><SearchableSelect value={settings.ui.language} onChange={(v) => updateUi('language', v)} options={LANGUAGE_OPTIONS} placeholder="Select language" /></Field>
            <Field label="Time Zone"><SearchableSelect value={settings.ui.time_zone} onChange={(v) => updateUi('time_zone', v)} options={TIME_ZONE_OPTIONS} placeholder="Select time zone" /></Field>
            <Field label="Date Format"><SearchableSelect value={settings.ui.date_format} onChange={(v) => updateUi('date_format', v)} options={DATE_FORMAT_OPTIONS} placeholder="Select date format" /></Field>
            <Field label="Number Format"><SearchableSelect value={settings.ui.number_format} onChange={(v) => updateUi('number_format', v)} options={NUMBER_FORMAT_OPTIONS} placeholder="Select number format" /></Field>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Shield size={20} className="text-purple-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Security & Session</h2>
              <p className="text-sm text-gray-500">Session and access controls</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Float Precision"><input type="number" min={0} max={9} value={settings.ui.float_precision} onChange={(e) => updateUi('float_precision', Number(e.target.value))} className="input-field" /></Field>
            <Field label="Session Expiry (mins)"><input type="number" min={15} step={15} value={settings.ui.session_expiry} onChange={(e) => updateUi('session_expiry', Number(e.target.value))} className="input-field" /></Field>
            <ToggleField label="Enable Two-Factor" checked={Boolean(settings.ui.enable_two_factor)} onChange={(checked) => updateUi('enable_two_factor', checked ? 1 : 0)} />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Bell size={20} className="text-amber-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Notifications</h2>
              <p className="text-sm text-gray-500">Personal UI notification preferences</p>
            </div>
          </div>
          <ToggleField label="Email Notifications" checked={Boolean(settings.ui.email_notifications)} onChange={(checked) => updateUi('email_notifications', checked ? 1 : 0)} />
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Moon size={20} className="text-slate-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Appearance</h2>
              <p className="text-sm text-gray-500">Lightweight UI preferences stored for the current user</p>
            </div>
          </div>
          <div className="space-y-4">
            <ToggleField label="Dark Mode" checked={Boolean(settings.ui.dark_mode)} onChange={(checked) => updateUi('dark_mode', checked ? 1 : 0)} />
            <ToggleField label="Compact Tables" checked={Boolean(settings.ui.compact_tables)} onChange={(checked) => updateUi('compact_tables', checked ? 1 : 0)} />
          </div>
        </div>
      </div>

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

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
            <Layers size={20} className="text-teal-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Trader Modules</h2>
            <p className="text-sm text-gray-500">Manage bundling, tax, and printing configuration</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button onClick={() => navigate('/settings/bundles')} className="text-left block p-4 rounded-lg border border-gray-200 hover:border-brand-300 hover:shadow-sm transition-all">
            <div className="flex items-center gap-2"><Layers size={16} className="text-brand-700" /><h4 className="text-sm font-medium text-brand-700">Item Bundles</h4></div>
            <p className="text-xs text-gray-500 mt-1">Group items into reusable bundles</p>
          </button>
          <button onClick={() => navigate('/settings/gst')} className="text-left block p-4 rounded-lg border border-gray-200 hover:border-brand-300 hover:shadow-sm transition-all">
            <div className="flex items-center gap-2"><Receipt size={16} className="text-brand-700" /><h4 className="text-sm font-medium text-brand-700">GST Settings</h4></div>
            <p className="text-xs text-gray-500 mt-1">Configure tax rates and templates</p>
          </button>
        </div>
      </div>

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </button>
    </label>
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

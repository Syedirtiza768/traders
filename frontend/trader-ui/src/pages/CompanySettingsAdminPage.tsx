import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, RefreshCw, Save, X } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

type CompanySettings = {
  name: string;
  abbr: string;
  country: string;
  default_currency: string;
  domain: string;
  phone_no: string;
  company_email: string;
  website: string;
  date_of_establishment: string;
  standard_working_hours: number;
  default_cash_account: string;
  default_payable_account: string;
  default_receivable_account: string;
  round_off_account: string;
  payment_terms: string;
};

const EMPTY: CompanySettings = {
  name: '', abbr: '', country: '', default_currency: '', domain: '',
  phone_no: '', company_email: '', website: '', date_of_establishment: '',
  standard_working_hours: 8, default_cash_account: '', default_payable_account: '',
  default_receivable_account: '', round_off_account: '', payment_terms: '',
};

export default function CompanySettingsAdminPage() {
  const navigate = useNavigate();
  const roles = useAuthStore((s) => s.roles);
  const isAdmin = roles.includes('Trader Admin') || roles.includes('System Manager');

  const [settings, setSettings] = useState<CompanySettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await adminApi.getCompanySettings();
      setSettings({ ...EMPTY, ...(res.data.message as CompanySettings) });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.exception || 'Could not load company settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await adminApi.saveCompanySettings(settings);
      setFeedback({ type: 'success', message: 'Company settings saved.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.exception || err?.response?.data?.message || 'Could not save.' });
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/settings')} className="inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
          <ArrowLeft size={16} /> Back to Settings
        </button>
        <div className="card p-8 text-center text-gray-500 dark:text-slate-400">Administrator access required.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/settings')} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 dark:text-brand-400 hover:text-brand-800">
          <ArrowLeft size={16} /> Back to Settings
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">Company Settings</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Edit company contact information, working hours, and default finance accounts</p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button onClick={() => void load()} className="btn-secondary flex items-center gap-2">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={() => void handleSave()} disabled={saving || loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              <Save size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-start justify-between gap-3 ${
          feedback.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100'
            : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)}><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="spinner" /></div>
      ) : (
        <div className="space-y-5">
          {/* Identity — read-only */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
                <Building2 size={18} className="text-brand-700 dark:text-brand-300" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Company Identity</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">Read-only — set during initial setup</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
              <ReadField label="Company Name" value={settings.name} />
              <ReadField label="Abbreviation" value={settings.abbr} />
              <ReadField label="Country" value={settings.country} />
              <ReadField label="Default Currency" value={settings.default_currency} />
              <ReadField label="Domain" value={settings.domain} />
            </div>
          </div>

          {/* Contact Info — editable */}
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Phone Number</span>
                <input type="tel" value={settings.phone_no} onChange={(e) => set('phone_no', e.target.value)} className="input-field mt-1" placeholder="+92 21 000 0000" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Company Email</span>
                <input type="email" value={settings.company_email} onChange={(e) => set('company_email', e.target.value)} className="input-field mt-1" placeholder="info@company.com" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Website</span>
                <input type="url" value={settings.website} onChange={(e) => set('website', e.target.value)} className="input-field mt-1" placeholder="https://example.com" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Date of Establishment</span>
                <input type="date" value={settings.date_of_establishment} onChange={(e) => set('date_of_establishment', e.target.value)} className="input-field mt-1" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Standard Working Hours (per day)</span>
                <input
                  type="number"
                  min={1}
                  max={24}
                  step={0.5}
                  value={settings.standard_working_hours}
                  onChange={(e) => set('standard_working_hours', parseFloat(e.target.value) || 8)}
                  className="input-field mt-1"
                />
              </label>
            </div>
          </div>

          {/* Default Finance Accounts — editable */}
          <div className="card p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Default Finance Accounts</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">Enter the exact account name as configured in your Chart of Accounts</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Default Cash Account</span>
                <input type="text" value={settings.default_cash_account} onChange={(e) => set('default_cash_account', e.target.value)} className="input-field mt-1" placeholder="Cash - ABBR" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Default Payable Account</span>
                <input type="text" value={settings.default_payable_account} onChange={(e) => set('default_payable_account', e.target.value)} className="input-field mt-1" placeholder="Creditors - ABBR" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Default Receivable Account</span>
                <input type="text" value={settings.default_receivable_account} onChange={(e) => set('default_receivable_account', e.target.value)} className="input-field mt-1" placeholder="Debtors - ABBR" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Round Off Account</span>
                <input type="text" value={settings.round_off_account} onChange={(e) => set('round_off_account', e.target.value)} className="input-field mt-1" placeholder="Round Off - ABBR" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Default Payment Terms Template</span>
                <input type="text" value={settings.payment_terms} onChange={(e) => set('payment_terms', e.target.value)} className="input-field mt-1" placeholder="e.g. Net 30" />
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => void handleSave()} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              <Save size={14} /> {saving ? 'Saving…' : 'Save Company Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReadField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">{value || '—'}</dd>
    </div>
  );
}

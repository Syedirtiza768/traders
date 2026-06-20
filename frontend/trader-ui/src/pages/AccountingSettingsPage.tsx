import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Save, X, BookOpen, CreditCard, FileText, Calculator } from 'lucide-react';
import { adminApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

type AccountingSettings = {
  acc_frozen_upto: string;
  frozen_accounts_modifier: string;
  credit_controller: string;
  over_billing_allowance: number;
  credit_limit: number;
  check_supplier_invoice_uniqueness: number;
  unlink_payment_on_cancellation_of_invoice: number;
  unlink_advance_payment_on_cancelation_of_order: number;
  book_asset_depreciation_entry_automatically: number;
  add_taxes_from_item_tax_template: number;
  show_inclusive_tax_in_print: number;
  automatically_fetch_payment_terms: number;
  allow_multi_currency_invoices_against_single_party_account: number;
};

const DEFAULTS: AccountingSettings = {
  acc_frozen_upto: '',
  frozen_accounts_modifier: '',
  credit_controller: '',
  over_billing_allowance: 0,
  credit_limit: 0,
  check_supplier_invoice_uniqueness: 0,
  unlink_payment_on_cancellation_of_invoice: 0,
  unlink_advance_payment_on_cancelation_of_order: 0,
  book_asset_depreciation_entry_automatically: 1,
  add_taxes_from_item_tax_template: 1,
  show_inclusive_tax_in_print: 0,
  automatically_fetch_payment_terms: 0,
  allow_multi_currency_invoices_against_single_party_account: 0,
};

export default function AccountingSettingsPage() {
  const navigate = useNavigate();
  const roles = useAuthStore((s) => s.roles);
  const isAdmin = roles.includes('Trader Admin') || roles.includes('System Manager');

  const [settings, setSettings] = useState<AccountingSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await adminApi.getAccountingSettings();
      setSettings({ ...DEFAULTS, ...(res.data.message as AccountingSettings) });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.exception || 'Could not load accounting settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await adminApi.saveAccountingSettings(settings);
      setFeedback({ type: 'success', message: 'Accounting settings saved.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.exception || err?.response?.data?.message || 'Could not save accounting settings.' });
    } finally {
      setSaving(false);
    }
  };

  const setBool = (key: keyof AccountingSettings, val: boolean) =>
    setSettings((s) => ({ ...s, [key]: val ? 1 : 0 }));
  const setStr = (key: keyof AccountingSettings, val: string) =>
    setSettings((s) => ({ ...s, [key]: val }));
  const setNum = (key: keyof AccountingSettings, val: number) =>
    setSettings((s) => ({ ...s, [key]: val }));

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
            <h1 className="page-title">Accounting Settings</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Configure system-wide accounting defaults, invoice rules, and payment behaviour</p>
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
          {/* Freeze & Credit Control */}
          <div className="card p-6">
            <SectionHeader icon={<BookOpen size={18} className="text-brand-600 dark:text-brand-400" />} title="Period Freeze & Credit Control" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mt-5">
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Accounts Frozen Up To</span>
                <input
                  type="date"
                  value={settings.acc_frozen_upto}
                  onChange={(e) => setStr('acc_frozen_upto', e.target.value)}
                  className="input-field mt-1"
                />
                <span className="text-xs text-gray-400 dark:text-slate-500 mt-1 block">No postings allowed on or before this date (leave blank to disable)</span>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Frozen Accounts Modifier</span>
                <input
                  type="text"
                  value={settings.frozen_accounts_modifier}
                  onChange={(e) => setStr('frozen_accounts_modifier', e.target.value)}
                  placeholder="e.g. Accounts Manager"
                  className="input-field mt-1"
                />
                <span className="text-xs text-gray-400 dark:text-slate-500 mt-1 block">Role that can still post to frozen accounts</span>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Credit Controller Role</span>
                <input
                  type="text"
                  value={settings.credit_controller}
                  onChange={(e) => setStr('credit_controller', e.target.value)}
                  placeholder="e.g. Sales Manager"
                  className="input-field mt-1"
                />
                <span className="text-xs text-gray-400 dark:text-slate-500 mt-1 block">Role that can override credit limit breaches</span>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Over-Billing Allowance (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={settings.over_billing_allowance}
                  onChange={(e) => setNum('over_billing_allowance', parseFloat(e.target.value) || 0)}
                  className="input-field mt-1"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Default Credit Limit</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={settings.credit_limit}
                  onChange={(e) => setNum('credit_limit', parseFloat(e.target.value) || 0)}
                  className="input-field mt-1"
                />
              </label>
            </div>
          </div>

          {/* Invoice & Payment Rules */}
          <div className="card p-6">
            <SectionHeader icon={<CreditCard size={18} className="text-sky-600 dark:text-sky-400" />} title="Invoice & Payment Rules" />
            <div className="mt-5 space-y-3">
              <ToggleSetting
                label="Check Supplier Invoice Uniqueness"
                description="Prevent duplicate supplier invoice numbers from being submitted"
                checked={!!settings.check_supplier_invoice_uniqueness}
                onChange={(v) => setBool('check_supplier_invoice_uniqueness', v)}
              />
              <ToggleSetting
                label="Unlink Payment on Invoice Cancellation"
                description="Automatically detach payment entries when a sales or purchase invoice is cancelled"
                checked={!!settings.unlink_payment_on_cancellation_of_invoice}
                onChange={(v) => setBool('unlink_payment_on_cancellation_of_invoice', v)}
              />
              <ToggleSetting
                label="Unlink Advance Payment on Order Cancellation"
                description="Detach advance payment entries when a sales or purchase order is cancelled"
                checked={!!settings.unlink_advance_payment_on_cancelation_of_order}
                onChange={(v) => setBool('unlink_advance_payment_on_cancelation_of_order', v)}
              />
              <ToggleSetting
                label="Automatically Fetch Payment Terms"
                description="Pre-fill payment schedule on invoices based on the customer / supplier payment terms template"
                checked={!!settings.automatically_fetch_payment_terms}
                onChange={(v) => setBool('automatically_fetch_payment_terms', v)}
              />
              <ToggleSetting
                label="Allow Multi-Currency Invoices Against Single-Currency Account"
                description="Permit foreign-currency transactions to be posted against a company default (home-currency) party account"
                checked={!!settings.allow_multi_currency_invoices_against_single_party_account}
                onChange={(v) => setBool('allow_multi_currency_invoices_against_single_party_account', v)}
              />
            </div>
          </div>

          {/* Tax & Printing */}
          <div className="card p-6">
            <SectionHeader icon={<Calculator size={18} className="text-amber-600 dark:text-amber-400" />} title="Tax & Printing" />
            <div className="mt-5 space-y-3">
              <ToggleSetting
                label="Add Taxes from Item Tax Template"
                description="Automatically copy tax rates from the Item Tax Template when adding items to invoices"
                checked={!!settings.add_taxes_from_item_tax_template}
                onChange={(v) => setBool('add_taxes_from_item_tax_template', v)}
              />
              <ToggleSetting
                label="Show Inclusive Tax in Print"
                description="Display tax amounts inclusive of the item price on printed invoices"
                checked={!!settings.show_inclusive_tax_in_print}
                onChange={(v) => setBool('show_inclusive_tax_in_print', v)}
              />
            </div>
          </div>

          {/* Asset */}
          <div className="card p-6">
            <SectionHeader icon={<FileText size={18} className="text-violet-600 dark:text-violet-400" />} title="Asset Depreciation" />
            <div className="mt-5">
              <ToggleSetting
                label="Book Asset Depreciation Automatically"
                description="Create depreciation journal entries automatically based on asset schedules"
                checked={!!settings.book_asset_depreciation_entry_automatically}
                onChange={(v) => setBool('book_asset_depreciation_entry_automatically', v)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => void handleSave()} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              <Save size={14} /> {saving ? 'Saving…' : 'Save Accounting Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
        {icon}
      </div>
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/40 px-4 py-3 hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
      <div className="mt-0.5 flex-shrink-0">
        <div
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            checked ? 'bg-brand-600' : 'bg-gray-200 dark:bg-slate-600'
          }`}
          role="switch"
          aria-checked={checked}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              checked ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </div>
      </div>
      <div className="flex-1">
        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
        <span className="block text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">{description}</span>
      </div>
    </label>
  );
}

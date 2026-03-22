import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Download, Percent, RefreshCw, Save, Shield } from 'lucide-react';
import { gstApi } from '../lib/api';
import SearchableSelect from '../components/SearchableSelect';

type GstConfig = {
  default_sales_tax_template: string;
  default_purchase_tax_template: string;
  auto_apply_tax: number;
  region: string;
  country: string;
  gst_registered: number;
  ntn_number: string;
  strn_number: string;
};

type TaxTemplate = { name: string; title: string; is_default: number; disabled?: number; taxes?: any[] };

const REGION_OPTIONS = [
  { label: 'Punjab', value: 'Punjab' },
  { label: 'Sindh', value: 'Sindh' },
  { label: 'Khyber Pakhtunkhwa', value: 'Khyber Pakhtunkhwa' },
  { label: 'Balochistan', value: 'Balochistan' },
  { label: 'Islamabad Capital Territory', value: 'Islamabad Capital Territory' },
  { label: 'Gilgit-Baltistan', value: 'Gilgit-Baltistan' },
  { label: 'Azad Jammu & Kashmir', value: 'Azad Jammu & Kashmir' },
];

const DEFAULT_CONFIG: GstConfig = {
  default_sales_tax_template: '',
  default_purchase_tax_template: '',
  auto_apply_tax: 1,
  region: 'Punjab',
  country: 'Pakistan',
  gst_registered: 1,
  ntn_number: '',
  strn_number: '',
};

export default function GstSettingsPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<GstConfig>(DEFAULT_CONFIG);
  const [salesTemplates, setSalesTemplates] = useState<TaxTemplate[]>([]);
  const [purchaseTemplates, setPurchaseTemplates] = useState<TaxTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [company, setCompany] = useState<string>('');

  useEffect(() => {
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await gstApi.getSettings();
      const data = res.data.message;
      setCompany(data.company || '');
      setSalesTemplates(data.sales_templates || []);
      setPurchaseTemplates(data.purchase_templates || []);
      setConfig({ ...DEFAULT_CONFIG, ...(data.config || {}) });
    } catch {
      setFeedback({ type: 'error', message: 'Could not load GST settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await gstApi.saveSettings({ company, config });
      setFeedback({ type: 'success', message: 'GST settings saved.' });
    } catch {
      setFeedback({ type: 'error', message: 'Could not save GST settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSeedTemplates = async () => {
    if (!window.confirm('This will create default Punjab GST tax templates (18%, 10%, 3%, 0%). Existing templates will not be overwritten. Continue?')) return;
    setSeeding(true);
    setFeedback(null);
    try {
      const res = await gstApi.seedTemplates(company);
      const data = res.data.message;
      setFeedback({ type: 'success', message: data.message || 'Templates created.' });
      void loadSettings();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.response?.data?.exception || 'Could not create templates.' });
    } finally {
      setSeeding(false);
    }
  };

  const updateConfig = <K extends keyof GstConfig>(key: K, value: GstConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div><h1 className="page-title">GST Settings</h1></div>
        <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button onClick={() => navigate('/settings')} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft size={16} /> Back to Settings
          </button>
          <h1 className="page-title">GST Settings</h1>
          <p className="mt-1 text-gray-500">Configure General Sales Tax (GST) rules for Pakistan. Default: Punjab province.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Save size={14} /> {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm ${feedback.type === 'success' ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Registration Info */}
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Shield size={18} className="text-brand-500" /> Tax Registration
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region / Province</label>
              <SearchableSelect
                value={config.region}
                onChange={(v) => updateConfig('region', v)}
                options={REGION_OPTIONS}
                placeholder="Select region"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input type="text" value={config.country} onChange={(e) => updateConfig('country', e.target.value)} className="input-field" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.gst_registered === 1}
                onChange={(e) => updateConfig('gst_registered', e.target.checked ? 1 : 0)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
            <span className="text-sm text-gray-700">GST Registered Business</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NTN Number</label>
              <input type="text" value={config.ntn_number} onChange={(e) => updateConfig('ntn_number', e.target.value)} className="input-field" placeholder="National Tax Number" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">STRN Number</label>
              <input type="text" value={config.strn_number} onChange={(e) => updateConfig('strn_number', e.target.value)} className="input-field" placeholder="Sales Tax Registration Number" />
            </div>
          </div>
        </div>

        {/* Default Templates */}
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Percent size={18} className="text-brand-500" /> Tax Templates
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Sales Tax Template</label>
            <SearchableSelect
              value={config.default_sales_tax_template}
              onChange={(v) => updateConfig('default_sales_tax_template', v)}
              options={salesTemplates.map((t) => ({ label: `${t.title}${t.is_default ? ' (Default)' : ''}`, value: t.name }))}
              placeholder="Select sales tax template"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Purchase Tax Template</label>
            <SearchableSelect
              value={config.default_purchase_tax_template}
              onChange={(v) => updateConfig('default_purchase_tax_template', v)}
              options={purchaseTemplates.map((t) => ({ label: `${t.title}${t.is_default ? ' (Default)' : ''}`, value: t.name }))}
              placeholder="Select purchase tax template"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={config.auto_apply_tax === 1}
                onChange={(e) => updateConfig('auto_apply_tax', e.target.checked ? 1 : 0)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
            <span className="text-sm text-gray-700">Auto-apply default tax template to new documents</span>
          </div>

          <button onClick={handleSeedTemplates} disabled={seeding} className="btn-secondary flex items-center gap-2 w-full justify-center disabled:opacity-60">
            <Download size={14} /> {seeding ? 'Creating…' : 'Seed Punjab GST Templates (18% / 10% / 3% / 0%)'}
          </button>
        </div>
      </div>

      {/* Templates Overview */}
      {salesTemplates.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Sales Tax Templates</h2>
            <p className="text-sm text-gray-500">Tax templates available for Quotations, Sales Orders, and Invoices</p>
          </div>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Template</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Rate</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-gray-500">Default</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {salesTemplates.map((tmpl) => (
                    <tr key={tmpl.name} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{tmpl.title || tmpl.name}</td>
                      <td className="px-6 py-3 text-right text-sm text-gray-700">
                        {tmpl.taxes && tmpl.taxes.length > 0 ? `${tmpl.taxes[0].rate}%` : '—'}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {tmpl.is_default ? <Check size={16} className="inline text-green-600" /> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tmpl.disabled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {tmpl.disabled ? 'Disabled' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {salesTemplates.map((tmpl) => (
              <div key={`m-${tmpl.name}`} className="px-4 py-3">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{tmpl.title || tmpl.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${tmpl.disabled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {tmpl.disabled ? 'Disabled' : 'Active'}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  <span>Rate: {tmpl.taxes && tmpl.taxes.length > 0 ? `${tmpl.taxes[0].rate}%` : '—'}</span>
                  {tmpl.is_default && <span className="text-green-600 font-medium">Default</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

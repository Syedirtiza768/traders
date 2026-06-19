import { useEffect, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { catalogApi } from '../lib/api';

type Props = {
  isAdmin: boolean;
};

export default function SkuConfigEditor({ isAdmin }: Props) {
  const [taxonomyJson, setTaxonomyJson] = useState('{}');
  const [groupMapJson, setGroupMapJson] = useState('{}');
  const [customTemplatesJson, setCustomTemplatesJson] = useState('{}');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'taxonomy' | 'groups' | 'custom' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await catalogApi.getItemLineConfig();
      const msg = res.data.message as any;
      setTaxonomyJson(JSON.stringify(msg.taxonomy || {}, null, 2));
      setGroupMapJson(JSON.stringify(msg.item_group_templates || {}, null, 2));
      const templates = msg.templates || {};
      const customOnly: Record<string, unknown> = {};
      Object.entries(templates).forEach(([k, v]) => {
        if (k !== 'generic' && k !== 'components') customOnly[k] = v;
      });
      setCustomTemplatesJson(JSON.stringify(customOnly, null, 2));
    } catch {
      setError('Could not load SKU configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveTaxonomy = async () => {
    setSaving('taxonomy');
    setError(null);
    setMessage(null);
    try {
      const parsed = JSON.parse(taxonomyJson);
      await catalogApi.saveSkuTaxonomy(parsed);
      setMessage('SKU taxonomy overlay saved.');
      void load();
    } catch (err: any) {
      setError(err?.response?.data?.exception || err?.message || 'Invalid taxonomy JSON.');
    } finally {
      setSaving(null);
    }
  };

  const saveGroupMap = async () => {
    setSaving('groups');
    setError(null);
    setMessage(null);
    try {
      const parsed = JSON.parse(groupMapJson);
      await catalogApi.saveItemGroupTemplates(parsed);
      setMessage('Item group template map saved.');
      void load();
    } catch (err: any) {
      setError(err?.response?.data?.exception || err?.message || 'Invalid group map JSON.');
    } finally {
      setSaving(null);
    }
  };

  const saveCustomTemplates = async () => {
    setSaving('custom');
    setError(null);
    setMessage(null);
    try {
      const parsed = JSON.parse(customTemplatesJson);
      await catalogApi.saveCustomSkuTemplates(parsed);
      setMessage('Custom SKU templates saved.');
      void load();
    } catch (err: any) {
      setError(err?.response?.data?.exception || err?.message || 'Invalid templates JSON.');
    } finally {
      setSaving(null);
    }
  };

  if (!isAdmin) {
    return (
      <p className="text-xs text-gray-500 dark:text-slate-400">
        SKU taxonomy and template mapping can only be edited by Trader Admin.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Loading SKU configuration…</p>;
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 px-3 py-2 text-sm text-green-700 dark:text-green-300">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <EditorBlock
        title="SKU attribute taxonomy (company overlay)"
        hint='Category → { "form_factors": [], "capacities": [], "grades": [] }. Merged with system seed and item values.'
        value={taxonomyJson}
        onChange={setTaxonomyJson}
        onSave={() => void saveTaxonomy()}
        saving={saving === 'taxonomy'}
      />

      <EditorBlock
        title="Item group → template map"
        hint='e.g. { "SSD": "components", "Consumables": "generic", "*": "generic" }'
        value={groupMapJson}
        onChange={setGroupMapJson}
        onSave={() => void saveGroupMap()}
        saving={saving === 'groups'}
      />

      <EditorBlock
        title="Custom SKU templates"
        hint='Extra template ids beyond built-in "components" and "generic". Use resolver "components" for 4-axis SKU creation.'
        value={customTemplatesJson}
        onChange={setCustomTemplatesJson}
        onSave={() => void saveCustomTemplates()}
        saving={saving === 'custom'}
      />
    </div>
  );
}

function EditorBlock({
  title,
  hint,
  value,
  onChange,
  onSave,
  saving,
}: {
  title: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{hint}</p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        className="input-field font-mono text-xs w-full"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

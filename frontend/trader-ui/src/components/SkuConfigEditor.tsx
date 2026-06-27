import { useEffect, useState, useCallback } from 'react';
import { Save, Loader2, Plus, X, Trash2 } from 'lucide-react';
import { catalogApi } from '../lib/api';

type Props = {
  isAdmin: boolean;
};

// ─── Data shapes ────────────────────────────────────────────────

type Taxonomy = Record<string, { form_factors: string[]; capacities: string[]; grades: string[] }>;
type GroupMap = Record<string, string>;
type Templates = Record<string, { resolver: string; [k: string]: unknown }>;

const KNOWN_TEMPLATES = ['generic', 'components'] as const;

export default function SkuConfigEditor({ isAdmin }: Props) {
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({});
  const [groupMap, setGroupMap] = useState<GroupMap>({});
  const [customTemplates, setCustomTemplates] = useState<Templates>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'taxonomy' | 'groups' | 'custom' | null>(null);
  const [flash, setFlash] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFlash(null);
    try {
      const res = await catalogApi.getItemLineConfig();
      const msg = res.data.message as any;
      setTaxonomy(msg.taxonomy || {});
      setGroupMap(msg.item_group_templates || {});
      const templates: Templates = msg.templates || {};
      const customOnly: Templates = {};
      Object.entries(templates).forEach(([k, v]) => {
        if (k !== 'generic' && k !== 'components') customOnly[k] = v as any;
      });
      setCustomTemplates(customOnly);
    } catch {
      setFlash({ type: 'err', text: 'Could not load SKU configuration.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flashOk = (text: string) => {
    setFlash({ type: 'ok', text });
    setTimeout(() => setFlash(null), 3000);
  };

  // ── Save handlers ────────────────────────────────────────────

  const saveTaxonomy = async () => {
    setSaving('taxonomy');
    setFlash(null);
    try {
      await catalogApi.saveSkuTaxonomy(taxonomy);
      flashOk('SKU taxonomy overlay saved.');
      void load();
    } catch (err: any) {
      setFlash({ type: 'err', text: err?.response?.data?.exception || err?.message || 'Failed to save taxonomy.' });
    } finally {
      setSaving(null);
    }
  };

  const saveGroupMap = async () => {
    setSaving('groups');
    setFlash(null);
    try {
      await catalogApi.saveItemGroupTemplates(groupMap);
      flashOk('Item group template map saved.');
      void load();
    } catch (err: any) {
      setFlash({ type: 'err', text: err?.response?.data?.exception || err?.message || 'Failed to save group map.' });
    } finally {
      setSaving(null);
    }
  };

  const saveCustomTemplates = async () => {
    setSaving('custom');
    setFlash(null);
    try {
      await catalogApi.saveCustomSkuTemplates(customTemplates);
      flashOk('Custom SKU templates saved.');
      void load();
    } catch (err: any) {
      setFlash({ type: 'err', text: err?.response?.data?.exception || err?.message || 'Failed to save templates.' });
    } finally {
      setSaving(null);
    }
  };

  // All template IDs (built-in + custom) for datalist suggestions
  const allTemplateIds = [...KNOWN_TEMPLATES, ...Object.keys(customTemplates)];

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
      {flash && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            flash.type === 'ok'
              ? 'border-green-200 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              : 'border-red-200 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          }`}
        >
          {flash.text}
        </div>
      )}

      <TaxonomyEditor value={taxonomy} onChange={setTaxonomy} onSave={saveTaxonomy} saving={saving === 'taxonomy'} />
      <GroupMapEditor value={groupMap} onChange={setGroupMap} onSave={saveGroupMap} saving={saving === 'groups'} templateSuggestions={allTemplateIds} />
      <CustomTemplatesEditor value={customTemplates} onChange={setCustomTemplates} onSave={saveCustomTemplates} saving={saving === 'custom'} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAXONOMY EDITOR — visual category/tag editor
// ═══════════════════════════════════════════════════════════════════

const AXES: { key: keyof Taxonomy[string]; label: string }[] = [
  { key: 'form_factors', label: 'Form Factors' },
  { key: 'capacities', label: 'Capacities' },
  { key: 'grades', label: 'Grades' },
];

function TaxonomyEditor({
  value,
  onChange,
  onSave,
  saving,
}: {
  value: Taxonomy;
  onChange: (v: Taxonomy) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [newCategoryName, setNewCategoryName] = useState('');

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name || value[name]) return;
    onChange({ ...value, [name]: { form_factors: [], capacities: [], grades: [] } });
    setNewCategoryName('');
  };

  const removeCategory = (cat: string) => {
    const next = { ...value };
    delete next[cat];
    onChange(next);
  };

  const addTag = (cat: string, axis: keyof Taxonomy[string], tag: string) => {
    const t = tag.trim();
    if (!t || value[cat][axis].includes(t)) return;
    onChange({ ...value, [cat]: { ...value[cat], [axis]: [...value[cat][axis], t] } });
  };

  const removeTag = (cat: string, axis: keyof Taxonomy[string], tag: string) => {
    onChange({
      ...value,
      [cat]: { ...value[cat], [axis]: value[cat][axis].filter((x) => x !== tag) },
    });
  };

  const catEntries = Object.entries(value);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            SKU attribute taxonomy (company overlay)
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Categories with their form factors, capacities, and grades. Merged with system seed and item values.
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="btn-secondary text-sm flex items-center gap-2 whitespace-nowrap disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {catEntries.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-slate-500 italic">No categories yet. Add one below.</p>
      )}

      <div className="space-y-3">
        {catEntries.map(([cat, axes]) => (
          <div
            key={cat}
            className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/40 p-3 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{cat}</span>
              <button type="button" onClick={() => removeCategory(cat)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Remove category">
                <Trash2 size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {AXES.map(({ key, label }) => (
                <TagGroup
                  key={key}
                  label={label}
                  tags={axes[key]}
                  onAdd={(tag) => addTag(cat, key, tag)}
                  onRemove={(tag) => removeTag(cat, key, tag)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
          placeholder="New category name…"
          className="input-field text-sm flex-1"
        />
        <button type="button" onClick={addCategory} className="btn-secondary text-sm flex items-center gap-1.5">
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  );
}

// ── Tag group ─────────────────────────────────────────────────────

function TagGroup({
  label,
  tags,
  onAdd,
  onRemove,
}: {
  label: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const t = input.trim();
    if (!t) return;
    onAdd(t);
    setInput('');
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
        {tags.length === 0 && <span className="text-xs text-gray-400 dark:text-slate-500 italic">None</span>}
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-200 dark:bg-slate-700 text-xs font-medium text-gray-800 dark:text-gray-200"
          >
            {t}
            <button type="button" onClick={() => onRemove(t)} className="text-gray-400 hover:text-red-500 transition-colors">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Add value…"
          className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button type="button" onClick={handleAdd} className="shrink-0 p-1 rounded text-gray-400 hover:text-brand-600 transition-colors">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GROUP MAP EDITOR — item group → template rows
// ═══════════════════════════════════════════════════════════════════

function GroupMapEditor({
  value,
  onChange,
  onSave,
  saving,
  templateSuggestions,
}: {
  value: GroupMap;
  onChange: (v: GroupMap) => void;
  onSave: () => void;
  saving: boolean;
  templateSuggestions: string[];
}) {
  // Local working copy so empty-key rows don't get lost until blur
  const [rows, setRows] = useState<{ itemGroup: string; template: string }[]>(() =>
    Object.entries(value).map(([k, v]) => ({ itemGroup: k, template: v }))
  );

  useEffect(() => {
    setRows(Object.entries(value).map(([k, v]) => ({ itemGroup: k, template: v })));
  }, [value]);

  const apply = (nextRows: typeof rows) => {
    const rebuilt: GroupMap = {};
    nextRows.forEach(({ itemGroup, template }) => {
      if (itemGroup.trim()) rebuilt[itemGroup.trim()] = template;
    });
    onChange(rebuilt);
  };

  const updateRow = (idx: number, field: 'itemGroup' | 'template', val: string) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, [field]: val } : r));
    setRows(next);
  };

  const commitRow = (idx: number) => {
    const next = [...rows];
    // If itemGroup is empty when blurred, remove the row
    if (!next[idx].itemGroup.trim()) {
      next.splice(idx, 1);
    }
    setRows(next);
    apply(next);
  };

  const addRow = () => {
    setRows([...rows, { itemGroup: '', template: 'generic' }]);
  };

  const removeRow = (idx: number) => {
    const next = rows.filter((_, i) => i !== idx);
    setRows(next);
    apply(next);
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Item group → template map</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Maps item groups (or <code className="text-xs bg-gray-200 dark:bg-slate-700 px-1 rounded">*</code> for default) to SKU templates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { apply(rows); onSave(); }}
          disabled={saving}
          className="btn-secondary text-sm flex items-center gap-2 whitespace-nowrap disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {rows.length > 0 && (
        <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_auto] gap-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide px-1">
          <span>Item Group</span>
          <span>Template ID</span>
          <span className="w-8" />
        </div>
      )}

      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <input
              type="text"
              value={row.itemGroup}
              onChange={(e) => updateRow(idx, 'itemGroup', e.target.value)}
              onBlur={() => commitRow(idx)}
              placeholder='e.g. "SSD" or "*"'
              className="input-field text-sm"
            />
            <div className="relative">
              <input
                type="text"
                value={row.template}
                onChange={(e) => updateRow(idx, 'template', e.target.value)}
                onBlur={() => apply(rows)}
                placeholder="template id"
                list="tmpl-suggestions"
                className="input-field text-sm"
              />
              <datalist id="tmpl-suggestions">
                {templateSuggestions.map((id) => (
                  <option key={id} value={id} />
                ))}
              </datalist>
            </div>
            <button
              type="button"
              onClick={() => removeRow(idx)}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Remove mapping"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-slate-500 italic">No mappings yet. Add one below.</p>
      )}

      <button type="button" onClick={addRow} className="btn-secondary text-sm flex items-center gap-1.5">
        <Plus size={14} /> Add mapping
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CUSTOM TEMPLATES EDITOR — list-based template manager
// ═══════════════════════════════════════════════════════════════════

function CustomTemplatesEditor({
  value,
  onChange,
  onSave,
  saving,
}: {
  value: Templates;
  onChange: (v: Templates) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [newId, setNewId] = useState('');
  const [newResolver, setNewResolver] = useState('components');

  const entries = Object.entries(value);

  const addTemplate = () => {
    const id = newId.trim();
    if (!id || value[id]) return;
    onChange({ ...value, [id]: { resolver: newResolver } });
    setNewId('');
  };

  const removeTemplate = (id: string) => {
    const next = { ...value };
    delete next[id];
    onChange(next);
  };

  const setResolver = (id: string, resolver: string) => {
    onChange({ ...value, [id]: { ...value[id], resolver } });
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Custom SKU templates</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Extra template ids beyond built-in{' '}
            <code className="text-xs bg-gray-200 dark:bg-slate-700 px-1 rounded">generic</code> and{' '}
            <code className="text-xs bg-gray-200 dark:bg-slate-700 px-1 rounded">components</code>.
            Use resolver <code className="text-xs bg-gray-200 dark:bg-slate-700 px-1 rounded">components</code> for 4-axis SKU creation.
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="btn-secondary text-sm flex items-center gap-2 whitespace-nowrap disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {entries.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-slate-500 italic">No custom templates. Add one below.</p>
      )}

      <div className="space-y-2">
        {entries.map(([id, tmpl]) => (
          <div
            key={id}
            className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/40 p-3"
          >
            <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100 min-w-[120px]">{id}</span>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
              <span>resolver:</span>
              <input
                type="text"
                value={tmpl.resolver}
                onChange={(e) => setResolver(id, e.target.value)}
                list="resolver-suggestions"
                className="w-28 px-2 py-1 text-xs font-mono border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <datalist id="resolver-suggestions">
                {KNOWN_TEMPLATES.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <button
              type="button"
              onClick={() => removeTemplate(id)}
              className="ml-auto p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Remove template"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <input
          type="text"
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTemplate(); }}
          placeholder="Template ID…"
          className="input-field text-sm flex-1 min-w-[140px]"
        />
        <select
          value={newResolver}
          onChange={(e) => setNewResolver(e.target.value)}
          className="input-field text-sm w-[140px]"
        >
          {KNOWN_TEMPLATES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button type="button" onClick={addTemplate} className="btn-secondary text-sm flex items-center gap-1.5">
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  );
}

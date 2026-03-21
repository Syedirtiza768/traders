import { useState } from 'react';
import { Search, X, Download } from 'lucide-react';

export type FilterDef = {
  key: string;
  label: string;
  type: 'date' | 'select' | 'text';
  options?: { label: string; value: string }[];
  defaultValue?: string;
};

type Props = {
  filters: FilterDef[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  onExport?: () => void;
};

export default function ReportFiltersBar({ filters, values, onChange, onExport }: Props) {
  const [local, setLocal] = useState(values);
  const update = (key: string, val: string) => setLocal((p) => ({ ...p, [key]: val }));

  const apply = () => onChange(local);
  const reset = () => {
    const defaults: Record<string, string> = {};
    filters.forEach((f) => { defaults[f.key] = f.defaultValue ?? ''; });
    setLocal(defaults);
    onChange(defaults);
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      {filters.map((f) => (
        <div key={f.key} className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{f.label}</label>
          {f.type === 'date' && (
            <input
              type="date"
              value={local[f.key] ?? ''}
              onChange={(e) => update(f.key, e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          )}
          {f.type === 'select' && (
            <select
              value={local[f.key] ?? ''}
              onChange={(e) => update(f.key, e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              {(f.options ?? []).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          {f.type === 'text' && (
            <input
              type="text"
              value={local[f.key] ?? ''}
              onChange={(e) => update(f.key, e.target.value)}
              placeholder={f.label}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          )}
        </div>
      ))}
      <div className="flex items-center gap-2 ml-auto">
        <button onClick={apply} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <Search size={14} /> Apply
        </button>
        <button onClick={reset} className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <X size={14} /> Reset
        </button>
        {onExport && (
          <button onClick={onExport} className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-sm">
            <Download size={14} /> Export
          </button>
        )}
      </div>
    </div>
  );
}

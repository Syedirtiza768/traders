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

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const DATE_PRESETS: { label: string; from: () => string; to: () => string }[] = [
  { label: 'Today', from: () => isoDate(new Date()), to: () => isoDate(new Date()) },
  { label: 'Last 7d', from: () => { const d = new Date(); d.setDate(d.getDate() - 7); return isoDate(d); }, to: () => isoDate(new Date()) },
  { label: 'This Month', from: () => { const d = new Date(); return isoDate(new Date(d.getFullYear(), d.getMonth(), 1)); }, to: () => isoDate(new Date()) },
  { label: 'Last 30d', from: () => { const d = new Date(); d.setDate(d.getDate() - 30); return isoDate(d); }, to: () => isoDate(new Date()) },
  { label: 'This Quarter', from: () => { const d = new Date(); const q = Math.floor(d.getMonth() / 3) * 3; return isoDate(new Date(d.getFullYear(), q, 1)); }, to: () => isoDate(new Date()) },
  { label: 'YTD', from: () => isoDate(new Date(new Date().getFullYear(), 0, 1)), to: () => isoDate(new Date()) },
  { label: 'Last 12m', from: () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return isoDate(d); }, to: () => isoDate(new Date()) },
];

export default function ReportFiltersBar({ filters, values, onChange, onExport }: Props) {
  const [local, setLocal] = useState(values);
  const update = (key: string, val: string) => setLocal((p) => ({ ...p, [key]: val }));

  const hasDateFilters = filters.some((f) => f.key === 'from_date') && filters.some((f) => f.key === 'to_date');

  const applyPreset = (preset: typeof DATE_PRESETS[number]) => {
    const next = { ...local, from_date: preset.from(), to_date: preset.to() };
    setLocal(next);
    onChange(next);
  };

  const apply = () => onChange(local);
  const reset = () => {
    const defaults: Record<string, string> = {};
    filters.forEach((f) => { defaults[f.key] = f.defaultValue ?? ''; });
    setLocal(defaults);
    onChange(defaults);
  };

  return (
    <div className="space-y-2">
      {hasDateFilters && (
        <div className="flex flex-wrap gap-1 scrollbar-hide overflow-x-auto">
          {DATE_PRESETS.map((p) => (
            <button key={p.label} onClick={() => applyPreset(p)}
                    className="px-2 py-1 rounded text-xs font-medium bg-gray-100 hover:bg-brand-50 hover:text-brand-700 text-gray-600 transition-colors whitespace-nowrap">
              {p.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      {filters.map((f) => (
        <div key={f.key} className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-xs font-medium text-gray-500">{f.label}</label>
          {f.type === 'date' && (
            <input
              type="date"
              value={local[f.key] ?? ''}
              onChange={(e) => update(f.key, e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm min-h-[44px]"
            />
          )}
          {f.type === 'select' && (
            <select
              value={local[f.key] ?? ''}
              onChange={(e) => update(f.key, e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm min-h-[44px]"
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
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm min-h-[44px]"
            />
          )}
        </div>
      ))}
      <div className="flex items-center gap-2 sm:ml-auto pt-1 sm:pt-0">
        <button onClick={apply} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm flex-1 sm:flex-none justify-center">
          <Search size={14} /> Apply
        </button>
        <button onClick={reset} className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-sm flex-1 sm:flex-none justify-center">
          <X size={14} /> Reset
        </button>
        {onExport && (
          <button onClick={onExport} className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-sm flex-1 sm:flex-none justify-center">
            <Download size={14} /> Export
          </button>
        )}
      </div>
      </div>
    </div>
  );
}

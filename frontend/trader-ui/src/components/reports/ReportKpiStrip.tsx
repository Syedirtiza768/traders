import { formatCurrency, formatCompact } from '../../lib/utils';

export type KpiItem = {
  label: string;
  value: number | string | null | undefined;
  format?: 'currency' | 'compact' | 'number' | 'percent' | 'text';
  color?: string;
  prefix?: string;
  suffix?: string;
};

type Props = {
  items: KpiItem[];
};

function fmt(item: KpiItem): string {
  const val = item.value;
  if (val == null) return '—';
  const f = item.format ?? 'text';
  if (f === 'currency') return formatCurrency(Number(val));
  if (f === 'compact') return formatCompact(Number(val));
  if (f === 'number') return Number(val).toLocaleString('en-PK');
  if (f === 'percent') return `${Number(val).toFixed(1)}%`;
  return `${item.prefix ?? ''}${val}${item.suffix ?? ''}`;
}

export default function ReportKpiStrip({ items }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
      {items.map((item) => (
        <div key={item.label} className="card p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-gray-500 truncate">{item.label}</p>
          <p className={`text-sm sm:text-lg font-bold mt-1 truncate ${item.color ?? 'text-gray-900'}`}>{fmt(item)}</p>
        </div>
      ))}
    </div>
  );
}

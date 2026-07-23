import type { ComponentType, ReactNode } from 'react';
import { formatCompact } from '../../lib/utils';

type StatTone = 'blue' | 'green' | 'red' | 'purple' | 'amber' | 'violet';

const toneMap: Record<StatTone, { bg: string; ic: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', ic: 'text-blue-600 dark:text-blue-400' },
  green: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', ic: 'text-emerald-600 dark:text-emerald-400' },
  red: { bg: 'bg-red-50 dark:bg-red-950/40', ic: 'text-red-600 dark:text-red-400' },
  purple: { bg: 'bg-violet-50 dark:bg-violet-950/40', ic: 'text-violet-600 dark:text-violet-400' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-950/40', ic: 'text-violet-600 dark:text-violet-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', ic: 'text-amber-600 dark:text-amber-400' },
};

export interface StatCardProps {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  /** Raw numeric value — formatted via `format` when set. */
  value?: unknown;
  /** Pre-formatted display string (takes precedence over `value`). */
  display?: ReactNode;
  format?: 'currency' | 'number';
  color?: StatTone | string;
  className?: string;
}

/**
 * Compact KPI tile used on list pages. Presentation-only.
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  display,
  format,
  color = 'blue',
  className = '',
}: StatCardProps) {
  const tones = toneMap[(color as StatTone)] || toneMap.blue;
  let resolved: ReactNode = display;
  if (resolved == null) {
    if (value == null) {
      resolved = '—';
    } else if (format === 'currency') {
      resolved = formatCompact(Number(value));
    } else {
      resolved = Number(value ?? 0).toLocaleString();
    }
  }

  return (
    <div className={`card p-4 sm:p-5 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3">
        {Icon ? (
          <div className={`rounded-lg p-1.5 sm:p-2 ${tones.bg}`}>
            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${tones.ic}`} aria-hidden="true" />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-[10px] text-gray-500 sm:text-xs dark:text-slate-400">{label}</p>
          <p className="text-sm font-bold tabular-nums text-gray-900 sm:text-lg dark:text-gray-100">
            {resolved}
          </p>
        </div>
      </div>
    </div>
  );
}

import { type LucideIcon } from 'lucide-react';
import { formatCurrency, formatCompact } from '../lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  format?: 'currency' | 'compact' | 'number';
  trend?: number;
  trendLabel?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  loading?: boolean;
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    iconBg: 'bg-blue-100',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    iconBg: 'bg-green-100',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    iconBg: 'bg-red-100',
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    iconBg: 'bg-purple-100',
  },
};

export default function KPICard({
  title,
  value,
  icon: Icon,
  format = 'currency',
  trend,
  trendLabel,
  color = 'blue',
  loading = false,
}: KPICardProps) {
  const colors = colorMap[color];

  const formattedValue = (() => {
    if (loading) return '—';
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'compact':
        return formatCompact(value);
      case 'number':
        return value.toLocaleString();
      default:
        return String(value);
    }
  })();

  return (
    <div className="kpi-card hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className={`text-lg sm:text-2xl font-bold text-gray-900 mt-1 truncate ${loading ? 'animate-pulse' : ''}`}>
            {formattedValue}
          </p>
        </div>
        <div className={`${colors.iconBg} p-2 sm:p-2.5 rounded-lg flex-shrink-0`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.icon}`} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-2 sm:mt-3 flex items-center gap-1">
          <span
            className={`text-xs sm:text-sm font-medium ${
              trend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          {trendLabel && (
            <span className="text-[10px] sm:text-xs text-gray-400">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

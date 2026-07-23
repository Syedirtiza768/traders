import { getStatusColor } from '../../lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Status pill that keeps color meaning but also shows the label text
 * (color is never the sole indicator).
 */
export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const label = status || 'Unknown';
  return (
    <span
      className={`status-badge inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(label)} ${className}`}
    >
      {label}
    </span>
  );
}

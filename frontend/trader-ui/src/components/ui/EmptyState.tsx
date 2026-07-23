import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

/**
 * Consistent empty / no-results presentation for tables and lists.
 */
export default function EmptyState({
  title = 'Nothing here yet',
  description,
  icon,
  action,
  className = '',
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`empty-state flex flex-col items-center justify-center text-center ${
        compact ? 'py-8 px-4' : 'py-12 px-6'
      } ${className}`}
      role="status"
    >
      <div className="empty-state-icon mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-400">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden="true" />}
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-slate-400">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

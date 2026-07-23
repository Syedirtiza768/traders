import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type AlertTone = 'info' | 'success' | 'warning' | 'error';

interface AlertBannerProps {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
  action?: ReactNode;
}

const toneStyles: Record<AlertTone, string> = {
  info: 'alert-info border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100',
  success:
    'alert-success border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100',
  warning:
    'alert-warning border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100',
  error:
    'alert-error border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100',
};

const icons: Record<AlertTone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

export default function AlertBanner({
  tone = 'info',
  title,
  children,
  onDismiss,
  className = '',
  action,
}: AlertBannerProps) {
  const Icon = icons[tone];
  return (
    <div
      className={`alert-banner flex gap-3 rounded-lg border px-4 py-3 ${toneStyles[tone]} ${className}`}
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 opacity-80" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        <div className={`text-sm ${title ? 'mt-0.5 opacity-90' : ''}`}>{children}</div>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 focus-visible:outline focus-visible:outline-2"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

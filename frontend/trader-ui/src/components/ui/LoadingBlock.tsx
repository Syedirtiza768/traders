interface LoadingBlockProps {
  label?: string;
  className?: string;
  compact?: boolean;
}

/** Accessible loading indicator for page/section loads. */
export default function LoadingBlock({
  label = 'Loading…',
  className = '',
  compact = false,
}: LoadingBlockProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${compact ? 'py-8' : 'py-12'} ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <p className="mt-3 text-sm text-gray-500 dark:text-slate-400" aria-hidden="true">
        {label}
      </p>
    </div>
  );
}

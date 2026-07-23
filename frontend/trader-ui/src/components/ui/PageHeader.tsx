import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

/**
 * Standard page header: title, optional description, primary/secondary actions.
 * Presentation-only — does not change routing or permissions.
 */
export default function PageHeader({
  title,
  description,
  actions,
  meta,
  className = '',
}: PageHeaderProps) {
  return (
    <header
      className={`page-header flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <h1 className="page-title">{title}</h1>
        {description ? (
          <p className="page-description">{description}</p>
        ) : null}
        {meta ? <div className="page-meta pt-1">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="page-actions flex flex-wrap items-center gap-2 self-start shrink-0">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

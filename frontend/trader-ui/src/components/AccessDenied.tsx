import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AccessDenied({
  title = 'Access restricted',
  description = 'Your current Trader role does not include access to this area.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[320px] items-center justify-center px-4" role="alert">
      <div className="max-w-lg w-full rounded-xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{description}</p>
        <p className="mt-4 text-sm text-gray-500 dark:text-slate-400">
          If you believe this is a mistake, contact your administrator.
        </p>
        <Link to="/" className="btn-secondary mt-6 inline-flex items-center justify-center">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
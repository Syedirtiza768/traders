import { ShieldAlert } from 'lucide-react';

export default function AccessDenied({
  title = 'Access restricted',
  description = 'Your current Trader role does not include access to this area.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <div className="max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}
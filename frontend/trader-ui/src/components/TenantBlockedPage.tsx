import { useAuthStore } from '../stores/authStore';
import { useTenantStore } from '../stores/tenantStore';

export default function TenantBlockedPage() {
  const { logout } = useAuthStore();
  const tenant = useTenantStore((s) => s.tenant);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900">Account unavailable</h1>
        <p className="text-sm text-slate-600 mt-3">
          {tenant?.tenant_name ? (
            <>
              The business account <strong>{tenant.tenant_name}</strong> is currently{' '}
              <strong>{tenant.status?.toLowerCase()}</strong>.
            </>
          ) : (
            <>Your business account is not active.</>
          )}
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Contact your platform administrator or support to restore access.
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-6 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

/** Redirect business users with suspended/deactivated tenants. */
export function TenantStatusGate({ children }: { children: React.ReactNode }) {
  const enabled = useTenantStore((s) => s.enabled);
  const initialized = useTenantStore((s) => s.initialized);
  const isBlocked = useTenantStore((s) => s.isBlocked);

  if (!enabled) return <>{children}</>;
  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="spinner" />
      </div>
    );
  }
  if (isBlocked) return <TenantBlockedPage />;
  return <>{children}</>;
}

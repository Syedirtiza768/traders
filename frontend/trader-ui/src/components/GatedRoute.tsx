import { type ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCompanyStore } from '../stores/companyStore';
import { useTenantStore } from '../stores/tenantStore';
import { hasCapability, type AppCapability } from '../lib/permissions';
import { type TenantModuleKey } from '../lib/tenantModules';
import AccessDenied from '../components/AccessDenied';

export type GatedRouteProps = {
  children: ReactNode;
  capability?: AppCapability;
  module?: TenantModuleKey;
  requiresComponents?: boolean;
};

/**
 * Combined role + tenant-module + components-feature gate for business routes.
 */
export default function GatedRoute({
  children,
  capability,
  module,
  requiresComponents = false,
}: GatedRouteProps) {
  const roles = useAuthStore((s) => s.roles);
  const componentsEnabled = useCompanyStore((s) => s.componentsEnabled);
  const isModuleEnabled = useTenantStore((s) => s.isModuleEnabled);
  const multitenantEnabled = useTenantStore((s) => s.enabled);

  if (capability && !hasCapability(roles, capability)) {
    return <AccessDenied />;
  }

  const effectiveModule: TenantModuleKey | undefined =
    module ?? (requiresComponents ? 'components' : undefined);

  if (multitenantEnabled && effectiveModule && !isModuleEnabled(effectiveModule)) {
    return (
      <AccessDenied
        title="Module not enabled"
        description="This module is not enabled for your business account. Contact your administrator."
      />
    );
  }

  if (requiresComponents && !componentsEnabled) {
    return (
      <AccessDenied
        title="Feature not enabled"
        description="The Components Trading feature is not enabled for this company. Enable it in Settings → Feature Flags."
      />
    );
  }

  return <>{children}</>;
}

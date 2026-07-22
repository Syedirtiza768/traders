import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCompanyStore } from '../stores/companyStore';
import { useTenantStore } from '../stores/tenantStore';
import { hasCapability, type AppCapability } from '../lib/permissions';
import { type TenantModuleKey } from '../lib/tenantModules';
import { type NavFeatureKey } from '../lib/navProfile';
import AccessDenied from '../components/AccessDenied';

export type GatedRouteProps = {
  children: ReactNode;
  capability?: AppCapability;
  module?: TenantModuleKey;
  requiresComponents?: boolean;
  requiresOpportunity?: boolean;
  /** Child-level nav feature; blocked when tenant nav profile hides it. */
  navFeature?: NavFeatureKey;
};

/**
 * Combined role + tenant-module + feature-flag + nav-profile gate for business routes.
 */
export default function GatedRoute({
  children,
  capability,
  module,
  requiresComponents = false,
  requiresOpportunity = false,
  navFeature,
}: GatedRouteProps) {
  const location = useLocation();
  const roles = useAuthStore((s) => s.roles);
  const componentsEnabled = useCompanyStore((s) => s.componentsEnabled);
  const opportunityEnabled = useCompanyStore((s) => s.opportunityEnabled);
  const isModuleEnabled = useTenantStore((s) => s.isModuleEnabled);
  const isNavFeatureVisible = useTenantStore((s) => s.isNavFeatureVisible);
  const isPathAllowedByNavProfile = useTenantStore((s) => s.isPathAllowedByNavProfile);
  const multitenantEnabled = useTenantStore((s) => s.enabled);

  if (capability && !hasCapability(roles, capability)) {
    return <AccessDenied />;
  }

  const effectiveModule: TenantModuleKey | undefined =
    module
    ?? (requiresComponents ? 'components' : undefined)
    ?? (requiresOpportunity ? 'opportunity' : undefined);

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

  if (requiresOpportunity && !opportunityEnabled) {
    return (
      <AccessDenied
        title="Feature not enabled"
        description="The Projects module is not enabled for this company. Enable it in Settings → Feature Flags, or provision an opportunity pack."
      />
    );
  }

  if (multitenantEnabled) {
    if (navFeature && !isNavFeatureVisible(navFeature)) {
      return (
        <AccessDenied
          title="Not available"
          description="This screen is not part of your business workspace. Use Day Book for daily trading."
        />
      );
    }
    if (!navFeature && !isPathAllowedByNavProfile(location.pathname)) {
      return (
        <AccessDenied
          title="Not available"
          description="This screen is not part of your business workspace. Use Day Book for daily trading."
        />
      );
    }
  }

  return <>{children}</>;
}

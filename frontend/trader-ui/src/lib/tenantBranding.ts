import type { TenantConfig } from '../stores/tenantStore';

export type TenantBranding = {
  primaryColor?: string;
  accentColor?: string;
  appName?: string;
  tagline?: string;
};

const BRANDING_STYLE_ID = 'trader-tenant-branding';

export function parseTenantBranding(tenant: TenantConfig | null | undefined): TenantBranding {
  const branding = (tenant?.branding || {}) as Record<string, unknown>;
  return {
    primaryColor: typeof branding.primaryColor === 'string' ? branding.primaryColor : undefined,
    accentColor: typeof branding.accentColor === 'string' ? branding.accentColor : undefined,
    appName: typeof branding.appName === 'string' ? branding.appName : tenant?.tenant_name,
    tagline: typeof branding.tagline === 'string' ? branding.tagline : undefined,
  };
}

export function applyTenantBranding(tenant: TenantConfig | null | undefined): void {
  const branding = parseTenantBranding(tenant);
  let style = document.getElementById(BRANDING_STYLE_ID) as HTMLStyleElement | null;

  if (!branding.primaryColor && !branding.accentColor) {
    style?.remove();
    return;
  }

  if (!style) {
    style = document.createElement('style');
    style.id = BRANDING_STYLE_ID;
    document.head.appendChild(style);
  }

  const primary = branding.primaryColor || '#1d4ed8';
  const accent = branding.accentColor || primary;

  style.textContent = `
    :root {
      --brand-600: ${primary};
      --brand-700: ${primary};
      --brand-800: ${accent};
    }
  `;
}

export function clearTenantBranding(): void {
  document.getElementById(BRANDING_STYLE_ID)?.remove();
}

export function tenantLogoUrl(logo?: string | null): string | null {
  if (!logo) return null;
  if (logo.startsWith('http') || logo.startsWith('/')) return logo;
  return `/api/method/frappe.utils.file_manager.download_file?file_url=${encodeURIComponent(logo)}`;
}

export function isTenantBlocked(status?: string | null): boolean {
  return status === 'Suspended' || status === 'Deactivated' || status === 'Pending';
}

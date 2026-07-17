import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Warehouse,
  BarChart2,
  MoreHorizontal,
  BookOpen,
  ArrowDownLeft,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useCompanyStore } from '../stores/companyStore';
import { useTenantStore } from '../stores/tenantStore';
import { hasCapability, type AppCapability } from '../lib/permissions';
import { type TenantModuleKey } from '../lib/tenantModules';
import { type NavFeatureKey } from '../lib/navProfile';

interface Tab {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  capability?: AppCapability;
  module?: TenantModuleKey;
  feature?: NavFeatureKey;
  requiresComponents?: boolean;
  id?: never;
}

interface MoreTab {
  id: 'more';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: never;
  exact?: never;
  capability?: never;
}

const STANDARD_TABS: (Tab | MoreTab)[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, exact: true, capability: 'dashboard:view', module: 'dashboard' },
  { to: '/sales', label: 'Sales', icon: TrendingUp, capability: 'sales:view', module: 'sales', feature: 'sales_invoices' },
  { to: '/inventory', label: 'Stock', icon: Warehouse, capability: 'inventory:view', module: 'inventory', feature: 'inventory_items' },
  { to: '/reports', label: 'Reports', icon: BarChart2, capability: 'reports:view', module: 'reports', feature: 'reports' },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

const DAYBOOK_TABS: (Tab | MoreTab)[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, exact: true, capability: 'dashboard:view', module: 'dashboard' },
  {
    to: '/finance/day-book',
    label: 'Day Book',
    icon: BookOpen,
    capability: 'finance:view',
    module: 'components',
    feature: 'day_book',
    requiresComponents: true,
  },
  {
    to: '/finance/receivables',
    label: 'In-Coming',
    icon: ArrowDownLeft,
    capability: 'finance:view',
    module: 'components',
    feature: 'receivables',
    requiresComponents: true,
  },
  {
    to: '/inventory/stock-valuation',
    label: 'Stock',
    icon: Warehouse,
    capability: 'inventory:view',
    module: 'components',
    feature: 'stock_valuation',
    requiresComponents: true,
  },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

interface MobileNavProps {
  onMorePress?: () => void;
}

export default function MobileNav({ onMorePress }: MobileNavProps) {
  const location = useLocation();
  const roles = useAuthStore((s) => s.roles);
  const componentsEnabled = useCompanyStore((s) => s.componentsEnabled);
  const multitenantEnabled = useTenantStore((s) => s.enabled);
  const isModuleEnabled = useTenantStore((s) => s.isModuleEnabled);
  const isNavFeatureVisible = useTenantStore((s) => s.isNavFeatureVisible);
  const getNavProfile = useTenantStore((s) => s.getNavProfile);

  const allTabs = getNavProfile() === 'components_daybook' ? DAYBOOK_TABS : STANDARD_TABS;

  const visibleTabs = allTabs.filter((t) => {
    if ('id' in t && t.id === 'more') return true;
    if (t.capability && !hasCapability(roles, t.capability)) return false;
    if ('requiresComponents' in t && t.requiresComponents && !componentsEnabled) return false;
    if ('feature' in t && t.feature && multitenantEnabled && !isNavFeatureVisible(t.feature)) return false;
    if ('module' in t && t.module && multitenantEnabled && !isModuleEnabled(t.module)) return false;
    return true;
  });

  const pinnedPaths = visibleTabs.filter((t): t is Tab => !t.id).map((t) => t.to);

  const isMoreActive = !pinnedPaths.some((p) =>
    p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 lg:hidden pb-safe" aria-label="Mobile navigation">
      <div className="flex items-center justify-around h-[var(--mobile-nav-height)]">
        {visibleTabs.map((tab) => {
          if (tab.id === 'more') {
            return (
              <button
                key="more"
                onClick={onMorePress}
                className={`mobile-nav-link ${isMoreActive ? 'active' : ''}`}
                aria-label="More"
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          }

          const active = tab.exact
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to);

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`mobile-nav-link ${active ? 'active' : ''}`}
              aria-label={tab.label}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

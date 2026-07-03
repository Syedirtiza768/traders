import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Warehouse,
  Users,
  Truck,
  DollarSign,
  BarChart2,
  Settings,
  TrendingUp,
  TrendingDown,
  Activity,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useCompanyStore } from '../stores/companyStore';
import { useTenantStore } from '../stores/tenantStore';
import { hasCapability, type AppCapability } from '../lib/permissions';
import { type TenantModuleKey } from '../lib/tenantModules';

interface NavChild {
  to: string;
  label: string;
  module?: TenantModuleKey;
  requiresComponents?: boolean;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  capability?: AppCapability;
  module?: TenantModuleKey;
  requiresComponents?: boolean;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true, capability: 'dashboard:view', module: 'dashboard' },
  {
    to: '/sales', label: 'Sales', icon: TrendingUp, capability: 'sales:view', module: 'sales',
    children: [
      { to: '/sales', label: 'Invoices', module: 'sales' },
      { to: '/sales/pos', label: 'POS Checkout', module: 'pos' },
      { to: '/sales/challans', label: 'Delivery Challans', module: 'sales' },
      { to: '/sales/orders', label: 'Sales Orders', module: 'sales' },
      { to: '/sales/quotations', label: 'Quotations', module: 'sales' },
    ],
  },
  {
    to: '/purchases', label: 'Purchases', icon: TrendingDown, capability: 'purchases:view', module: 'purchases',
    children: [
      { to: '/purchases', label: 'Invoices', module: 'purchases' },
      { to: '/purchases/orders', label: 'Purchase Orders', module: 'purchases' },
      { to: '/purchases/requisitions', label: 'Requisitions', module: 'purchases' },
      { to: '/purchases/rfqs', label: 'Supplier Quotations', module: 'purchases' },
    ],
  },
  {
    to: '/inventory', label: 'Inventory', icon: Warehouse, capability: 'inventory:view', module: 'inventory',
    children: [
      { to: '/inventory', label: 'Items & Stock', module: 'inventory' },
      { to: '/inventory/bundles', label: 'Bundles', module: 'inventory' },
      { to: '/inventory/warehouse', label: 'Warehouse Stock', module: 'inventory' },
      { to: '/inventory/movements', label: 'Stock Movements', module: 'inventory' },
      { to: '/inventory/catalog', label: 'SKU Catalog', module: 'components', requiresComponents: true },
      { to: '/inventory/opening-stock', label: 'Opening Stock', module: 'components', requiresComponents: true },
      { to: '/inventory/stock-valuation', label: 'Stock Valuation', module: 'components', requiresComponents: true },
      { to: '/inventory/stock-take', label: 'Stock Take', module: 'components', requiresComponents: true },
    ],
  },
  { to: '/customers', label: 'Customers', icon: Users, capability: 'customers:view', module: 'customers' },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, capability: 'suppliers:view', module: 'suppliers' },
  {
    to: '/finance', label: 'Finance', icon: DollarSign, capability: 'finance:view', module: 'finance',
    children: [
      { to: '/finance', label: 'Overview', module: 'finance' },
      { to: '/finance/payments', label: 'Payments', module: 'finance' },
      { to: '/finance/journals', label: 'Journal Entries', module: 'finance' },
      { to: '/finance/day-book', label: 'Day Book', module: 'components', requiresComponents: true },
      { to: '/finance/receivables', label: 'In-Coming (AR)', module: 'components', requiresComponents: true },
      { to: '/finance/payables', label: 'Out-Going (AP)', module: 'components', requiresComponents: true },
      { to: '/finance/day-close', label: 'Day Close', module: 'components', requiresComponents: true },
    ],
  },
  { to: '/operations', label: 'Operations', icon: Activity, capability: 'operations:view', module: 'operations' },
  { to: '/reports', label: 'Reports', icon: BarChart2, capability: 'reports:view', module: 'reports' },
];

const bottomItems: NavItem[] = [
  { to: '/settings', label: 'Settings', icon: Settings, capability: 'settings:view', module: 'settings' },
];

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const location = useLocation();
  const roles = useAuthStore((s) => s.roles);
  const componentsEnabled = useCompanyStore((s) => s.componentsEnabled);
  const multitenantEnabled = useTenantStore((s) => s.enabled);
  const isModuleEnabled = useTenantStore((s) => s.isModuleEnabled);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const isModuleVisible = (module?: TenantModuleKey) => {
    if (!module || !multitenantEnabled) return true;
    return isModuleEnabled(module);
  };

  const isChildVisible = (child: NavChild) => {
    if (child.requiresComponents && !componentsEnabled) return false;
    return isModuleVisible(child.module);
  };

  const isItemVisible = (item: NavItem) => {
    if (item.capability && roles.length > 0 && !hasCapability(roles, item.capability)) {
      return false;
    }
    if (item.requiresComponents && !componentsEnabled) return false;
    if (!isModuleVisible(item.module)) return false;
    if (item.children) {
      return item.children.some(isChildVisible);
    }
    return true;
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isParentActive = (item: NavItem) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname === item.to || location.pathname.startsWith(item.to + '/');
  };

  const isChildActive = (child: NavChild, parent: NavItem) => {
    // For exact parent path children (e.g., /sales -> Invoices), match exactly
    if (child.to === parent.to) {
      return location.pathname === child.to;
    }
    return location.pathname === child.to || location.pathname.startsWith(child.to + '/');
  };

  const isOpen = (item: NavItem) => expanded[item.to] ?? isParentActive(item);

  const renderItem = (item: NavItem) => {
    if (!isItemVisible(item)) {
      return null;
    }

    const active = isParentActive(item);

    if (item.children) {
      const visibleChildren = item.children.filter(isChildVisible);
      if (!visibleChildren.length) return null;
      const open = isOpen(item);
      return (
        <div key={item.to}>
          <button
            onClick={() => toggleExpand(item.to)}
            className={`sidebar-link w-full justify-between ${active ? 'active' : ''}`}
          >
            <span className="flex items-center gap-3">
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="ml-8 mt-0.5 space-y-0.5 border-l-2 border-gray-100 dark:border-slate-700 pl-3">
              {visibleChildren.map((child) => (
                <NavLink
                  key={child.to}
                  to={child.to}
                  end={child.to === item.to}
                  className={`block px-3 py-1.5 text-sm rounded-md transition-colors ${
                    isChildActive(child, item)
                      ? 'text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-slate-800 font-medium'
                      : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                  onClick={mobile ? onClose : undefined}
                >
                  {child.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.exact}
        className={`sidebar-link ${active ? 'active' : ''}`}
        onClick={mobile ? onClose : undefined}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <aside
      className={`${
        mobile
          ? 'h-full w-full bg-white dark:bg-slate-900 flex flex-col'
          : 'fixed left-0 top-16 bottom-0 w-[260px] bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 z-40 flex flex-col'
      }`}
    >
      {/* Mobile header with close button */}
      {mobile && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Menu</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Main Menu
        </p>
        {navItems.map(renderItem)}

        <div className="my-4 border-t border-gray-100 dark:border-slate-700" />

        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          System
        </p>
        {bottomItems.map(renderItem)}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 pb-safe">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>System Online</span>
        </div>
        <p className="text-[10px] text-gray-300 dark:text-slate-600 mt-1">Traders v1.0.0</p>
      </div>
    </aside>
  );
}

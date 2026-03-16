import { useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Warehouse,
  Users,
  Truck,
  DollarSign,
  BarChart2,
  Settings,
  TrendingUp,
  TrendingDown,
  FileText,
  ChevronDown,
  ChevronRight,
  Package,
  ArrowLeftRight,
  Receipt,
  ClipboardList,
  BookOpen,
  CreditCard,
  UserCheck,
  Clock,
  Cog,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { hasCapability, type AppCapability } from '../lib/permissions';

/* ------------------------------------------------------------------ */
/*  Navigation Structure Types                                         */
/* ------------------------------------------------------------------ */

interface NavChild {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface NavModule {
  key: string;
  label: string;
  icon: LucideIcon;
  capability: AppCapability;
  /** If `to` is set the module itself is a navigable link (leaf node) */
  to?: string;
  /** Exact match for active-state — only used for Dashboard "/" */
  exact?: boolean;
  /** Nested children shown when the module is expanded */
  children?: NavChild[];
}

/* ------------------------------------------------------------------ */
/*  Hierarchical Navigation Definition                                 */
/* ------------------------------------------------------------------ */

const navModules: NavModule[] = [
  /* ---- Dashboard ---- */
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    capability: 'dashboard:view',
    to: '/',
    exact: true,
  },

  /* ---- Sales ---- */
  {
    key: 'sales',
    label: 'Sales',
    icon: TrendingUp,
    capability: 'sales:view',
    children: [
      { to: '/sales', label: 'Sales Invoices', icon: Receipt },
      { to: '/sales/quotations', label: 'Quotations', icon: FileText },
      { to: '/sales/orders', label: 'Sales Orders', icon: ShoppingCart },
    ],
  },

  /* ---- Purchases ---- */
  {
    key: 'purchases',
    label: 'Purchases',
    icon: TrendingDown,
    capability: 'purchases:view',
    children: [
      { to: '/purchases', label: 'Purchase Invoices', icon: Receipt },
      { to: '/purchases/requisitions', label: 'Requisitions', icon: ClipboardList },
      { to: '/purchases/orders', label: 'Purchase Orders', icon: ShoppingCart },
      { to: '/purchases/rfqs', label: 'Supplier Quotations', icon: FileText },
    ],
  },

  /* ---- Inventory ---- */
  {
    key: 'inventory',
    label: 'Inventory',
    icon: Warehouse,
    capability: 'inventory:view',
    children: [
      { to: '/inventory', label: 'Items', icon: Package },
      { to: '/inventory/movements', label: 'Stock Movements', icon: ArrowLeftRight },
    ],
  },

  /* ---- Customers ---- */
  {
    key: 'customers',
    label: 'Customers',
    icon: Users,
    capability: 'customers:view',
    to: '/customers',
  },

  /* ---- Suppliers ---- */
  {
    key: 'suppliers',
    label: 'Suppliers',
    icon: Truck,
    capability: 'suppliers:view',
    to: '/suppliers',
  },

  /* ---- Finance ---- */
  {
    key: 'finance',
    label: 'Finance',
    icon: DollarSign,
    capability: 'finance:view',
    children: [
      { to: '/finance', label: 'Overview', icon: DollarSign },
      { to: '/finance/payments', label: 'Payment Entries', icon: CreditCard },
      { to: '/finance/journals', label: 'Journal Entries', icon: BookOpen },
      { to: '/finance/customer-outstanding', label: 'Customer Outstanding', icon: UserCheck },
      { to: '/finance/customer-aging', label: 'Customer Aging', icon: Clock },
    ],
  },

  /* ---- Operations ---- */
  {
    key: 'operations',
    label: 'Operations',
    icon: Cog,
    capability: 'operations:view',
    to: '/operations',
  },

  /* ---- Reports ---- */
  {
    key: 'reports',
    label: 'Reports',
    icon: BarChart2,
    capability: 'reports:view',
    to: '/reports',
  },
];

const systemModules: NavModule[] = [
  {
    key: 'settings',
    label: 'Settings',
    icon: Settings,
    capability: 'settings:view',
    to: '/settings',
  },
];

/* ------------------------------------------------------------------ */
/*  Helper: determine if any child of a module matches the location    */
/* ------------------------------------------------------------------ */

function isModuleActive(mod: NavModule, pathname: string): boolean {
  if (mod.exact) return pathname === mod.to;
  if (mod.to && !mod.children) return pathname.startsWith(mod.to);
  if (mod.children) {
    return mod.children.some((child) => {
      // Exact match for module root paths (e.g. /sales, /purchases, /inventory, /finance)
      if (child.to === '/sales' || child.to === '/purchases' || child.to === '/inventory' || child.to === '/finance') {
        return pathname === child.to;
      }
      return pathname.startsWith(child.to);
    });
  }
  return false;
}

function isChildActive(child: NavChild, pathname: string): boolean {
  // Exact match for module root paths so they don't match all sub-paths
  if (child.to === '/sales' || child.to === '/purchases' || child.to === '/inventory' || child.to === '/finance') {
    return pathname === child.to;
  }
  return pathname.startsWith(child.to);
}

/* ------------------------------------------------------------------ */
/*  Sidebar Component                                                  */
/* ------------------------------------------------------------------ */

export default function Sidebar() {
  const location = useLocation();
  const roles = useAuthStore((state) => state.roles);

  // Track which modules are expanded; auto-expand the active module
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navModules.forEach((mod) => {
      if (mod.children && isModuleActive(mod, location.pathname)) {
        initial[mod.key] = true;
      }
    });
    return initial;
  });

  const toggleModule = useCallback((key: string) => {
    setExpandedModules((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Auto-expand when navigating to a new module section
  const ensureExpanded = useCallback(
    (key: string) => {
      if (!expandedModules[key]) {
        setExpandedModules((prev) => ({ ...prev, [key]: true }));
      }
    },
    [expandedModules],
  );

  // Filter by capability
  const visibleNav = navModules.filter((m) => hasCapability(roles, m.capability));
  const visibleSystem = systemModules.filter((m) => hasCapability(roles, m.capability));

  // Ensure the active module is always expanded
  visibleNav.forEach((mod) => {
    if (mod.children && isModuleActive(mod, location.pathname) && !expandedModules[mod.key]) {
      ensureExpanded(mod.key);
    }
  });

  const renderModule = (mod: NavModule) => {
    const active = isModuleActive(mod, location.pathname);
    const expanded = expandedModules[mod.key] ?? false;

    /* Leaf node (no children) — plain link */
    if (!mod.children) {
      return (
        <NavLink
          key={mod.key}
          to={mod.to!}
          className={`sidebar-link ${active ? 'active' : ''}`}
        >
          <mod.icon className="w-5 h-5 flex-shrink-0" />
          <span>{mod.label}</span>
        </NavLink>
      );
    }

    /* Module with children — expandable section */
    const ChevronIcon = expanded ? ChevronDown : ChevronRight;

    return (
      <div key={mod.key}>
        <button
          type="button"
          onClick={() => toggleModule(mod.key)}
          className={`sidebar-link w-full justify-between ${active ? 'text-brand-700 font-semibold' : ''}`}
        >
          <span className="flex items-center gap-3">
            <mod.icon className="w-5 h-5 flex-shrink-0" />
            <span>{mod.label}</span>
          </span>
          <ChevronIcon className="w-4 h-4 text-gray-400" />
        </button>

        {expanded && (
          <div className="ml-4 pl-3 border-l border-gray-100 space-y-0.5 mt-0.5">
            {mod.children.map((child) => {
              const childActive = isChildActive(child, location.pathname);
              return (
                <NavLink
                  key={child.to}
                  to={child.to}
                  className={`sidebar-link text-[13px] py-2 ${childActive ? 'active' : ''}`}
                >
                  <child.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{child.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-[260px] bg-white border-r border-gray-200 z-40 flex flex-col">
      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Main Menu
        </p>
        {visibleNav.map(renderModule)}

        <div className="my-4 border-t border-gray-100" />

        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          System
        </p>
        {visibleSystem.map(renderModule)}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>System Online</span>
        </div>
        <p className="text-[10px] text-gray-300 mt-1">Traders v1.0.0</p>
      </div>
    </aside>
  );
}

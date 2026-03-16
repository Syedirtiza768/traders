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
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { hasCapability, type AppCapability } from '../lib/permissions';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true, capability: 'dashboard:view' },
  { to: '/sales', label: 'Sales', icon: TrendingUp, capability: 'sales:view' },
  { to: '/sales/quotations', label: 'Quotations', icon: FileText, capability: 'sales:view' },
  { to: '/sales/orders', label: 'Sales Orders', icon: ShoppingCart, capability: 'sales:view' },
  { to: '/purchases', label: 'Purchases', icon: TrendingDown, capability: 'purchases:view' },
  { to: '/purchases/orders', label: 'Purchase Orders', icon: ShoppingCart, capability: 'purchases:view' },
  { to: '/inventory', label: 'Inventory', icon: Warehouse, capability: 'inventory:view' },
  { to: '/customers', label: 'Customers', icon: Users, capability: 'customers:view' },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, capability: 'suppliers:view' },
  { to: '/finance', label: 'Finance', icon: DollarSign, capability: 'finance:view' },
  { to: '/reports', label: 'Reports', icon: BarChart2, capability: 'reports:view' },
  { to: '/operations', label: 'Operations', icon: ShoppingCart, capability: 'operations:view' },
];

const bottomItems = [
  { to: '/settings', label: 'Settings', icon: Settings, capability: 'settings:view' },
];

export default function Sidebar() {
  const location = useLocation();
  const roles = useAuthStore((state) => state.roles);
  const visibleNavItems = navItems.filter((item) => hasCapability(roles, item.capability as AppCapability));
  const visibleBottomItems = bottomItems.filter((item) => hasCapability(roles, item.capability as AppCapability));

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-[260px] bg-white border-r border-gray-200 z-40 flex flex-col">
      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Main Menu
        </p>
  {visibleNavItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <div className="my-4 border-t border-gray-100" />

        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          System
        </p>
  {visibleBottomItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
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

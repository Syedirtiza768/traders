import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  Truck,
  DollarSign,
  BarChart2,
  Settings,
  TrendingUp,
  TrendingDown,
  FileText,
  Activity,
  X,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/sales', label: 'Sales', icon: TrendingUp },
  { to: '/purchases', label: 'Purchases', icon: TrendingDown },
  { to: '/inventory', label: 'Inventory', icon: Warehouse },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/finance', label: 'Finance', icon: DollarSign },
  { to: '/operations', label: 'Operations', icon: Activity },
  { to: '/reports', label: 'Reports', icon: BarChart2 },
];

const bottomItems = [
  { to: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={`${
        mobile
          ? 'h-full w-full bg-white flex flex-col'
          : 'fixed left-0 top-16 bottom-0 w-[260px] bg-white border-r border-gray-200 z-40 flex flex-col'
      }`}
    >
      {/* Mobile header with close button */}
      {mobile && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-lg font-bold text-gray-900">Menu</span>
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
        {navItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              onClick={mobile ? onClose : undefined}
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
        {bottomItems.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              onClick={mobile ? onClose : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 pb-safe">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>System Online</span>
        </div>
        <p className="text-[10px] text-gray-300 mt-1">Traders v1.0.0</p>
      </div>
    </aside>
  );
}

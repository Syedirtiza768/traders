import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, LogOut, Bell, ChevronDown, User, Search, ArrowRight, FileText, ShoppingCart, Truck, Users, DollarSign, Warehouse } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { hasCapability } from '../lib/permissions';

type SearchTarget = {
  label: string;
  description: string;
  to: string;
  keywords: string[];
  icon: any;
  capability?: Parameters<typeof hasCapability>[1];
};

const SEARCH_TARGETS: SearchTarget[] = [
  { label: 'Sales invoices', description: 'Search customer invoices and balances', to: '/sales', keywords: ['sales', 'invoice', 'receivable'], icon: FileText, capability: 'sales:view' },
  { label: 'Sales orders', description: 'Open submitted and draft sales orders', to: '/sales/orders', keywords: ['sales', 'order', 'quotation'], icon: ShoppingCart, capability: 'sales:view' },
  { label: 'Purchase invoices', description: 'Search supplier invoices and payables', to: '/purchases', keywords: ['purchase', 'invoice', 'payable'], icon: FileText, capability: 'purchases:view' },
  { label: 'Purchase orders', description: 'Open purchase order workflow queues', to: '/purchases/orders', keywords: ['purchase', 'order', 'procurement'], icon: Truck, capability: 'purchases:view' },
  { label: 'Customers', description: 'Search customers and open payment actions', to: '/customers', keywords: ['customer', 'crm', 'party'], icon: Users, capability: 'customers:view' },
  { label: 'Suppliers', description: 'Search suppliers and open payment actions', to: '/suppliers', keywords: ['supplier', 'vendor', 'party'], icon: Truck, capability: 'suppliers:view' },
  { label: 'Finance', description: 'Payments, journals, receivables, payables', to: '/finance', keywords: ['finance', 'payment', 'journal', 'ledger'], icon: DollarSign, capability: 'finance:view' },
  { label: 'Inventory', description: 'Items, warehouses, and stock movement', to: '/inventory', keywords: ['inventory', 'stock', 'warehouse', 'item'], icon: Warehouse, capability: 'inventory:view' },
  { label: 'Reports', description: 'Sales, purchase, aging, and ledger reports', to: '/reports', keywords: ['reports', 'aging', 'ledger', 'profit'], icon: BarChart3, capability: 'reports:view' },
  { label: 'Operations', description: 'Workflow queues and approval hotspots', to: '/operations', keywords: ['operations', 'queues', 'approval'], icon: ShoppingCart, capability: 'operations:view' },
  { label: 'Settings', description: 'Application settings and role references', to: '/settings', keywords: ['settings', 'admin', 'roles'], icon: User, capability: 'settings:view' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, roles, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [search, setSearch] = useState('');

  const notifications = useMemo(() => {
    const items = [] as Array<{ id: string; title: string; description: string; to: string }>;
    if (hasCapability(roles, 'sales:approve')) {
      items.push({ id: 'sales-approval', title: 'Sales approvals ready', description: 'Review draft-to-submit and exception sales queues.', to: '/operations?module=Sales&approvalOnly=1' });
    }
    if (hasCapability(roles, 'purchases:approve')) {
      items.push({ id: 'purchase-approval', title: 'Purchase approvals ready', description: 'Review purchase approvals and invoice exceptions.', to: '/operations?module=Purchases&approvalOnly=1' });
    }
    if (hasCapability(roles, 'finance:view')) {
      items.push({ id: 'finance-followup', title: 'Finance follow-up', description: 'Outstanding receivables and payables need review.', to: '/finance' });
    }
    if (items.length === 0) {
      items.push({ id: 'all-clear', title: 'No urgent notifications', description: 'Your visible Trader queues are currently clear.', to: location.pathname || '/' });
    }
    return items;
  }, [location.pathname, roles]);

  const filteredTargets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return SEARCH_TARGETS
      .filter((target) => !target.capability || hasCapability(roles, target.capability))
      .filter((target) => {
        if (!term) return false;
        const haystack = `${target.label} ${target.description} ${target.keywords.join(' ')}`.toLowerCase();
        return haystack.includes(term);
      })
      .slice(0, 6);
  }, [roles, search]);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-6">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-brand-700 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-none">Traders</h1>
          <p className="text-[10px] text-gray-400">Business Management</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search modules, workflows, reports..."
            className="w-80 rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-brand-300 focus:bg-white"
          />
          {filteredTargets.length > 0 && (
            <div className="absolute right-0 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
              {filteredTargets.map((target) => {
                const Icon = target.icon;
                return (
                  <button
                    key={target.to}
                    onClick={() => {
                      navigate(target.to);
                      setSearch('');
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <div className="rounded-lg bg-brand-50 p-2 text-brand-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900">{target.label}</div>
                      <div className="truncate text-xs text-gray-500">{target.description}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative">
        <button
          onClick={() => setShowNotifications((value) => !value)}
          className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold leading-4 text-white">
            {notifications.length}
          </span>
        </button>
        {showNotifications && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
            <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">Notifications</p>
                <p className="text-xs text-gray-500">Workflow follow-ups based on your current role access.</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setShowNotifications(false);
                      navigate(item.to);
                    }}
                    className="w-full border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900">{item.title}</div>
                    <div className="mt-1 text-xs text-gray-500">{item.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[120px] truncate">
              {user || 'User'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{user}</p>
                  <p className="text-xs text-gray-500">Logged in</p>
                </div>
                <button
                  onClick={() => { setShowMenu(false); logout(); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

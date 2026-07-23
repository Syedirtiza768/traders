import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Building2, LayoutDashboard, LogOut, Plus } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const navItems = [
  { to: '/super-admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/super-admin/tenants', label: 'Businesses', icon: Building2 },
];

export default function SuperAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <a
        href="#super-admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to content
      </a>
      <aside className="w-64 bg-slate-900 text-white flex flex-col" aria-label="Super admin navigation">
        <div className="p-6 border-b border-slate-800">
          <p className="text-xs uppercase tracking-wider text-slate-400">Platform</p>
          <h1 className="text-xl font-bold mt-1">Super Admin</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => {
            const active = end ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[44px] items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-400 truncate mb-3">{user}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-[44px] items-center gap-2 text-sm text-slate-300 hover:text-white"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Multi-Tenant Administration</h2>
            <p className="text-sm text-slate-500">Manage businesses, modules, and access</p>
          </div>
          <Link
            to="/super-admin/tenants/new"
            className="inline-flex min-h-[44px] items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Business
          </Link>
        </header>

        <main id="super-admin-main" className="flex-1 p-6 overflow-auto" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

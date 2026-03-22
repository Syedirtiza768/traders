import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Warehouse,
  BarChart2,
  MoreHorizontal,
} from 'lucide-react';

const tabs = [
  { to: '/', label: 'Home', icon: LayoutDashboard, exact: true },
  { to: '/sales', label: 'Sales', icon: TrendingUp },
  { to: '/inventory', label: 'Stock', icon: Warehouse },
  { to: '/reports', label: 'Reports', icon: BarChart2 },
  { to: '/more', label: 'More', icon: MoreHorizontal },
];

export default function MobileNav() {
  const location = useLocation();

  // "More" matches any route not covered by the first 4 tabs
  const isMoreActive =
    !['/', '/sales', '/inventory', '/reports'].some((p) =>
      p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
    );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 lg:hidden pb-safe" aria-label="Mobile navigation">
      <div className="flex items-center justify-around h-[var(--mobile-nav-height)]">
        {tabs.map((tab) => {
          const active =
            tab.to === '/more'
              ? isMoreActive
              : tab.exact
                ? location.pathname === tab.to
                : location.pathname.startsWith(tab.to);

          // "More" goes to purchases as the first non-primary tab
          const href = tab.to === '/more' ? '/purchases' : tab.to;

          return (
            <NavLink
              key={tab.to}
              to={href}
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

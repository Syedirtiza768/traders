import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on Escape key
  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [sidebarOpen]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const toggleSidebar = useCallback(() => setSidebarOpen(p => !p), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-[var(--vh-full,100vh)] bg-[var(--surface-page)] dark:bg-slate-950">
      {/* Skip-to-content for keyboard users */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Navbar onMenuToggle={toggleSidebar} />

      {/* Desktop sidebar — always visible at lg+ */}
      <nav className="hidden lg:block no-print" aria-label="Main navigation">
        <Sidebar />
      </nav>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="overlay-backdrop lg:hidden no-print" onClick={closeSidebar} aria-hidden="true" />
          <nav
            className="fixed inset-y-0 left-0 z-[var(--z-modal)] w-[min(280px,88vw)] lg:hidden slide-in-left no-print"
            aria-label="Mobile navigation"
            aria-modal="true"
            role="dialog"
          >
            <Sidebar mobile onClose={closeSidebar} />
          </nav>
        </>
      )}

      {/* Main content area */}
      <main
        id="main-content"
        className="lg:ml-[var(--sidebar-width)] mt-[var(--navbar-height)] pb-[calc(var(--mobile-nav-height)+var(--safe-bottom,0px)+0.5rem)] lg:pb-6 page-container dark:bg-slate-950"
        tabIndex={-1}
      >
        <Suspense
          fallback={
            <div className="flex h-64 flex-col items-center justify-center gap-3" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true" />
              <span className="sr-only">Loading page…</span>
              <p className="text-sm text-gray-500 dark:text-slate-400" aria-hidden="true">Loading…</p>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      {/* Mobile bottom navigation — visible below lg */}
      <div className="no-print" data-mobile-nav>
        <MobileNav onMorePress={toggleSidebar} />
      </div>
    </div>
  );
}

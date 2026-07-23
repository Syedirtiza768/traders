import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, AlertTriangle, Sparkles } from 'lucide-react';
import { superAdminApi } from '../../lib/api';
import { PageHeader, AlertBanner, LoadingBlock } from '../../components/ui';

type DashboardStats = {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  trial_tenants: number;
  total_business_users: number;
};

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    superAdminApi
      .getDashboard()
      .then((res) => setStats(res.data.message))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'));
  }, []);

  if (error) {
    return <AlertBanner tone="error">{error}</AlertBanner>;
  }

  if (!stats) {
    return <LoadingBlock label="Loading dashboard…" />;
  }

  const cards = [
    { label: 'Total Businesses', value: stats?.total_tenants ?? '—', icon: Building2, color: 'text-brand-600' },
    { label: 'Active', value: stats?.active_tenants ?? '—', icon: Sparkles, color: 'text-emerald-600' },
    { label: 'Suspended', value: stats?.suspended_tenants ?? '—', icon: AlertTriangle, color: 'text-amber-600' },
    { label: 'Business Users', value: stats?.total_business_users ?? '—', icon: Users, color: 'text-violet-600' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform dashboard"
        description="Overview of tenant businesses and business users."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
              </div>
              <Icon className={`w-8 h-8 ${color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Quick actions</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          Provision a new business or review existing tenants.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/super-admin/tenants/new"
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            Create business
          </Link>
          <Link
            to="/super-admin/tenants"
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            View all businesses
          </Link>
        </div>
      </div>
    </div>
  );
}

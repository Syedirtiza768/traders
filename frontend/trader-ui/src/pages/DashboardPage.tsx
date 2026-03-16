import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Wallet,
  Package,
  AlertTriangle,
  Users,
  ShoppingCart,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import KPICard from '../components/KPICard';
import { dashboardApi } from '../lib/api';
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils';

interface DashboardKPIs {
  todays_sales: number;
  monthly_revenue: number;
  outstanding_receivables: number;
  outstanding_payables: number;
  stock_value: number;
  low_stock_items: number;
  total_customers: number;
  total_orders_today: number;
  quotations_awaiting_conversion: number;
  sales_orders_awaiting_invoice?: number;
  purchase_orders_awaiting_invoice?: number;
  sales_orders_with_unpaid_invoices: number;
  purchase_orders_with_unpaid_invoices: number;
  currency: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [kpiRes, trendRes, customersRes, ordersRes] = await Promise.all([
        dashboardApi.getKPIs(),
        dashboardApi.getSalesTrend(),
        dashboardApi.getTopCustomers(8),
        dashboardApi.getRecentOrders(10),
      ]);

      setKpis(kpiRes.data.message);
      setSalesTrend(trendRes.data.message || []);
      setTopCustomers(customersRes.data.message || []);
      setRecentOrders(ordersRes.data.message || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#65a30d'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back — here's your business at a glance.</p>
      </div>

      {/* KPI Cards */}
      <div className="flex justify-end">
        <button onClick={() => navigate('/operations')} className="btn-secondary">Open Operations Queues</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Today's Sales"
          value={kpis?.todays_sales || 0}
          icon={DollarSign}
          format="currency"
          color="green"
          loading={loading}
        />
        <KPICard
          title="Monthly Revenue"
          value={kpis?.monthly_revenue || 0}
          icon={TrendingUp}
          format="currency"
          color="blue"
          loading={loading}
        />
        <KPICard
          title="Outstanding Receivables"
          value={kpis?.outstanding_receivables || 0}
          icon={CreditCard}
          format="currency"
          color="yellow"
          loading={loading}
        />
        <KPICard
          title="Outstanding Payables"
          value={kpis?.outstanding_payables || 0}
          icon={Wallet}
          format="currency"
          color="red"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Stock Value"
          value={kpis?.stock_value || 0}
          icon={Package}
          format="currency"
          color="purple"
          loading={loading}
        />
        <KPICard
          title="Low Stock Items"
          value={kpis?.low_stock_items || 0}
          icon={AlertTriangle}
          format="number"
          color="yellow"
          loading={loading}
        />
        <KPICard
          title="Total Customers"
          value={kpis?.total_customers || 0}
          icon={Users}
          format="number"
          color="blue"
          loading={loading}
        />
        <KPICard
          title="Today's Orders"
          value={kpis?.total_orders_today || 0}
          icon={ShoppingCart}
          format="number"
          color="green"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Quotations Awaiting Conversion"
          value={kpis?.quotations_awaiting_conversion || 0}
          icon={FileText}
          format="number"
          color="yellow"
          loading={loading}
          onClick={() => navigate('/sales/quotations?workflow=awaiting-conversion')}
        />
        <KPICard
          title="Sales Orders Awaiting Invoice"
          value={kpis?.sales_orders_awaiting_invoice || 0}
          icon={ShoppingCart}
          format="number"
          color="blue"
          loading={loading}
          onClick={() => navigate('/sales/orders?workflow=awaiting-invoice')}
        />
        <KPICard
          title="Sales Orders With Unpaid Invoices"
          value={kpis?.sales_orders_with_unpaid_invoices || 0}
          icon={CreditCard}
          format="number"
          color="red"
          loading={loading}
          onClick={() => navigate('/sales/orders?workflow=unpaid-invoices')}
        />
        <KPICard
          title="Purchase Orders Awaiting Invoice"
          value={kpis?.purchase_orders_awaiting_invoice || 0}
          icon={Wallet}
          format="number"
          color="yellow"
          loading={loading}
          onClick={() => navigate('/purchases/orders?workflow=awaiting-invoice')}
        />
        <KPICard
          title="Purchase Orders With Unpaid Invoices"
          value={kpis?.purchase_orders_with_unpaid_invoices || 0}
          icon={Wallet}
          format="number"
          color="red"
          loading={loading}
          onClick={() => navigate('/purchases/orders?workflow=unpaid-invoices')}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
            <p className="text-sm text-gray-500">Monthly revenue for the last 12 months</p>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Customers */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
            <p className="text-sm text-gray-500">By revenue this fiscal year</p>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topCustomers.slice(0, 6)}
                  dataKey="total_revenue"
                  nameKey="customer_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${(name || '').slice(0, 15)} (${(percent * 100).toFixed(0)}%)`}
                >
                  {topCustomers.slice(0, 6).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
            <p className="text-sm text-gray-500">Latest sales orders</p>
          </div>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Order</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <tr key={order.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-brand-700">{order.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{order.customer_name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatDate(order.transaction_date)}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(order.grand_total)}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No recent orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

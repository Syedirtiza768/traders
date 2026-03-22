import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { reportsApi } from '../lib/api';
import { formatCurrency, formatCompact, formatDate, getStatusColor } from '../lib/utils';

const TABS = ['Sales Report', 'Purchase Report', 'Top Items', 'Receivable Aging', 'Payable Aging'];
const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('Sales Report');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadReport(activeTab).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [activeTab]);

  const loadReport = async (tab: string) => {
    switch (tab) {
      case 'Sales Report': {
        const res = await reportsApi.getSalesReport();
        return res.data.message;
      }
      case 'Purchase Report': {
        const res = await reportsApi.getPurchaseReport();
        return res.data.message;
      }
      case 'Top Items': {
        const res = await reportsApi.getItemSalesReport({ page_size: 20 });
        return res.data.message;
      }
      case 'Receivable Aging': {
        const [summaryRes, detailRes] = await Promise.all([
          reportsApi.getReceivableAgingSummary(),
          reportsApi.getReceivableAgingDetail({ page_size: 20 }),
        ]);
        return { summary: summaryRes.data.message, detail: detailRes.data.message };
      }
      case 'Payable Aging': {
        const res = await reportsApi.getAccountsPayable();
        return res.data.message;
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div><h1 className="page-title">Reports</h1></div>
        <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="text-gray-500 mt-1">Business intelligence and analytics</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t ? 'bg-white shadow text-brand-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Sales Report */}
      {activeTab === 'Sales Report' && data && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-xs text-gray-500">Total Invoices</p>
              <p className="text-xl font-bold">{data.totals?.invoice_count?.toLocaleString() ?? 0}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(data.totals?.grand_total)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-gray-500">Outstanding</p>
              <p className="text-xl font-bold text-red-700">{formatCurrency(data.totals?.outstanding)}</p>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Sales</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCompact(v)} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="grand_total" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outstanding" name="Outstanding" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Purchase Report */}
      {activeTab === 'Purchase Report' && data && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-xs text-gray-500">Total Invoices</p>
              <p className="text-xl font-bold">{data.totals?.invoice_count?.toLocaleString() ?? 0}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-gray-500">Total Purchases</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(data.totals?.grand_total)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-gray-500">Outstanding</p>
              <p className="text-xl font-bold text-red-700">{formatCurrency(data.totals?.outstanding)}</p>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Purchases</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatCompact(v)} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="grand_total" name="Purchases" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outstanding" name="Payable" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Items */}
      {activeTab === 'Top Items' && data && (
        <div className="space-y-4 sm:space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Top Selling Items</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={(data.data || []).slice(0, 15)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatCompact(v)} />
                <YAxis type="category" dataKey="item_name" tick={{ fontSize: 10 }} width={150} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="total_amount" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Group</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Qty Sold</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Invoices</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data.data || []).map((item: any) => (
                  <tr key={item.item_code} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-brand-700">{item.item_name}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{item.item_group}</td>
                    <td className="px-6 py-3 text-sm text-right">{item.total_qty?.toLocaleString()}</td>
                    <td className="px-6 py-3 text-sm text-right font-medium">{formatCurrency(item.total_amount)}</td>
                    <td className="px-6 py-3 text-sm text-right text-gray-500">{item.invoice_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receivable Aging */}
      {activeTab === 'Receivable Aging' && data && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['0-30', '31-60', '61-90', '90+'].map((bucket) => (
              <div key={bucket} className="card p-5">
                <p className="text-xs text-gray-500">{bucket} Days</p>
                <p className="text-lg font-bold">{formatCurrency(data.summary?.[bucket])}</p>
              </div>
            ))}
            <div className="card p-5 bg-red-50">
              <p className="text-xs text-gray-500">Total Outstanding</p>
              <p className="text-lg font-bold text-red-700">{formatCurrency(data.summary?.total_outstanding)}</p>
            </div>
          </div>
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">0–30</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">31–60</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">61–90</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">90+</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data.detail?.data || []).map((row: any) => (
                  <tr key={row.customer} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-brand-700">{row.customer_name || row.customer}</td>
                    <td className="px-6 py-3 text-sm text-right">{formatCurrency(row['0-30'])}</td>
                    <td className="px-6 py-3 text-sm text-right">{formatCurrency(row['31-60'])}</td>
                    <td className="px-6 py-3 text-sm text-right">{formatCurrency(row['61-90'])}</td>
                    <td className="px-6 py-3 text-sm text-right">{formatCurrency(row['90+'])}</td>
                    <td className="px-6 py-3 text-sm text-right font-bold text-red-700">{formatCurrency(row.total_outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payable Aging */}
      {activeTab === 'Payable Aging' && data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['0-30', '31-60', '61-90', '90+'].map((bucket) => (
            <div key={bucket} className="card p-5">
              <p className="text-xs text-gray-500">{bucket} Days</p>
              <p className="text-lg font-bold">{formatCurrency(data[bucket])}</p>
            </div>
          ))}
          <div className="card p-5 bg-orange-50">
            <p className="text-xs text-gray-500">Total Payable</p>
            <p className="text-lg font-bold text-orange-700">{formatCurrency(data.total_outstanding)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

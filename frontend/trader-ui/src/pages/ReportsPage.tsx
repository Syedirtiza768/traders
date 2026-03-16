import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { reportsApi } from '../lib/api';
import { appendPreservedListQuery, downloadTextFile, formatCurrency, formatCompact, toCsv } from '../lib/utils';

const TABS = ['Sales Report', 'Purchase Report', 'Top Items', 'Receivable Aging', 'Payable Aging'];
const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

export default function ReportsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const activeTab = TABS.includes(searchParams.get('tab') || '') ? (searchParams.get('tab') as string) : 'Sales Report';
  const receivableSearch = searchParams.get('receivableSearch') || '';
  const payableSearch = searchParams.get('payableSearch') || '';

  useEffect(() => {
    setLoading(true);
    loadReport(activeTab).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [activeTab]);

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    setSearchParams(nextParams);
  };

  const filteredPayableDetail = useMemo(() => {
    if (activeTab !== 'Payable Aging') return data?.detail || [];
    const rows = Array.isArray(data?.detail) ? data.detail : [];
    if (!payableSearch) return rows;

    const normalized = payableSearch.toLowerCase();
    return rows.filter((row: any) =>
      [row.supplier, row.supplier_name].some((value) => String(value || '').toLowerCase().includes(normalized)),
    );
  }, [activeTab, data, payableSearch]);

  const filteredReceivableDetail = useMemo(() => {
    if (activeTab !== 'Receivable Aging') return data?.detail?.data || [];
    const rows = Array.isArray(data?.detail?.data) ? data.detail.data : [];
    if (!receivableSearch) return rows;

    const normalized = receivableSearch.toLowerCase();
    return rows.filter((row: any) =>
      [row.customer, row.customer_name].some((value) => String(value || '').toLowerCase().includes(normalized)),
    );
  }, [activeTab, data, receivableSearch]);

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
        const [summaryRes, detailRes] = await Promise.all([
          reportsApi.getAccountsPayable(),
          reportsApi.getSupplierLedger('', { page_size: 1 }).catch(() => null),
        ]);
        return { ...(summaryRes.data.message || {}), detail: detailRes?.data?.message?.data || [] };
      }
    }
  };

  const getExportRows = () => {
    switch (activeTab) {
      case 'Sales Report':
      case 'Purchase Report':
        return (data?.data || []).map((row: any) => ({
          month: row.month,
          grand_total: row.grand_total,
          outstanding: row.outstanding,
          invoice_count: row.invoice_count,
        }));
      case 'Top Items':
        return (data?.data || []).map((row: any) => ({
          item_code: row.item_code,
          item_name: row.item_name,
          item_group: row.item_group,
          total_qty: row.total_qty,
          total_amount: row.total_amount,
          invoice_count: row.invoice_count,
        }));
      case 'Receivable Aging':
        return (data?.detail?.data || []).map((row: any) => ({
          customer: row.customer,
          customer_name: row.customer_name,
          bucket_0_30: row['0-30'],
          bucket_31_60: row['31-60'],
          bucket_61_90: row['61-90'],
          bucket_90_plus: row['90+'],
          total_outstanding: row.total_outstanding,
        }));
      case 'Payable Aging':
        return (data?.detail || []).map((row: any) => ({
          supplier: row.supplier,
          supplier_name: row.supplier_name,
          bucket_0_30: row['0-30'],
          bucket_31_60: row['31-60'],
          bucket_61_90: row['61-90'],
          bucket_90_plus: row['90+'],
          total_outstanding: row.total_outstanding,
        }));
      default:
        return [];
    }
  };

  const handleExport = () => {
    setExporting(true);
    try {
      const rows = getExportRows();
      const csv = toCsv(rows);
      const fileName = activeTab.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      downloadTextFile(`${fileName || 'report'}.csv`, csv, 'text/csv;charset=utf-8');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Reports</h1></div>
        <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Business intelligence and analytics</p>
        </div>
        <button onClick={handleExport} disabled={exporting || loading} className="btn-secondary flex items-center gap-2 disabled:opacity-60">
          <Download size={14} /> {exporting ? 'Preparing…' : 'Export CSV'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setSearchParams((currentParams) => {
              const nextParams = new URLSearchParams(currentParams);
              nextParams.set('tab', t);
              return nextParams;
            })}
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
        <div className="space-y-6">
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
        <div className="space-y-6">
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
        <div className="space-y-6">
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
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-72">
              <input
                type="text"
                value={receivableSearch}
                onChange={(e) => updateSearchParams({ receivableSearch: e.target.value || null })}
                placeholder="Search customers..."
                className="input-field"
              />
            </div>
            <button
              onClick={() => navigate('/sales/orders?workflow=awaiting-invoice')}
              className="btn-secondary"
            >
              Review Orders Awaiting Invoice
            </button>
          </div>
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
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReceivableDetail.map((row: any) => {
                  const receivableList = new URLSearchParams();
                  if (receivableSearch) {
                    receivableList.set('receivableSearch', receivableSearch);
                  }
                  const receivableListSearch = receivableList.toString();

                  return (
                  <tr key={row.customer} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-brand-700">
                      <button
                        onClick={() => navigate(appendPreservedListQuery(`/customers/${encodeURIComponent(row.customer)}`, receivableListSearch))}
                        className="hover:text-brand-800 hover:underline"
                      >
                        {row.customer_name || row.customer}
                      </button>
                    </td>
                    <td className="px-6 py-3 text-sm text-right">{formatCurrency(row['0-30'])}</td>
                    <td className="px-6 py-3 text-sm text-right">{formatCurrency(row['31-60'])}</td>
                    <td className="px-6 py-3 text-sm text-right">{formatCurrency(row['61-90'])}</td>
                    <td className="px-6 py-3 text-sm text-right">{formatCurrency(row['90+'])}</td>
                    <td className="px-6 py-3 text-sm text-right font-bold text-red-700">{formatCurrency(row.total_outstanding)}</td>
                    <td className="px-6 py-3 text-right">
                      {(row.total_outstanding || 0) > 0 ? (
                        <button
                          onClick={() => navigate(appendPreservedListQuery(`/finance/payments/new?paymentType=Receive&partyType=Customer&party=${encodeURIComponent(row.customer)}&amount=${encodeURIComponent(String(row.total_outstanding || 0))}`, receivableListSearch))}
                          className="btn-secondary text-xs"
                        >
                          Collect Payment
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">No balance</span>
                      )}
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payable Aging */}
      {activeTab === 'Payable Aging' && data && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-72">
              <input
                type="text"
                value={payableSearch}
                onChange={(e) => updateSearchParams({ payableSearch: e.target.value || null })}
                placeholder="Search suppliers..."
                className="input-field"
              />
            </div>
            <button
              onClick={() => navigate('/purchases/orders?workflow=awaiting-invoice')}
              className="btn-secondary"
            >
              Review Purchase Orders Awaiting Invoice
            </button>
          </div>
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

          {filteredPayableDetail.length > 0 && (
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">0–30</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">31–60</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">61–90</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">90+</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayableDetail.map((row: any) => (
                    <tr key={row.supplier || row.supplier_name} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium text-brand-700">
                        <button
                          onClick={() => navigate(appendPreservedListQuery(`/suppliers/${encodeURIComponent(row.supplier)}`, payableSearch ? `payableSearch=${payableSearch}` : ''))}
                          className="hover:text-brand-800 hover:underline"
                        >
                          {row.supplier_name || row.supplier}
                        </button>
                      </td>
                      <td className="px-6 py-3 text-sm text-right">{formatCurrency(row['0-30'])}</td>
                      <td className="px-6 py-3 text-sm text-right">{formatCurrency(row['31-60'])}</td>
                      <td className="px-6 py-3 text-sm text-right">{formatCurrency(row['61-90'])}</td>
                      <td className="px-6 py-3 text-sm text-right">{formatCurrency(row['90+'])}</td>
                      <td className="px-6 py-3 text-sm text-right font-bold text-orange-700">{formatCurrency(row.total_outstanding)}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => navigate(appendPreservedListQuery(`/suppliers/${encodeURIComponent(row.supplier)}`, payableSearch ? `payableSearch=${payableSearch}` : ''))}
                            className="btn-secondary text-xs"
                          >
                            View Supplier
                          </button>
                          <button
                            onClick={() => navigate(appendPreservedListQuery(`/finance/payments/new?paymentType=Pay&partyType=Supplier&party=${encodeURIComponent(row.supplier)}&amount=${encodeURIComponent(String(row.total_outstanding || 0))}`, payableSearch ? `payableSearch=${payableSearch}` : ''))}
                            className="btn-secondary text-xs"
                          >
                            Pay Supplier
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(data.detail) && data.detail.length > 0 && filteredPayableDetail.length === 0 && (
            <div className="card p-8 text-center text-gray-400">No suppliers match the current payable search.</div>
          )}
        </div>
      )}
    </div>
  );
}

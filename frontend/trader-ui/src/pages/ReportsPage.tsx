import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Users, Truck, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { reportsApi } from '../lib/api';
import { formatCurrency, formatCompact, formatDate } from '../lib/utils';

type ReportType = 'receivable' | 'payable' | 'monthly-sales' | 'supplier-balances';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('receivable');
  const [data, setData] = useState<any[]>([]);
  const [monthlySales, setMonthlySales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadReport(); }, [activeReport]);

  const loadReport = async () => {
    setLoading(true);
    try {
      switch (activeReport) {
        case 'receivable': {
          const res = await reportsApi.getAccountsReceivable(50);
          setData(res.data.message || []);
          break;
        }
        case 'payable': {
          const res = await reportsApi.getAccountsPayable(50);
          setData(res.data.message || []);
          break;
        }
        case 'monthly-sales': {
          const res = await reportsApi.getMonthlySalesReport();
          setMonthlySales(res.data.message || []);
          break;
        }
        case 'supplier-balances': {
          const res = await reportsApi.getSupplierBalances(50);
          setData(res.data.message || []);
          break;
        }
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  const reports = [
    { key: 'receivable' as ReportType, label: 'Accounts Receivable', icon: Users, color: 'text-blue-600 bg-blue-50' },
    { key: 'payable' as ReportType, label: 'Accounts Payable', icon: Truck, color: 'text-orange-600 bg-orange-50' },
    { key: 'monthly-sales' as ReportType, label: 'Monthly Sales', icon: Calendar, color: 'text-green-600 bg-green-50' },
    { key: 'supplier-balances' as ReportType, label: 'Supplier Balances', icon: DollarSign, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Financial and business intelligence reports</p>
        </div>
        <button className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Report Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {reports.map((r) => (
          <button
            key={r.key}
            onClick={() => setActiveReport(r.key)}
            className={`card p-4 text-left transition-all ${activeReport === r.key ? 'ring-2 ring-brand-500 bg-brand-50' : 'hover:shadow-md'}`}
          >
            <div className={`inline-flex p-2 rounded-lg ${r.color} mb-2`}>
              <r.icon className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-gray-900">{r.label}</p>
          </button>
        ))}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="spinner" /></div>
      ) : activeReport === 'monthly-sales' ? (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Sales Report</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={monthlySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v: number) => formatCompact(v)} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="total" name="Sales" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="count" name="Invoices" fill="#6366f1" radius={[4, 4, 0, 0]} yAxisId={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {activeReport === 'receivable' && (
                    <>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Outstanding</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Age</th>
                    </>
                  )}
                  {activeReport === 'payable' && (
                    <>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Outstanding</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Age</th>
                    </>
                  )}
                  {activeReport === 'supplier-balances' && (
                    <>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total Invoiced</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Paid</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Balance</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    {(activeReport === 'receivable' || activeReport === 'payable') && (
                      <>
                        <td className="px-6 py-3 text-sm text-gray-900">{row.party || row.customer || row.supplier}</td>
                        <td className="px-6 py-3 text-sm text-brand-700 font-medium">{row.voucher_no || row.name}</td>
                        <td className="px-6 py-3 text-sm text-gray-500">{formatDate(row.due_date)}</td>
                        <td className="px-6 py-3 text-sm text-right font-medium text-red-600">{formatCurrency(row.outstanding_amount)}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            (row.age || 0) > 90 ? 'bg-red-100 text-red-700' :
                            (row.age || 0) > 60 ? 'bg-orange-100 text-orange-700' :
                            (row.age || 0) > 30 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>{row.age || 0} days</span>
                        </td>
                      </>
                    )}
                    {activeReport === 'supplier-balances' && (
                      <>
                        <td className="px-6 py-3 text-sm text-gray-900">{row.supplier || row.party}</td>
                        <td className="px-6 py-3 text-sm text-right">{formatCurrency(row.total_invoiced || row.invoiced_amount)}</td>
                        <td className="px-6 py-3 text-sm text-right text-green-600">{formatCurrency(row.paid_amount || row.total_paid)}</td>
                        <td className="px-6 py-3 text-sm text-right font-medium text-orange-600">{formatCurrency(row.outstanding_amount || row.balance)}</td>
                      </>
                    )}
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

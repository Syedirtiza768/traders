import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { reportsApi, dashboardApi } from '../lib/api';
import { formatCurrency, formatCompact } from '../lib/utils';

const COLORS = ['#16a34a', '#dc2626', '#f59e0b', '#6366f1', '#06b6d4', '#ec4899', '#8b5cf6', '#84cc16'];

export default function FinancePage() {
  const [pnl, setPnl] = useState<any>(null);
  const [cashFlow, setCashFlow] = useState<any>(null);
  const [receivable, setReceivable] = useState<any>(null);
  const [payable, setPayable] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pnlRes, cashRes, recRes, payRes] = await Promise.all([
        reportsApi.getProfitAndLoss(),
        dashboardApi.getCashFlowSummary(),
        reportsApi.getReceivableAgingSummary(),
        reportsApi.getAccountsPayable(),
      ]);
      setPnl(pnlRes.data.message);
      setCashFlow(cashRes.data.message);
      setReceivable(recRes.data.message);
      setPayable(payRes.data.message);
    } catch (err) {
      console.error('Failed to load financial data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  const receivableTotal = receivable?.total_outstanding || 0;
  const payableTotal = payable?.total_outstanding || 0;
  const netIncome = pnl?.net_profit || 0;
  const revenue = pnl?.total_income || 0;

  const agingData = [
    { name: '0-30', receivable: receivable?.['0-30'] || 0, payable: payable?.['0-30'] || 0 },
    { name: '31-60', receivable: receivable?.['31-60'] || 0, payable: payable?.['31-60'] || 0 },
    { name: '61-90', receivable: receivable?.['61-90'] || 0, payable: payable?.['61-90'] || 0 },
    { name: '90+', receivable: receivable?.['90+'] || 0, payable: payable?.['90+'] || 0 },
  ];

  const cashFlowData = cashFlow?.monthly || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
        <p className="text-gray-500 mt-1">Financial overview and key metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><DollarSign className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-lg font-bold text-gray-900">{formatCompact(revenue)}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${netIncome >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              {netIncome >= 0 ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
            </div>
            <div>
              <p className="text-xs text-gray-500">Net Income</p>
              <p className={`text-lg font-bold ${netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCompact(netIncome)}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><CreditCard className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Receivables</p>
              <p className="text-lg font-bold text-blue-700">{formatCompact(receivableTotal)}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg"><CreditCard className="w-5 h-5 text-orange-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Payables</p>
              <p className="text-lg font-bold text-orange-700">{formatCompact(payableTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Cash Flow</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v: number) => formatCompact(v)} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="inflow" name="Inflow" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outflow" name="Outflow" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Aging Analysis */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Aging Analysis</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v: number) => formatCompact(v)} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="receivable" name="Receivable" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="payable" name="Payable" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* P&L Summary */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profit & Loss Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Income', value: pnl?.total_income, color: 'text-green-700' },
            { label: 'Cost of Goods', value: pnl?.cost_of_goods_sold, color: 'text-red-700' },
            { label: 'Gross Profit', value: pnl?.gross_profit, color: 'text-blue-700' },
            { label: 'Expenses', value: pnl?.total_expense, color: 'text-orange-700' },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className={`text-lg font-bold ${item.color}`}>{formatCurrency(item.value || 0)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Mail, ShieldAlert } from 'lucide-react';
import { reportsApi } from '../lib/api';
import { appendPreservedListQuery, formatCurrency } from '../lib/utils';

export default function CustomerOutstandingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [summary, setSummary] = useState<any>(null);
  const [detail, setDetail] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const search = searchParams.get('search') || '';
  const source = searchParams.get('source') || '';
  const backToPath = source === 'finance' ? '/finance' : '/finance';
  const buildListQuery = () => {
    const nextParams = new URLSearchParams();
    if (search) nextParams.set('search', search);
    if (source) nextParams.set('source', source);
    return nextParams.toString();
  };

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, detailRes] = await Promise.all([
          reportsApi.getReceivableAgingSummary(),
          reportsApi.getReceivableAgingDetail({ page_size: 100 }),
        ]);
        setSummary(summaryRes.data.message);
        setDetail(detailRes.data.message?.data || []);
      } catch (err) {
        console.error('Failed to load customer outstanding:', err);
        setError('Could not load customer outstanding right now.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredDetail = useMemo(() => {
    if (!search) return detail;
    const normalized = search.toLowerCase();
    return detail.filter((row) =>
      [row.customer, row.customer_name].some((value) => String(value || '').toLowerCase().includes(normalized)),
    );
  }, [detail, search]);

  const topRisk = useMemo(() => {
    if (!filteredDetail.length) return null;
    return [...filteredDetail].sort((a, b) => Number(b.total_outstanding || 0) - Number(a.total_outstanding || 0))[0];
  }, [filteredDetail]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => navigate(backToPath)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft className="w-4 h-4" />
            Back to Finance
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Customer Outstanding</h1>
          <p className="mt-1 text-gray-500">Focused receivables controller view using the current aging APIs</p>
        </div>
        <div className="w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => updateSearchParams({ search: e.target.value || null })}
            placeholder="Search customers..."
            className="input-field"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPI icon={CreditCard} label="Total Outstanding" value={formatCurrency(summary?.total_outstanding)} tone="blue" />
        <KPI icon={ShieldAlert} label="90+ Overdue" value={formatCurrency(summary?.['90+'])} tone="red" />
        <KPI icon={Mail} label="Customers Exposed" value={filteredDetail.length.toLocaleString()} tone="purple" />
      </div>

      {topRisk && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          Highest current exposure: <span className="font-semibold">{topRisk.customer_name || topRisk.customer}</span> with {formatCurrency(topRisk.total_outstanding)} outstanding.
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Outstanding by Customer</h2>
          <p className="text-sm text-gray-500">Breakdown by aging bucket for collection follow-up</p>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Customer</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">0–30</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">31–60</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">61–90</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">90+</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Total</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></td></tr>
              ) : filteredDetail.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No customer outstanding data found.</td></tr>
              ) : (
                filteredDetail.map((row) => (
                  <tr key={row.customer} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-brand-700">{row.customer_name || row.customer}</td>
                    <td className="px-6 py-3 text-right text-sm">{formatCurrency(row['0-30'])}</td>
                    <td className="px-6 py-3 text-right text-sm">{formatCurrency(row['31-60'])}</td>
                    <td className="px-6 py-3 text-right text-sm">{formatCurrency(row['61-90'])}</td>
                    <td className="px-6 py-3 text-right text-sm text-red-700">{formatCurrency(row['90+'])}</td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-red-700">{formatCurrency(row.total_outstanding)}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(appendPreservedListQuery(`/customers/${encodeURIComponent(row.customer)}`, buildListQuery()))}
                          className="btn-secondary text-xs"
                        >
                          View Customer
                        </button>
                        <button
                          onClick={() => navigate(appendPreservedListQuery(`/finance/payments/new?paymentType=Receive&partyType=Customer&party=${encodeURIComponent(row.customer)}&amount=${encodeURIComponent(String(row.total_outstanding || 0))}`, buildListQuery()))}
                          className="btn-secondary text-xs"
                        >
                          Collect Payment
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: 'blue' | 'red' | 'purple' }) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  } as const;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
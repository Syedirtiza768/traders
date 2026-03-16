import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { reportsApi } from '../lib/api';
import { appendPreservedListQuery, formatCompact, formatCurrency } from '../lib/utils';

export default function CustomerAgingPage() {
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
        console.error('Failed to load customer aging:', err);
        setError('Could not load customer aging right now.');
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

  const agingChart = useMemo(() => ([
    { bucket: '0-30', amount: summary?.['0-30'] || 0 },
    { bucket: '31-60', amount: summary?.['31-60'] || 0 },
    { bucket: '61-90', amount: summary?.['61-90'] || 0 },
    { bucket: '90+', amount: summary?.['90+'] || 0 },
  ]), [summary]);

  const severeExposureCount = useMemo(() => filteredDetail.filter((row) => Number(row['90+'] || 0) > 0).length, [filteredDetail]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => navigate(backToPath)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft className="w-4 h-4" />
            Back to Finance
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Customer Aging</h1>
          <p className="mt-1 text-gray-500">Aging buckets and collection risk based on current receivables data</p>
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {['0-30', '31-60', '61-90', '90+'].map((bucket) => (
          <div key={bucket} className="card p-5">
            <p className="text-xs text-gray-500">{bucket} Days</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(summary?.[bucket])}</p>
          </div>
        ))}
        <div className="card bg-red-50 p-5">
          <p className="text-xs text-gray-500">Customers in 90+</p>
          <p className="text-lg font-bold text-red-700">{severeExposureCount.toLocaleString()}</p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Aging Distribution</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={agingChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v: number) => formatCompact(v)} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="amount" name="Receivable" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Highest Aging Exposure</h2>
          <p className="text-sm text-gray-500">Customers ordered by severe aging risk</p>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Customer</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">61–90</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">90+</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></td></tr>
              ) : filteredDetail.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">No receivable aging detail found.</td></tr>
              ) : (
                [...filteredDetail]
                  .sort((a, b) => (Number(b['90+'] || 0) + Number(b['61-90'] || 0)) - (Number(a['90+'] || 0) + Number(a['61-90'] || 0)))
                  .slice(0, 25)
                  .map((row) => (
                    <tr key={row.customer} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-brand-700">
                        <button
                          onClick={() => navigate(appendPreservedListQuery(`/customers/${encodeURIComponent(row.customer)}`, buildListQuery()))}
                          className="hover:text-brand-800 hover:underline"
                        >
                          {row.customer_name || row.customer}
                        </button>
                      </td>
                      <td className="px-6 py-3 text-right text-sm">{formatCurrency(row['61-90'])}</td>
                      <td className="px-6 py-3 text-right text-sm text-red-700">{formatCurrency(row['90+'])}</td>
                      <td className="px-6 py-3 text-right text-sm font-bold text-red-700">{formatCurrency(row.total_outstanding)}</td>
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
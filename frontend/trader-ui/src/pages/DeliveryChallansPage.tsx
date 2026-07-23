import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, Truck } from 'lucide-react';
import { salesApi } from '../lib/api';
import { formatDate } from '../lib/utils';
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
  SearchField,
  StatusBadge,
} from '../components/ui';

export default function DeliveryChallansPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesApi.getDeliveryNotes({ page: 1, page_size: 50, search: search || undefined });
      setRows(res.data.message?.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Challans"
        description="Goods dispatched without a sales invoice."
        actions={
          <>
            <button type="button" onClick={() => navigate('/sales/challans/group-invoice')} className="btn-secondary flex items-center gap-2">
              <Layers className="h-4 w-4" /> Group Invoice
            </button>
            <button type="button" onClick={() => navigate('/sales/challans/new')} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Challan
            </button>
          </>
        }
      />

      <SearchField
        placeholder="Search challans…"
        value={search}
        onChange={setSearch}
        aria-label="Search delivery challans"
      />

      {loading ? (
        <LoadingBlock label="Loading delivery challans…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No delivery challans yet"
          description={search ? 'Try a different search term.' : 'Create a challan when goods leave without an invoice.'}
          icon={<Truck className="h-5 w-5" aria-hidden="true" />}
          action={
            !search ? (
              <button type="button" onClick={() => navigate('/sales/challans/new')} className="btn-primary flex items-center gap-2">
                <Plus className="h-4 w-4" /> New Challan
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {rows.map((row) => (
                <tr key={row.name} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50" onClick={() => navigate(`/sales/challans/${encodeURIComponent(row.name)}`)}>
                  <td className="px-4 py-3 font-medium text-brand-700 dark:text-brand-300">{row.name}</td>
                  <td className="px-4 py-3">{row.customer_name || row.customer}</td>
                  <td className="px-4 py-3">{formatDate(row.posting_date)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status || (row.docstatus === 0 ? 'Draft' : 'Submitted')} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

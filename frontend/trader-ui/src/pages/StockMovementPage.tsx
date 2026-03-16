import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, Calendar, Search } from 'lucide-react';
import { inventoryApi } from '../lib/api';
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils';

export default function StockMovementPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [itemCode, setItemCode] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 20;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await inventoryApi.getStockLedger({
          page,
          page_size: pageSize,
          item_code: itemCode || undefined,
          warehouse: warehouse || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        });
        const payload = response.data.message;
        setRows(payload?.data || []);
        setTotal(payload?.total || 0);
      } catch (err) {
        console.error('Failed to load stock movement:', err);
        setError('Could not load stock movement right now.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [page, itemCode, warehouse, fromDate, toDate]);

  const totalPages = Math.ceil(total / pageSize);
  const totalDelta = useMemo(() => rows.reduce((sum, row) => sum + Number(row.actual_qty || 0), 0), [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => navigate('/inventory')} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft className="w-4 h-4" />
            Back to Inventory
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Stock Movement</h1>
          <p className="mt-1 text-gray-500">Transaction-level stock ledger view using the existing inventory API</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={itemCode} onChange={(e) => { setItemCode(e.target.value); setPage(1); }} placeholder="Filter by item code" className="input-field pl-9" />
        </div>
        <input value={warehouse} onChange={(e) => { setWarehouse(e.target.value); setPage(1); }} placeholder="Filter by warehouse" className="input-field" />
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} className="input-field pl-9" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} className="input-field pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPI label="Visible Rows" value={rows.length.toLocaleString()} />
        <KPI label="Net Qty Delta" value={totalDelta.toLocaleString()} />
        <KPI label="Total Matches" value={total.toLocaleString()} />
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Ledger Entries</h2>
          <p className="text-sm text-gray-500">Stock movement history across vouchers, items, and warehouses</p>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date / Time</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Item</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Warehouse</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Actual Qty</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Qty After</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Value</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No ledger entries found.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-700">{formatDate(row.posting_date)}<div className="text-xs text-gray-400">{formatDateTime(`${row.posting_date}T${row.posting_time || '00:00:00'}`)}</div></td>
                    <td className="px-6 py-3 text-sm font-medium text-brand-700">{row.item_code}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{row.warehouse}</td>
                    <td className={`px-6 py-3 text-right text-sm font-medium ${Number(row.actual_qty || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{Number(row.actual_qty || 0).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">{Number(row.qty_after_transaction || 0).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">{formatCurrency(row.stock_value)}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{row.voucher_type} / {row.voucher_no}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary">Previous</button>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-secondary">Next</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        This screen exposes the existing `get_stock_ledger` endpoint directly in the frontend, closing one of the previously identified inventory UI gaps.
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
          <ArrowRightLeft className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
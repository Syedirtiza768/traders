import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, Calendar, Search } from 'lucide-react';
import { inventoryApi } from '../lib/api';
import { formatCurrency, formatDate, formatDateTime } from '../lib/utils';
import SearchableSelect from '../components/SearchableSelect';

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
  const [allItems, setAllItems] = useState<any[]>([]);
  const [allWarehouses, setAllWarehouses] = useState<any[]>([]);

  const pageSize = 20;

  useEffect(() => {
    const load = async () => {
      try {
        const [itemsRes, warehousesRes] = await Promise.all([
          inventoryApi.getItems({ page: 1, page_size: 200 }),
          inventoryApi.getWarehouses(),
        ]);
        setAllItems(itemsRes.data.message?.data || []);
        setAllWarehouses(warehousesRes.data.message?.data || warehousesRes.data.message || []);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    void load();
  }, []);

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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => navigate('/inventory')} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft className="w-4 h-4" />
            Back to Inventory
          </button>
          <h1 className="page-title">Stock Movement</h1>
          <p className="mt-1 text-gray-500">Transaction-level stock ledger view using the existing inventory API</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SearchableSelect
          value={itemCode}
          onChange={(v) => { setItemCode(v); setPage(1); }}
          options={allItems.map((e) => ({ label: e.item_name || e.item_code || e.name, value: e.item_code || e.name }))}
          placeholder="Filter by item code"
        />
        <SearchableSelect
          value={warehouse}
          onChange={(v) => { setWarehouse(v); setPage(1); }}
          options={allWarehouses.map((w) => ({ label: w.warehouse_name || w.name, value: w.name }))}
          placeholder="Filter by warehouse"
        />
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
        {/* Desktop table */}
        <div className="hidden md:block">
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
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {loading ? (
            <div className="px-4 py-12 text-center"><div className="spinner mx-auto" /></div>
          ) : rows.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-gray-400">No ledger entries found.</p>
          ) : (
            rows.map((row) => (
              <div key={`m-${row.name}`} className="px-4 py-3">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm font-medium text-brand-700 truncate">{row.item_code}</p>
                  <span className={`text-sm font-semibold whitespace-nowrap ${Number(row.actual_qty || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {Number(row.actual_qty || 0) >= 0 ? '+' : ''}{Number(row.actual_qty || 0).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{row.warehouse}</p>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                  <span>{formatDate(row.posting_date)}</span>
                  <span>After: {Number(row.qty_after_transaction || 0).toLocaleString()}</span>
                  <span>{formatCurrency(row.stock_value)}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{row.voucher_type} / {row.voucher_no}</p>
              </div>
            ))
          )}
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
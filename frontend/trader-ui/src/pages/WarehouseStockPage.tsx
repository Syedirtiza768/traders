import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Boxes, CircleDollarSign, Package } from 'lucide-react';
import { inventoryApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { PageHeader, LoadingBlock, EmptyState, AlertBanner } from '../components/ui';

type WarehouseState = {
  warehouse?: Record<string, any>;
};

export default function WarehouseStockPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { warehouseId } = useParams();
  const state = (location.state as WarehouseState | null) ?? null;
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const decodedWarehouseId = decodeURIComponent(warehouseId || '');
  const warehouse = state?.warehouse ?? null;

  useEffect(() => {
    const load = async () => {
      if (!decodedWarehouseId) {
        setError('Warehouse not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await inventoryApi.getStockBalance({ warehouse: decodedWarehouseId, page: 1, page_size: 100 });
        const payload = response.data.message;
        setRows(payload?.data || []);
      } catch (err) {
        console.error('Failed to load warehouse stock:', err);
        setError('Could not load warehouse stock right now.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [decodedWarehouseId]);

  const totals = useMemo(() => ({
    itemCount: rows.length,
    qty: rows.reduce((sum, row) => sum + Number(row.actual_qty || 0), 0),
    value: rows.reduce((sum, row) => sum + Number(row.stock_value || 0), 0),
  }), [rows]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title={warehouse?.warehouse_name || decodedWarehouseId}
        description="Warehouse stock view using the filtered stock balance endpoint"
        meta={
          <span className="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700 dark:bg-slate-800 dark:text-purple-300">
            {warehouse?.warehouse_type || 'Warehouse'}
          </span>
        }
        actions={
          <button type="button" onClick={() => navigate('/inventory')} className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Inventory
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPI icon={Package} label="Items" value={totals.itemCount.toLocaleString()} />
        <KPI icon={Boxes} label="Total Qty" value={totals.qty.toLocaleString()} />
        <KPI icon={CircleDollarSign} label="Stock Value" value={formatCurrency(totals.value)} />
      </div>

      {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Warehouse Stock</h2>
          <p className="text-sm text-gray-500">Item-level stock currently held in this warehouse</p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block table-container">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Item Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Item Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Group</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Qty</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5}><LoadingBlock compact label="Loading stock…" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5}><EmptyState compact title="No stock rows found for this warehouse." /></td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.item_code} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-brand-700">{row.item_code}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{row.item_name}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{row.item_group}</td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{Number(row.actual_qty || 0).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">{formatCurrency(row.stock_value)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-gray-100">
          {loading ? (
            <LoadingBlock compact label="Loading stock…" />
          ) : rows.length === 0 ? (
            <EmptyState compact title="No stock rows found for this warehouse." />
          ) : (
            rows.map((row) => (
              <div key={row.item_code} className="p-4 space-y-1">
                <p className="text-sm font-medium text-brand-700">{row.item_code}</p>
                <p className="text-sm text-gray-700 truncate">{row.item_name}</p>
                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                  <span>{row.item_group}</span>
                  <span className="font-medium text-gray-900">Qty: {Number(row.actual_qty || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-end">
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(row.stock_value)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        This screen makes the existing warehouse-filtered `get_stock_balance` endpoint directly reachable from the UI.
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
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
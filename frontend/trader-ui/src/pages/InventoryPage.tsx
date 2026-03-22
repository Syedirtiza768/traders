import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Warehouse, AlertTriangle, DollarSign, Search, ChevronLeft, ChevronRight, Plus, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { inventoryApi } from '../lib/api';
import { formatCurrency, formatCompact, debounce } from '../lib/utils';

const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#65a30d'];
const TABS = ['Stock Balance', 'Items', 'Warehouses', 'Low Stock'];

export default function InventoryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Stock Balance');
  const [summary, setSummary] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const pageSize = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes] = await Promise.all([inventoryApi.getSummary()]);
      setSummary(summaryRes.data.message);

      let result: any;
      const params: Record<string, any> = { page, page_size: pageSize };
      if (search) params.search = search;

      switch (activeTab) {
        case 'Stock Balance':
          result = await inventoryApi.getStockBalance(params);
          break;
        case 'Items':
          result = await inventoryApi.getItems(params);
          break;
        case 'Warehouses':
          result = await inventoryApi.getWarehouses();
          setData(result.data.message || []);
          setTotal(0);
          setLoading(false);
          return;
        case 'Low Stock':
          result = await inventoryApi.getLowStockItems(params);
          break;
      }

      const d = result?.data?.message;
      setData(d?.data || []);
      setTotal(d?.total || 0);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, search]);

  useEffect(() => { load(); }, [load]);

  const debouncedSearch = useCallback(
    debounce((val: string) => { setSearch(val); setPage(1); }, 400),
    [],
  );

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-gray-500 mt-1 text-sm">Stock levels, items, and warehouse management</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => navigate('/inventory/warehouse')} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Warehouse className="w-4 h-4" /> Warehouse
          </button>
          <button onClick={() => navigate('/inventory/movements')} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Activity className="w-4 h-4" /> Movements
          </button>
          <button onClick={() => navigate('/inventory/items/new')} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" /> New Item
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg"><Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500">Total Items</p>
              <p className="text-sm sm:text-lg font-bold text-gray-900">{summary?.total_items?.toLocaleString() ?? '—'}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-green-50 rounded-lg"><DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500">Stock Value</p>
              <p className="text-sm sm:text-lg font-bold text-gray-900">{formatCompact(summary?.total_value)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-purple-50 rounded-lg"><Warehouse className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500">Item Groups</p>
              <p className="text-sm sm:text-lg font-bold text-gray-900">{summary?.by_group?.length ?? '—'}</p>
            </div>
          </div>
        </div>
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-red-50 rounded-lg"><AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500">Low Stock</p>
              <p className="text-sm sm:text-lg font-bold text-red-700">{summary?.low_stock_count ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock by group chart */}
      {summary?.by_group && summary.by_group.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Stock Value by Group</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={summary.by_group} dataKey="stock_value" nameKey="item_group" cx="50%" cy="50%" outerRadius={75}
                     label={({ name, percent }: any) => `${(name || '').slice(0, 10)} (${(percent * 100).toFixed(0)}%)`}>
                  {summary.by_group.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Items per Group</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.by_group}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="item_group" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="item_count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto scrollbar-hide w-full sm:w-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => { setActiveTab(t); setPage(1); setSearch(''); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === t ? 'bg-white shadow text-brand-700' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {activeTab !== 'Warehouses' && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder={`Search ${activeTab.toLowerCase()}...`}
                   onChange={(e) => debouncedSearch(e.target.value)} className="input-field pl-9" />
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block table-container">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              {activeTab === 'Stock Balance' && (
                <>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Item Code</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Item Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Group</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Value</th>
                </>
              )}
              {activeTab === 'Items' && (
                <>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Item Code</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Item Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Group</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">UOM</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Selling</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Buying</th>
                </>
              )}
              {activeTab === 'Warehouses' && (
                <>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Warehouse</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Items</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total Qty</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Value</th>
                </>
              )}
              {activeTab === 'Low Stock' && (
                <>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Item Code</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Item Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Group</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Warehouse</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No data found.</td></tr>
            ) : (
              data.map((row, idx) => (
                <tr key={idx} className={`hover:bg-gray-50 transition-colors ${activeTab === 'Items' || activeTab === 'Stock Balance' ? 'cursor-pointer' : ''}`} onClick={() => { if ((activeTab === 'Items' || activeTab === 'Stock Balance') && row.item_code) navigate(`/inventory/items/${encodeURIComponent(row.item_code)}`); }}>
                  {activeTab === 'Stock Balance' && (
                    <>
                      <td className="px-6 py-3 text-sm font-medium text-brand-700">{row.item_code}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{row.item_name}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{row.item_group}</td>
                      <td className="px-6 py-3 text-sm text-right font-medium">{row.actual_qty?.toLocaleString()}</td>
                      <td className="px-6 py-3 text-sm text-right text-gray-900">{formatCurrency(row.stock_value)}</td>
                    </>
                  )}
                  {activeTab === 'Items' && (
                    <>
                      <td className="px-6 py-3 text-sm font-medium text-brand-700">{row.item_code}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{row.item_name}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{row.item_group}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{row.stock_uom}</td>
                      <td className="px-6 py-3 text-sm text-right text-green-700">{formatCurrency(row.selling_price)}</td>
                      <td className="px-6 py-3 text-sm text-right text-gray-700">{formatCurrency(row.buying_price)}</td>
                    </>
                  )}
                  {activeTab === 'Warehouses' && (
                    <>
                      <td className="px-6 py-3 text-sm font-medium text-brand-700">{row.warehouse_name || row.warehouse}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{row.warehouse_type || '—'}</td>
                      <td className="px-6 py-3 text-sm text-right">{row.item_count}</td>
                      <td className="px-6 py-3 text-sm text-right">{row.total_qty?.toLocaleString()}</td>
                      <td className="px-6 py-3 text-sm text-right text-gray-900">{formatCurrency(row.stock_value)}</td>
                    </>
                  )}
                  {activeTab === 'Low Stock' && (
                    <>
                      <td className="px-6 py-3 text-sm font-medium text-brand-700">{row.item_code}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{row.item_name}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{row.item_group}</td>
                      <td className="px-6 py-3 text-sm text-right font-medium text-red-600">{row.actual_qty}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{row.warehouse}</td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden card divide-y divide-gray-100">
        {loading ? (
          <div className="px-4 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></div>
        ) : data.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-400 text-sm">No data found.</div>
        ) : (
          data.map((row, idx) => (
            <div key={idx} className={`px-4 py-3 space-y-1 ${(activeTab === 'Items' || activeTab === 'Stock Balance') ? 'active:bg-gray-50' : ''}`}
                 onClick={() => { if ((activeTab === 'Items' || activeTab === 'Stock Balance') && row.item_code) navigate(`/inventory/items/${encodeURIComponent(row.item_code)}`); }}>
              {activeTab === 'Stock Balance' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-brand-700 truncate">{row.item_code}</span>
                    <span className="text-xs font-medium text-gray-900 shrink-0 ml-2">{formatCurrency(row.stock_value)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 truncate">{row.item_name}</span>
                    <span className="text-gray-500 shrink-0">Qty: {row.actual_qty?.toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-gray-400">{row.item_group}</div>
                </>
              )}
              {activeTab === 'Items' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-brand-700 truncate">{row.item_code}</span>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-2">{row.stock_uom}</span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{row.item_name}</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{row.item_group}</span>
                    <div className="flex gap-3">
                      <span className="text-green-700">{formatCurrency(row.selling_price)}</span>
                      <span className="text-gray-500">{formatCurrency(row.buying_price)}</span>
                    </div>
                  </div>
                </>
              )}
              {activeTab === 'Warehouses' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-brand-700 truncate">{row.warehouse_name || row.warehouse}</span>
                    <span className="text-xs font-medium text-gray-900 shrink-0 ml-2">{formatCurrency(row.stock_value)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{row.warehouse_type || '—'}</span>
                    <span className="text-gray-500">{row.item_count} items · Qty: {row.total_qty?.toLocaleString()}</span>
                  </div>
                </>
              )}
              {activeTab === 'Low Stock' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-brand-700 truncate">{row.item_code}</span>
                    <span className="text-xs font-medium text-red-600 shrink-0 ml-2">Qty: {row.actual_qty}</span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{row.item_name}</div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>{row.item_group}</span>
                    <span>{row.warehouse}</span>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
          <span>Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary px-2 py-1 text-xs" aria-label="Previous page">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-secondary px-2 py-1 text-xs" aria-label="Next page">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Warehouse, AlertTriangle, DollarSign, Plus, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { inventoryApi } from '../lib/api';
import { formatCurrency, formatCompact, debounce } from '../lib/utils';
import {
  PageHeader,
  EmptyState,
  LoadingBlock,
  FilterTabs,
  SearchField,
  PaginationBar,
} from '../components/ui';

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
      <PageHeader
        title="Inventory"
        description="Stock levels, items, and warehouse management"
        actions={
          <>
            <button type="button" onClick={() => navigate('/inventory/warehouse')} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Warehouse className="w-4 h-4" aria-hidden="true" /> Warehouse
            </button>
            <button type="button" onClick={() => navigate('/inventory/movements')} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Activity className="w-4 h-4" aria-hidden="true" /> Movements
            </button>
            <button type="button" onClick={() => navigate('/inventory/items/new')} className="btn-primary flex items-center gap-1.5 text-sm">
              <Plus className="w-4 h-4" aria-hidden="true" /> New Item
            </button>
          </>
        }
      />

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
        <FilterTabs
          options={TABS}
          value={activeTab}
          onChange={(t) => { setActiveTab(t); setPage(1); setSearch(''); }}
          ariaLabel="Inventory view"
        />
        {activeTab !== 'Warehouses' && (
          <SearchField
            placeholder={`Search ${activeTab.toLowerCase()}...`}
            aria-label={`Search ${activeTab.toLowerCase()}`}
            onChange={debouncedSearch}
          />
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block table-container">
        <table className="data-table w-full">
          <thead>
            <tr>
              {activeTab === 'Stock Balance' && (
                <>
                  <th scope="col">Item Code</th>
                  <th scope="col">Item Name</th>
                  <th scope="col">Group</th>
                  <th scope="col" className="text-right">Qty</th>
                  <th scope="col" className="text-right">Value</th>
                </>
              )}
              {activeTab === 'Items' && (
                <>
                  <th scope="col">Item Code</th>
                  <th scope="col">Item Name</th>
                  <th scope="col">Group</th>
                  <th scope="col">UOM</th>
                  <th scope="col" className="text-right">Selling</th>
                  <th scope="col" className="text-right">Buying</th>
                </>
              )}
              {activeTab === 'Warehouses' && (
                <>
                  <th scope="col">Warehouse</th>
                  <th scope="col">Type</th>
                  <th scope="col" className="text-right">Items</th>
                  <th scope="col" className="text-right">Total Qty</th>
                  <th scope="col" className="text-right">Value</th>
                </>
              )}
              {activeTab === 'Low Stock' && (
                <>
                  <th scope="col">Item Code</th>
                  <th scope="col">Item Name</th>
                  <th scope="col">Group</th>
                  <th scope="col" className="text-right">Qty</th>
                  <th scope="col">Warehouse</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><LoadingBlock compact label="Loading inventory…" /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6}><EmptyState compact title="No data found" description={search ? 'Try adjusting your search.' : undefined} /></td></tr>
            ) : (
              data.map((row, idx) => (
                <tr key={idx} className={`hover:bg-gray-50 transition-colors ${activeTab === 'Items' || activeTab === 'Stock Balance' ? 'cursor-pointer' : ''}`} onClick={() => { if ((activeTab === 'Items' || activeTab === 'Stock Balance') && row.item_code) navigate(`/inventory/items/${encodeURIComponent(row.item_code)}`); }}>
                  {activeTab === 'Stock Balance' && (
                    <>
                      <td className="font-medium text-brand-700 dark:text-brand-300">{row.item_code}</td>
                      <td className="text-gray-700 dark:text-slate-300">{row.item_name}</td>
                      <td className="text-gray-500 dark:text-slate-400">{row.item_group}</td>
                      <td className="num font-medium">{row.actual_qty?.toLocaleString()}</td>
                      <td className="num text-gray-900 dark:text-gray-100">{formatCurrency(row.stock_value)}</td>
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
      <div className="md:hidden card divide-y divide-gray-100 dark:divide-slate-800">
        {loading ? (
          <LoadingBlock compact label="Loading inventory…" />
        ) : data.length === 0 ? (
          <EmptyState compact title="No data found" description={search ? 'Try adjusting your search.' : undefined} />
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
      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}

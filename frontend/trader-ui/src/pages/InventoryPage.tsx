import { useState, useEffect } from 'react';
import { Package, AlertTriangle, Search, Warehouse } from 'lucide-react';
import { inventoryApi } from '../lib/api';
import { formatCurrency, formatCompact } from '../lib/utils';

export default function InventoryPage() {
  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'low'>('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stockRes, lowRes] = await Promise.all([
        inventoryApi.getStockSummary(),
        inventoryApi.getLowStockItems(),
      ]);
      setStockSummary(stockRes.data.message || []);
      setLowStock(lowRes.data.message || []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = (activeTab === 'low' ? lowStock : stockSummary).filter(
    (item: any) => !search || item.item_code?.toLowerCase().includes(search.toLowerCase()) || item.item_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = stockSummary.reduce((sum: number, i: any) => sum + (i.stock_value || 0), 0);
  const totalQty = stockSummary.reduce((sum: number, i: any) => sum + (i.actual_qty || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 mt-1">Track stock levels across all warehouses</p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg"><Package className="w-5 h-5 text-blue-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Total Items</p>
            <p className="text-lg font-bold text-gray-900">{stockSummary.length}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg"><Warehouse className="w-5 h-5 text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Total Quantity</p>
            <p className="text-lg font-bold text-gray-900">{formatCompact(totalQty)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg"><Package className="w-5 h-5 text-purple-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Stock Value</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalValue)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Low Stock Items</p>
            <p className="text-lg font-bold text-red-600">{lowStock.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="card">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'all' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >All Stock</button>
            <button
              onClick={() => setActiveTab('low')}
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'low' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >Low Stock ({lowStock.length})</button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="input-field pl-9 w-64"
            />
          </div>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Item Code</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Item Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Warehouse</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Quantity</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Value</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">UOM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-brand-700">{item.item_code}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{item.item_name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{item.warehouse}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium">
                    <span className={item.actual_qty <= (item.reorder_level || 10) ? 'text-red-600 font-bold' : 'text-gray-900'}>
                      {item.actual_qty?.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-right text-gray-700">{formatCurrency(item.stock_value)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{item.stock_uom}</td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400"><div className="spinner mx-auto" /></td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No items found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

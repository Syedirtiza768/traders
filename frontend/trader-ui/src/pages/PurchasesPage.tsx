import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Download, Filter } from 'lucide-react';
import { resourceApi } from '../lib/api';
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils';

export default function PurchasesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => { loadInvoices(); }, [page]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await resourceApi.list({
        doctype: 'Purchase Invoice',
        fields: ['name', 'supplier', 'supplier_name', 'posting_date', 'grand_total', 'outstanding_amount', 'status'],
        orderBy: 'posting_date desc',
        limit: 20,
        offset: page * 20,
      });
      setInvoices(res.data.data || []);
    } catch (err) {
      console.error('Failed to load purchase invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-gray-500 mt-1">Manage purchase invoices and supplier orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Purchase
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Outstanding</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.name} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-6 py-3 text-sm font-medium text-brand-700">{inv.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{inv.supplier_name || inv.supplier}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatDate(inv.posting_date)}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">{formatCurrency(inv.grand_total)}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium">
                    <span className={inv.outstanding_amount > 0 ? 'text-orange-600' : 'text-green-600'}>
                      {formatCurrency(inv.outstanding_amount)}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400"><div className="spinner mx-auto" /></td></tr>
              )}
              {!loading && invoices.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No purchase invoices found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="btn-secondary text-sm">Previous</button>
          <span className="text-sm text-gray-500">Page {page + 1}</span>
          <button onClick={() => setPage(page + 1)} disabled={invoices.length < 20} className="btn-secondary text-sm">Next</button>
        </div>
      </div>
    </div>
  );
}

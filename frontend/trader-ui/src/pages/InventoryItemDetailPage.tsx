import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CircleDollarSign, Layers3, Package, Scale, Tag } from 'lucide-react';
import { inventoryApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';

type InventoryItemState = {
  item?: Record<string, any>;
  sourceTab?: string;
};

export default function InventoryItemDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemId } = useParams();
  const state = (location.state as InventoryItemState | null) ?? null;

  const [item, setItem] = useState<Record<string, any> | null>(state?.item ?? null);
  const [loading, setLoading] = useState(!state?.item);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we already have the item from navigation state, skip the fetch
    if (item) return;
    if (!itemId) {
      setError('Item not found.');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const decodedId = decodeURIComponent(itemId);
        const response = await inventoryApi.getItemDetail(decodedId);
        setItem(response.data.message);
      } catch (err) {
        console.error('Failed to load item detail:', err);
        setError('Could not load item details at the moment.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [itemId, item]);

  const heading = useMemo(() => item?.item_name || decodeURIComponent(itemId || ''), [item, itemId]);

  if (loading) {
    return <div className="py-16 flex justify-center"><div className="spinner" /></div>;
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/inventory')} className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Inventory
        </button>
        <div className="card p-8 text-center text-gray-500">
          {error || 'Item not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => navigate('/inventory')} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft className="w-4 h-4" />
            Back to Inventory
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{heading || 'Item Detail'}</h1>
          <p className="mt-1 text-gray-500">Inventory item overview from the {state?.sourceTab || 'inventory'} view</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          {item.item_code || decodeURIComponent(itemId || '')}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailKPI icon={Tag} label="Item Group" value={item.item_group || '—'} tone="blue" />
        <DetailKPI icon={Scale} label="Stock UOM" value={item.stock_uom || '—'} tone="purple" />
        <DetailKPI icon={CircleDollarSign} label="Selling Price" value={formatCurrency(item.selling_price || item.standard_rate)} tone="green" />
        <DetailKPI icon={CircleDollarSign} label="Buying Price" value={formatCurrency(item.buying_price || item.last_purchase_rate)} tone="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Item Profile</h2>
            <p className="text-sm text-gray-500">Core inventory attributes currently available in the UI flow</p>
          </div>
          <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoRow icon={Package} label="Item Code" value={item.item_code || '—'} />
            <InfoRow icon={Package} label="Item Name" value={item.item_name || '—'} />
            <InfoRow icon={Tag} label="Item Group" value={item.item_group || '—'} />
            <InfoRow icon={Scale} label="Stock UOM" value={item.stock_uom || '—'} />
            <InfoRow icon={Layers3} label="Is Stock Item" value={item.is_stock_item ? 'Yes' : 'No'} />
            <InfoRow icon={Layers3} label="Has Variants" value={item.has_variants ? 'Yes' : 'No'} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Commercial Snapshot</h2>
            <p className="text-sm text-gray-500">Available pricing and stock context</p>
          </div>
          <div className="card-body space-y-4">
            <SummaryLine label="Selling Price" value={formatCurrency(item.selling_price || item.standard_rate)} />
            <SummaryLine label="Buying Price" value={formatCurrency(item.buying_price || item.last_purchase_rate)} />
            <SummaryLine label="Actual Qty" value={item.actual_qty != null ? String(item.actual_qty) : '—'} />
            <SummaryLine label="Stock Value" value={formatCurrency(item.stock_value)} />
            <SummaryLine label="Warehouse" value={item.warehouse || '—'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailKPI({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: 'blue' | 'green' | 'red' | 'purple'; }) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
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

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string; }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="text-sm text-gray-900 break-words">{value}</div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string; }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}
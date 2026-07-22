import { useMemo } from 'react';

export type OrderDetails = {
  validity_days?: number;
  pay_advance_pct?: number;
  pay_delivery_pct?: number;
  pay_commissioning_pct?: number;
  pay_after_pct?: number;
  pay_after_days?: number;
  gst_mode?: string;
  services?: number;
  wht_percent?: number;
  freight_clause?: string;
  rate_clause?: string;
  rate_validity?: string;
  clause_rates?: string;
  print_exchange?: string;
  warehouse?: string;
};

export const EMPTY_ORDER_DETAILS: OrderDetails = {
  validity_days: 5,
  pay_advance_pct: 50,
  pay_delivery_pct: 0,
  pay_commissioning_pct: 0,
  pay_after_pct: 50,
  pay_after_days: 30,
  gst_mode: 'exclusive',
  services: 0,
  wht_percent: 0,
  freight_clause: 'EXW',
  rate_clause: 'usd',
  print_exchange: '0',
  warehouse: '',
};

export function orderDetailsFromQuotation(q: Record<string, any> | null | undefined): OrderDetails {
  if (!q) return { ...EMPTY_ORDER_DETAILS };
  return {
    validity_days: Number(q.trader_validity_days ?? EMPTY_ORDER_DETAILS.validity_days) || 0,
    pay_advance_pct: Number(q.trader_pay_advance_pct ?? 0) || 0,
    pay_delivery_pct: Number(q.trader_pay_delivery_pct ?? 0) || 0,
    pay_commissioning_pct: Number(q.trader_pay_commissioning_pct ?? 0) || 0,
    pay_after_pct: Number(q.trader_pay_after_pct ?? 0) || 0,
    pay_after_days: Number(q.trader_pay_after_days ?? 0) || 0,
    gst_mode: q.trader_gst_mode || 'exclusive',
    services: Number(q.trader_services) ? 1 : 0,
    wht_percent: Number(q.trader_wht_percent ?? 0) || 0,
    freight_clause: q.trader_freight_clause || 'EXW',
    rate_clause: q.trader_rate_clause || 'usd',
    rate_validity: q.trader_rate_validity || '',
    clause_rates: typeof q.trader_clause_rates === 'string' ? q.trader_clause_rates : '',
    print_exchange: String(q.trader_print_exchange ?? '0'),
    warehouse: q.trader_warehouse || '',
  };
}

type Props = {
  value: OrderDetails;
  onChange: (next: OrderDetails) => void;
  warehouses?: Array<{ name?: string; warehouse?: string; warehouse_name?: string }>;
  readOnly?: boolean;
  showWarehouse?: boolean;
};

export default function QuotationOrderDetailsForm({
  value,
  onChange,
  warehouses = [],
  readOnly = false,
  showWarehouse = true,
}: Props) {
  const patch = (partial: Partial<OrderDetails>) => onChange({ ...value, ...partial });
  const paySum = useMemo(
    () =>
      Number(value.pay_advance_pct || 0) +
      Number(value.pay_delivery_pct || 0) +
      Number(value.pay_commissioning_pct || 0) +
      Number(value.pay_after_pct || 0),
    [value],
  );

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
        <p className="text-sm text-gray-500">
          Payment schedule, GST/WHT, freight and FX clause (Sahamid-aligned).
        </p>
      </div>
      <div className="card-body grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {showWarehouse ? (
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-gray-700">Quote Warehouse</span>
            <select
              className="input-field"
              disabled={readOnly}
              value={value.warehouse || ''}
              onChange={(e) => patch({ warehouse: e.target.value })}
            >
              <option value="">Select warehouse</option>
              {warehouses.map((w) => {
                const id = w.name || w.warehouse || '';
                return (
                  <option key={id} value={id}>
                    {w.warehouse_name || id}
                  </option>
                );
              })}
            </select>
          </label>
        ) : null}

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Validity Days</span>
          <input
            className="input-field"
            type="number"
            disabled={readOnly}
            value={value.validity_days ?? ''}
            onChange={(e) => patch({ validity_days: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Freight</span>
          <select
            className="input-field"
            disabled={readOnly}
            value={value.freight_clause || ''}
            onChange={(e) => patch({ freight_clause: e.target.value })}
          >
            {['EXW', 'FOR', 'FOB', 'CIF'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Advance %</span>
          <input className="input-field" type="number" disabled={readOnly} value={value.pay_advance_pct ?? ''} onChange={(e) => patch({ pay_advance_pct: Number(e.target.value) || 0 })} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Delivery %</span>
          <input className="input-field" type="number" disabled={readOnly} value={value.pay_delivery_pct ?? ''} onChange={(e) => patch({ pay_delivery_pct: Number(e.target.value) || 0 })} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Commissioning %</span>
          <input className="input-field" type="number" disabled={readOnly} value={value.pay_commissioning_pct ?? ''} onChange={(e) => patch({ pay_commissioning_pct: Number(e.target.value) || 0 })} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">After %</span>
          <input className="input-field" type="number" disabled={readOnly} value={value.pay_after_pct ?? ''} onChange={(e) => patch({ pay_after_pct: Number(e.target.value) || 0 })} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">After Days</span>
          <input className="input-field" type="number" disabled={readOnly} value={value.pay_after_days ?? ''} onChange={(e) => patch({ pay_after_days: Number(e.target.value) || 0 })} />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">GST Mode</span>
          <select className="input-field" disabled={readOnly} value={value.gst_mode || 'exclusive'} onChange={(e) => patch({ gst_mode: e.target.value })}>
            <option value="exclusive">Exclusive</option>
            <option value="inclusive">Inclusive</option>
            <option value="none">None</option>
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            className="rounded border-gray-300"
            disabled={readOnly}
            checked={Boolean(value.services)}
            onChange={(e) => patch({ services: e.target.checked ? 1 : 0 })}
          />
          <span className="text-sm text-gray-700">Services quote</span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">WHT %</span>
          <input className="input-field" type="number" step="0.01" disabled={readOnly} value={value.wht_percent ?? ''} onChange={(e) => patch({ wht_percent: Number(e.target.value) || 0 })} />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">FX Rate Clause</span>
          <select className="input-field" disabled={readOnly} value={value.rate_clause || 'usd'} onChange={(e) => patch({ rate_clause: e.target.value })}>
            {['pkr', 'usd', 'aed', 'euro', 'pound'].map((o) => (
              <option key={o} value={o}>{o.toUpperCase()}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">FX Rate Validity</span>
          <input className="input-field" type="date" disabled={readOnly} value={value.rate_validity || ''} onChange={(e) => patch({ rate_validity: e.target.value })} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">Print Exchange</span>
          <select className="input-field" disabled={readOnly} value={value.print_exchange || '0'} onChange={(e) => patch({ print_exchange: e.target.value })}>
            <option value="0">Local only</option>
            <option value="1">Local + FX</option>
            <option value="2">FX only</option>
          </select>
        </label>

        {Math.abs(paySum - 100) > 0.01 ? (
          <p className="sm:col-span-2 lg:col-span-4 text-xs text-amber-700">
            Payment percentages sum to {paySum}% (expected 100%).
          </p>
        ) : null}
      </div>
    </div>
  );
}

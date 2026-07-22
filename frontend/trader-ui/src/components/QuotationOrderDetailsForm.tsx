import { useMemo, useState } from 'react';
import { opportunityApi } from '../lib/api';
import { extractFrappeError } from '../lib/utils';

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
  gst_clause?: string;
  deliver_to?: string;
  delivery_address?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  delivery_date?: string;
  quote_date?: string;
  use_quote_date?: number;
  confirmed_date?: string;
  order_comments?: string;
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
  gst_clause: '',
  deliver_to: '',
  delivery_address: '',
  contact_person: '',
  contact_phone: '',
  contact_email: '',
  delivery_date: '',
  quote_date: '',
  use_quote_date: 0,
  confirmed_date: '',
  order_comments: '',
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
    gst_clause: q.trader_gst_clause || '',
    deliver_to: q.trader_deliver_to || '',
    delivery_address: q.trader_delivery_address || '',
    contact_person: q.trader_contact_person || '',
    contact_phone: q.trader_contact_phone || '',
    contact_email: q.trader_contact_email || '',
    delivery_date: q.trader_delivery_date || '',
    quote_date: q.trader_quote_date || '',
    use_quote_date: Number(q.trader_use_quote_date) ? 1 : 0,
    confirmed_date: q.trader_confirmed_date || '',
    order_comments: q.trader_order_comments || '',
  };
}

type Props = {
  value: OrderDetails;
  onChange: (next: OrderDetails) => void;
  warehouses?: Array<{ name?: string; warehouse?: string; warehouse_name?: string }>;
  readOnly?: boolean;
  showWarehouse?: boolean;
  /** Omit outer card when embedded in Sahamid-style tabs. */
  plain?: boolean;
};

function formatClauseRates(raw?: string) {
  if (!raw) return '';
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(obj)
      .filter(([k]) => !['note', 'as_of', 'base'].includes(k))
      .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
      .join(' · ');
  } catch {
    return raw;
  }
}

export default function QuotationOrderDetailsForm({
  value,
  onChange,
  warehouses = [],
  readOnly = false,
  showWarehouse = true,
  plain = false,
}: Props) {
  const patch = (partial: Partial<OrderDetails>) => onChange({ ...value, ...partial });
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const paySum = useMemo(
    () =>
      Number(value.pay_advance_pct || 0) +
      Number(value.pay_delivery_pct || 0) +
      Number(value.pay_commissioning_pct || 0) +
      Number(value.pay_after_pct || 0),
    [value],
  );

  const refreshClauseRates = async () => {
    setRefreshingRates(true);
    setRatesError(null);
    try {
      const res = await opportunityApi.getClauseRateSnapshot(value.rate_validity || undefined);
      const json = res.data.message?.clause_rates_json || JSON.stringify(res.data.message?.clause_rates || {});
      patch({ clause_rates: json });
    } catch (err) {
      setRatesError(extractFrappeError(err, 'Could not refresh FX rates.'));
    } finally {
      setRefreshingRates(false);
    }
  };

  return (
    <div className={plain ? 'space-y-6' : 'card'}>
      {!plain ? (
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
          <p className="text-sm text-gray-500">
            Delivery, payment schedule, GST/WHT, freight and FX clause (Sahamid-aligned).
          </p>
        </div>
      ) : null}
      <div className={plain ? 'space-y-6' : 'card-body space-y-6'}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <span className="text-sm font-medium text-gray-700">Quote Date</span>
            <input className="input-field" type="date" disabled={readOnly} value={value.quote_date || ''} onChange={(e) => patch({ quote_date: e.target.value })} />
          </label>
          <label className="flex items-end gap-2 pb-2">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              disabled={readOnly}
              checked={Boolean(value.use_quote_date)}
              onChange={(e) => patch({ use_quote_date: e.target.checked ? 1 : 0 })}
            />
            <span className="text-sm text-gray-700">Use quote date on print</span>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Est. Delivery Date</span>
            <input className="input-field" type="date" disabled={readOnly} value={value.delivery_date || ''} onChange={(e) => patch({ delivery_date: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Confirmed Order Date</span>
            <input className="input-field" type="date" disabled={readOnly} value={value.confirmed_date || ''} onChange={(e) => patch({ confirmed_date: e.target.value })} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-gray-700">Deliver To</span>
            <input className="input-field" disabled={readOnly} value={value.deliver_to || ''} onChange={(e) => patch({ deliver_to: e.target.value })} />
          </label>
          <label className="block space-y-1 sm:col-span-2 lg:col-span-4">
            <span className="text-sm font-medium text-gray-700">Delivery Address</span>
            <textarea className="input-field min-h-[64px]" disabled={readOnly} value={value.delivery_address || ''} onChange={(e) => patch({ delivery_address: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Contact Person</span>
            <input className="input-field" disabled={readOnly} value={value.contact_person || ''} onChange={(e) => patch({ contact_person: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Contact Phone</span>
            <input className="input-field" disabled={readOnly} value={value.contact_phone || ''} onChange={(e) => patch({ contact_phone: e.target.value })} />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-gray-700">Contact Email</span>
            <input className="input-field" type="email" disabled={readOnly} value={value.contact_email || ''} onChange={(e) => patch({ contact_email: e.target.value })} />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <select className="input-field" disabled={readOnly} value={value.pay_after_days ?? ''} onChange={(e) => patch({ pay_after_days: Number(e.target.value) || 0 })}>
              <option value={0}>None</option>
              {[15, 30, 45, 60].map((d) => (
                <option key={d} value={d}>{d} Days</option>
              ))}
            </select>
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
            <span className="text-sm text-gray-700">Services (16% GST)</span>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">WHT %</span>
            <select className="input-field" disabled={readOnly} value={value.wht_percent ?? 0} onChange={(e) => patch({ wht_percent: Number(e.target.value) || 0 })}>
              <option value={0}>None</option>
              <option value={4.5}>4.5%</option>
              <option value={6.5}>6.5%</option>
            </select>
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium text-gray-700">GST Clause</span>
            <input className="input-field" disabled={readOnly} value={value.gst_clause || ''} onChange={(e) => patch({ gst_clause: e.target.value })} placeholder="Free-text GST note" />
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
          <div className="flex items-end">
            {!readOnly ? (
              <button type="button" className="btn-secondary w-full" disabled={refreshingRates} onClick={() => void refreshClauseRates()}>
                {refreshingRates ? 'Updating rates…' : 'Update FX rates'}
              </button>
            ) : null}
          </div>
          <div className="sm:col-span-2 lg:col-span-4 text-xs text-gray-600">
            Frozen rates: {formatClauseRates(value.clause_rates) || '—'}
            {ratesError ? <span className="ml-2 text-red-600">{ratesError}</span> : null}
          </div>

          <label className="block space-y-1 sm:col-span-2 lg:col-span-4">
            <span className="text-sm font-medium text-gray-700">Comments</span>
            <textarea className="input-field min-h-[72px]" disabled={readOnly} value={value.order_comments || ''} onChange={(e) => patch({ order_comments: e.target.value })} />
          </label>

          {Math.abs(paySum - 100) > 0.01 ? (
            <p className="sm:col-span-2 lg:col-span-4 text-xs text-amber-700">
              Payment percentages sum to {paySum}% (expected 100%).
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

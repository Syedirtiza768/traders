/** Sahamid-aligned commercial totals (first-option net + GST/WHT/FX). */

export type CommercialTotalsInput = {
  net: number;
  gst_mode?: string;
  services?: number | boolean;
  wht_percent?: number;
  rate_clause?: string;
  print_exchange?: string | number;
  clause_rates?: string | Record<string, unknown> | null;
};

export type CommercialTotals = {
  net: number;
  gst_mode: string;
  gst_rate: number;
  gst_amount: number;
  taxable_base: number;
  wht_percent: number;
  wht_amount: number;
  grand_total: number;
  print_exchange: string;
  rate_clause: string;
  fx_rate: number | null;
  fx_net: number | null;
  fx_grand: number | null;
};

const GST_GOODS = 18;
const GST_SERVICES = 16;

function parseClauseRates(raw: CommercialTotalsInput['clause_rates']): Record<string, number> {
  if (!raw) return {};
  let obj: Record<string, unknown> = {};
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw || '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  } else if (typeof raw === 'object') {
    obj = raw as Record<string, unknown>;
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = k.toLowerCase();
    if (key === 'note' || key === 'as_of' || key === 'base') continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out[key] = n;
  }
  return out;
}

export function resolveGstRate(gstMode?: string, services?: number | boolean): number {
  const mode = (gstMode || 'exclusive').toLowerCase();
  if (mode === 'none' || mode === '') return 0;
  return services ? GST_SERVICES : GST_GOODS;
}

export function computeCommercialTotals(input: CommercialTotalsInput): CommercialTotals {
  const net = Number(input.net) || 0;
  const gstMode = (input.gst_mode || 'exclusive').toLowerCase() || 'exclusive';
  const gstRate = resolveGstRate(gstMode, input.services);
  let gstAmount = 0;
  let taxableBase = net;
  if (gstMode === 'exclusive' && gstRate > 0) {
    gstAmount = (net * gstRate) / 100;
  } else if (gstMode === 'inclusive' && gstRate > 0) {
    taxableBase = net / (1 + gstRate / 100);
    gstAmount = net - taxableBase;
  }
  const whtPercent = Number(input.wht_percent) || 0;
  const whtBase = gstMode === 'inclusive' ? taxableBase : net;
  const whtAmount = whtPercent > 0 ? (whtBase * whtPercent) / 100 : 0;
  const grand =
    gstMode === 'inclusive' ? net - whtAmount : net + gstAmount - whtAmount;

  const printExchange = String(input.print_exchange ?? '0');
  const rateClause = (input.rate_clause || 'usd').toLowerCase();
  const rates = parseClauseRates(input.clause_rates);
  const fxRate = rateClause === 'pkr' ? 1 : rates[rateClause] || null;
  const fxNet = fxRate && fxRate > 0 ? net / fxRate : null;
  const fxGrand = fxRate && fxRate > 0 ? grand / fxRate : null;

  return {
    net,
    gst_mode: gstMode,
    gst_rate: gstRate,
    gst_amount: gstAmount,
    taxable_base: taxableBase,
    wht_percent: whtPercent,
    wht_amount: whtAmount,
    grand_total: grand,
    print_exchange: printExchange,
    rate_clause: rateClause,
    fx_rate: fxRate,
    fx_net: fxNet,
    fx_grand: fxGrand,
  };
}

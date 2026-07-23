import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart2, RefreshCw, AlertTriangle, DollarSign, Package, ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp, PrinterIcon } from 'lucide-react';
import { daybookApi } from '../lib/api';
import { useCompanyStore } from '../stores/companyStore';
import { formatAmount } from '../lib/utils';
import { localTodayStr } from '../lib/navProfile';
import { PageHeader, LoadingBlock, AlertBanner } from '../components/ui';

function todayStr() { return localTodayStr(); }
function fmtAmt(n: number) {
  return formatAmount(n);
}
function fmtQty(n: number) {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}

interface ItemRow {
  item_code: string;
  item_name: string;
  category: string;
  form_factor: string;
  capacity: string;
  grade: string;
  stock_uom: string;
  qty_on_hand: number;
  stock_value: number;
  valuation_rate: number;
  standard_rate: number;
}

interface Group {
  category: string;
  items: ItemRow[];
  subtotal_qty: number;
  subtotal_value: number;
}

interface Tiles {
  in_hand_cash: number;
  total_stock_value: number;
  total_ar: number;
  total_ap: number;
}

interface ValuationReport {
  as_of_date: string;
  groups: Group[];
  grand_total_qty: number;
  grand_total_value: number;
  tiles: Tiles;
}

export default function StockValuationPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const componentsEnabled = useCompanyStore((s) => s.componentsEnabled);
  const company = useCompanyStore((s) => s.company);
  const revision = useCompanyStore((s) => s.revision);

  const [asOfDate, setAsOfDate] = useState(() => searchParams.get('date') || todayStr());
  const [report, setReport] = useState<ValuationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fromUrl = searchParams.get('date');
    if (fromUrl && fromUrl !== asOfDate) setAsOfDate(fromUrl);
  }, [searchParams]);

  const onDateChange = (next: string) => {
    setAsOfDate(next);
    setSearchParams(next ? { date: next } : {}, { replace: true });
  };

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const res = await daybookApi.getStockValuation({ as_of_date: asOfDate });
      setReport(res.data.message as ValuationReport);
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Failed to load stock valuation.');
    } finally {
      setLoading(false);
    }
  }, [company, asOfDate, revision]);

  useEffect(() => { void load(); }, [load]);

  if (!componentsEnabled) {
    return (
      <div className="p-8 flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <h2 className="text-lg font-semibold">Components Trading Not Enabled</h2>
        <button onClick={() => navigate('/settings')} className="btn-primary text-sm px-4 py-2">Go to Settings</button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            <BarChart2 className="w-6 h-6 text-purple-600" aria-hidden="true" />
            Stock Valuation
          </span>
        }
        actions={
          <>
            <input type="date" value={asOfDate} onChange={(e) => onDateChange(e.target.value)} className="input-field text-sm" aria-label="As-of date" />
            <button type="button" onClick={() => void load()} className="btn-secondary p-2 min-h-[44px] min-w-[44px]" aria-label="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {report && (
              <button type="button" onClick={() => window.print()} className="btn-secondary p-2 min-h-[44px] min-w-[44px]" title="Print" aria-label="Print">
                <PrinterIcon className="w-4 h-4" />
              </button>
            )}
          </>
        }
      />

      {/* Headline tiles */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'In-Hand Cash', value: report.tiles.in_hand_cash, icon: DollarSign, color: 'text-blue-600' },
            { label: 'Total Stock', value: report.tiles.total_stock_value, icon: Package, color: 'text-purple-600' },
            { label: 'In-Coming (AR)', value: report.tiles.total_ar, icon: ArrowDownLeft, color: 'text-emerald-600', to: '/finance/receivables' },
            { label: 'Out-Going (AP)', value: report.tiles.total_ap, icon: ArrowUpRight, color: 'text-rose-600', to: '/finance/payables' },
          ].map(({ label, value, icon: Icon, color, to }) => (
            to ? (
              <Link key={label} to={to} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:ring-2 hover:ring-brand-300 transition-shadow">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
                <p className={`text-lg font-bold ${color}`}>{fmtAmt(value)}</p>
              </Link>
            ) : (
            <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-gray-500 dark:text-slate-400">{label}</span>
              </div>
              <p className={`text-xl font-bold ${color}`}>{fmtAmt(value)}</p>
            </div>
            )
          ))}
        </div>
      )}

      {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

      {loading ? (
        <LoadingBlock label="Loading stock valuation…" />
      ) : report ? (
        <div className="space-y-4">
          {report.groups.map((group) => {
            const isOpen = !collapsed[group.category];
            return (
              <div key={group.category} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [group.category]: !c[group.category] }))}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-900/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-purple-500" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{group.category}</span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">{group.items.length} items</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{fmtQty(group.subtotal_qty)} units</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{fmtAmt(group.subtotal_value)}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-slate-700 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-slate-900/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacity</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Form Factor</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {group.items.map((item) => (
                          <tr key={item.item_code} className="hover:bg-gray-50 dark:hover:bg-slate-900/30">
                            <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{item.capacity || '—'}</td>
                            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{item.form_factor || '—'}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                item.grade === 'New' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                item.grade === 'Pulled' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                                'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
                              }`}>
                                {item.grade || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{fmtQty(item.qty_on_hand)}</td>
                            <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{fmtAmt(item.valuation_rate)}</td>
                            <td className="px-4 py-2 text-right font-semibold text-purple-600 dark:text-purple-400">{fmtAmt(item.stock_value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {/* Grand total */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider">Grand Total</p>
              <p className="text-sm text-gray-500 mt-0.5">{fmtQty(report.grand_total_qty)} units across all categories</p>
            </div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{fmtAmt(report.grand_total_value)}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <BarChart2 className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">Select a date and click Refresh</p>
        </div>
      )}
    </div>
  );
}

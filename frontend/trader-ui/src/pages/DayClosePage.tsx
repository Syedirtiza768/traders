import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, DollarSign, Package,
  ArrowDownLeft, ArrowUpRight, PrinterIcon, BookOpen,
} from 'lucide-react';
import { daybookApi } from '../lib/api';
import { useCompanyStore } from '../stores/companyStore';
import { formatAmount } from '../lib/utils';
import { localTodayStr } from '../lib/navProfile';

function fmtAmt(n: number) {
  return formatAmount(n);
}

interface Summary {
  date: string;
  total_purchases: number;
  total_sales: number;
  cash_in: number;
  cash_out: number;
  net_cash: number;
  closing_cash: number;
  component_stock_value: number;
  total_ar: number;
  total_ap: number;
}

type Tile = {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  to?: string;
};

export default function DayClosePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const componentsEnabled = useCompanyStore((s) => s.componentsEnabled);
  const company = useCompanyStore((s) => s.company);
  const revision = useCompanyStore((s) => s.revision);

  const [date, setDate] = useState(() => searchParams.get('date') || localTodayStr());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = searchParams.get('date');
    if (fromUrl && fromUrl !== date) setDate(fromUrl);
  }, [searchParams]);

  const onDateChange = (next: string) => {
    setDate(next);
    setSearchParams(next ? { date: next } : {}, { replace: true });
  };

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError(null);
    try {
      const res = await daybookApi.getDayCloseSummary({ date });
      setSummary(res.data.message as Summary);
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Failed to load day close summary.');
    } finally {
      setLoading(false);
    }
  }, [company, date, revision]);

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

  const tiles: Tile[] = summary ? [
    {
      label: 'Total Sales',
      value: summary.total_sales,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      to: `/finance/day-book?date=${summary.date}`,
    },
    {
      label: 'Total Purchases',
      value: summary.total_purchases,
      icon: TrendingDown,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      border: 'border-rose-200 dark:border-rose-800',
      to: `/finance/day-book?date=${summary.date}`,
    },
    {
      label: 'Cash In',
      value: summary.cash_in,
      icon: ArrowDownLeft,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      to: `/finance/day-book?date=${summary.date}`,
    },
    {
      label: 'Cash Out',
      value: summary.cash_out,
      icon: ArrowUpRight,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      to: `/finance/day-book?date=${summary.date}`,
    },
    {
      label: 'Closing Cash',
      value: summary.closing_cash,
      icon: DollarSign,
      color: summary.closing_cash >= 0 ? 'text-emerald-700' : 'text-rose-700',
      bg: 'bg-gray-50 dark:bg-slate-900',
      border: 'border-gray-200 dark:border-slate-700',
    },
    {
      label: 'Stock Value',
      value: summary.component_stock_value,
      icon: Package,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      to: `/inventory/stock-valuation?date=${summary.date}`,
    },
    {
      label: 'In-Coming (AR)',
      value: summary.total_ar,
      icon: ArrowDownLeft,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      to: '/finance/receivables',
    },
    {
      label: 'Out-Going (AP)',
      value: summary.total_ap,
      icon: ArrowUpRight,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      border: 'border-rose-200 dark:border-rose-800',
      to: '/finance/payables',
    },
  ] : [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Day Close</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="input-field text-sm"
          />
          <button onClick={() => void load()} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-brand-600">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {summary && (
            <button onClick={() => window.print()} className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-brand-600" title="Print">
              <PrinterIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="spinner" /></div>
      ) : summary ? (
        <>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Summary for <strong>{summary.date}</strong>
            {' · '}
            <Link
              to={`/finance/day-book?date=${summary.date}`}
              className="text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              View Day Book
            </Link>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tiles.map(({ label, value, icon: Icon, color, bg, border, to }) => {
              const body = (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-xs text-gray-500 dark:text-slate-400">{label}</span>
                  </div>
                  <p className={`text-lg font-bold ${color}`}>{fmtAmt(value)}</p>
                </>
              );
              if (to) {
                return (
                  <Link
                    key={label}
                    to={to}
                    className={`rounded-xl border ${border} ${bg} p-4 block hover:ring-2 hover:ring-brand-300 dark:hover:ring-brand-700 transition-shadow`}
                  >
                    {body}
                  </Link>
                );
              }
              return (
                <div key={label} className={`rounded-xl border ${border} ${bg} p-4`}>
                  {body}
                </div>
              );
            })}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Net Position</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Net Cash (Day)</span>
              <span className={`font-bold ${summary.net_cash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtAmt(summary.net_cash)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Net AR−AP</span>
              <span className={`font-bold ${summary.total_ar - summary.total_ap >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {fmtAmt(summary.total_ar - summary.total_ap)}
              </span>
            </div>
            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <Link to="/finance/receivables" className="text-brand-600 hover:underline">Open customer ledgers →</Link>
              <Link to="/finance/payables" className="text-brand-600 hover:underline">Open supplier ledgers →</Link>
              <Link to={`/inventory/stock-valuation?date=${summary.date}`} className="text-brand-600 hover:underline">Stock valuation →</Link>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <Calendar className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">Select a date to view day close summary</p>
        </div>
      )}
    </div>
  );
}

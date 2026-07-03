import { useState, useEffect, useCallback } from 'react';

import { useNavigate } from 'react-router-dom';

import {

  BookOpen, RefreshCw, ChevronLeft, ChevronRight,

  TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight,

  Calendar, AlertTriangle, Package,
} from 'lucide-react';

import { daybookApi } from '../lib/api';

import { useCompanyStore } from '../stores/companyStore';

import DayBookEntryPanel, { type DayBookEntryType } from '../components/DayBookEntryPanel';



function todayStr() {

  return new Date().toISOString().slice(0, 10);

}



function fmtAmt(n: number) {

  return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

}



interface Voucher {

  voucher_type: string;

  voucher_no: string;

  party: string;

  amount: number;

  outstanding_amount: number;

  status: string;

  posting_date: string;

  direction: string;

  docstatus: number;

}



interface Totals {

  total_sales: number;

  total_purchases: number;

  cash_in: number;

  cash_out: number;

  net_cash: number;

}



const DIRECTION_COLORS: Record<string, string> = {

  in: 'text-emerald-600 dark:text-emerald-400',

  out: 'text-rose-600 dark:text-rose-400',

  journal: 'text-blue-600 dark:text-blue-400',

};



const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {

  Sale: TrendingUp,

  Purchase: TrendingDown,

  'Payment Receive': ArrowDownLeft,

  'Payment Pay': ArrowUpRight,

};



function voucherRoute(v: Voucher): string | null {

  if (v.voucher_type === 'Sale') return `/sales/${v.voucher_no}`;

  if (v.voucher_type === 'Purchase') return `/purchases/${v.voucher_no}`;

  if (v.voucher_type.startsWith('Payment')) return `/finance/payments/${v.voucher_no}`;

  if (v.voucher_type === 'Journal') return `/finance/journals/${v.voucher_no}`;

  return null;

}



function voucherIcon(voucherType: string) {

  if (voucherType.startsWith('Stock')) return Package;

  return TYPE_ICONS[voucherType] || BookOpen;

}



const ACTION_BUTTONS: { type: DayBookEntryType; label: string; icon: typeof TrendingUp; className: string }[] = [

  { type: 'sale', label: 'Sale', icon: TrendingUp, className: 'bg-emerald-600 hover:bg-emerald-700 text-white' },

  { type: 'purchase', label: 'Purchase', icon: TrendingDown, className: 'bg-rose-600 hover:bg-rose-700 text-white' },

  { type: 'payment_in', label: 'Receive', icon: ArrowDownLeft, className: 'bg-blue-600 hover:bg-blue-700 text-white' },

  { type: 'payment_out', label: 'Pay', icon: ArrowUpRight, className: 'bg-orange-600 hover:bg-orange-700 text-white' },

];



export default function DayBookPage() {

  const navigate = useNavigate();

  const componentsEnabled = useCompanyStore((s) => s.componentsEnabled);

  const company = useCompanyStore((s) => s.company);

  const revision = useCompanyStore((s) => s.revision);



  const [date, setDate] = useState(todayStr());

  const [page, setPage] = useState(1);

  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  const [totals, setTotals] = useState<Totals | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [entryType, setEntryType] = useState<DayBookEntryType | null>(null);

  const [success, setSuccess] = useState<string | null>(null);



  const load = useCallback(async () => {

    if (!company) return;

    setLoading(true);

    setError(null);

    try {

      const res = await daybookApi.getDayBook({ date, page, page_size: 50 });

      const msg = res.data.message as any;

      setVouchers(msg.data || []);

      setTotals(msg.totals || null);

    } catch (err: any) {

      setError(err?.response?.data?.exception || 'Failed to load day book.');

    } finally {

      setLoading(false);

    }

  }, [company, date, page, revision]);



  useEffect(() => { void load(); }, [load]);



  const handleEntrySuccess = (message: string) => {

    setSuccess(message);

    setPage(1);

    void load();

  };



  if (!componentsEnabled) {

    return (

      <div className="p-8 flex flex-col items-center gap-4 text-center">

        <AlertTriangle className="w-10 h-10 text-amber-500" />

        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">

          Components Trading Not Enabled

        </h2>

        <p className="text-sm text-gray-500 max-w-sm">

          Enable the <strong>Components Trading — Day Book &amp; Variant Catalog</strong> feature

          in Settings to access this page.

        </p>

        <button onClick={() => navigate('/settings')} className="btn-primary text-sm px-4 py-2">

          Go to Settings

        </button>

      </div>

    );

  }



  return (

    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto pb-24">

      {/* Header */}

      <div className="flex items-center justify-between flex-wrap gap-3">

        <div className="flex items-center gap-3">

          <BookOpen className="w-6 h-6 text-brand-600" />

          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Day Book</h1>

        </div>

        <div className="flex items-center gap-2">

          <Calendar className="w-4 h-4 text-gray-400" />

          <input

            type="date"

            value={date}

            onChange={(e) => { setDate(e.target.value); setPage(1); }}

            className="input-field text-sm"

          />

          <button

            onClick={() => void load()}

            className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 hover:text-brand-600 transition-colors"

            title="Refresh"

          >

            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />

          </button>

        </div>

      </div>



      {success && (

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-300 flex justify-between gap-2">

          <span>{success}</span>

          <button type="button" onClick={() => setSuccess(null)} className="text-green-600 hover:underline text-xs">Dismiss</button>

        </div>

      )}



      {/* Summary tiles */}

      {totals && (

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

          {[

            { label: 'Sales', value: totals.total_sales, color: 'text-emerald-600', icon: TrendingUp },

            { label: 'Purchases', value: totals.total_purchases, color: 'text-rose-600', icon: TrendingDown },

            { label: 'Cash In', value: totals.cash_in, color: 'text-blue-600', icon: ArrowDownLeft },

            { label: 'Cash Out', value: totals.cash_out, color: 'text-orange-600', icon: ArrowUpRight },

            { label: 'Net Cash', value: totals.net_cash, color: totals.net_cash >= 0 ? 'text-emerald-600' : 'text-rose-600', icon: BookOpen },

          ].map(({ label, value, color, icon: Icon }) => (

            <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">

              <div className="flex items-center gap-2 mb-1">

                <Icon className={`w-4 h-4 ${color}`} />

                <span className="text-xs text-gray-500 dark:text-slate-400">{label}</span>

              </div>

              <p className={`text-lg font-bold ${color}`}>{fmtAmt(value)}</p>

            </div>

          ))}

        </div>

      )}



      {/* Error */}

      {error && (

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300">

          {error}

        </div>

      )}



      {/* Voucher list */}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">

        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">

          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">

            Vouchers — {date}

          </h2>

          <div className="hidden sm:flex gap-1.5">

            {ACTION_BUTTONS.map(({ type, label, icon: Icon, className }) => (

              <button

                key={type}

                type="button"

                onClick={() => setEntryType(type)}

                className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 ${className}`}

              >

                <Icon className="w-3.5 h-3.5" />

                {label}

              </button>

            ))}

          </div>

        </div>



        {loading ? (

          <div className="flex items-center justify-center h-40">

            <div className="spinner" />

          </div>

        ) : vouchers.length === 0 ? (

          <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">

            <BookOpen className="w-8 h-8 opacity-40" />

            <p className="text-sm">No vouchers for {date}</p>

            <p className="text-xs">Use the buttons below to record today&apos;s activity.</p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-gray-50 dark:bg-slate-900/50">

                <tr>

                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>

                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Voucher No</th>

                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Party</th>

                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>

                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</th>

                  <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">

                {vouchers.map((v, i) => {

                  const Icon = voucherIcon(v.voucher_type);

                  const dirColor = DIRECTION_COLORS[v.direction] || 'text-gray-600';

                  const route = voucherRoute(v);

                  return (

                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-900/30">

                      <td className="px-4 py-2.5">

                        <div className="flex items-center gap-2">

                          <Icon className={`w-4 h-4 ${dirColor}`} />

                          <span className="text-gray-700 dark:text-gray-300">{v.voucher_type}</span>

                        </div>

                      </td>

                      <td className="px-4 py-2.5 font-mono text-xs">

                        {route ? (

                          <button

                            type="button"

                            onClick={() => navigate(route)}

                            className="text-brand-600 dark:text-brand-400 hover:underline"

                          >

                            {v.voucher_no}

                          </button>

                        ) : (

                          <span className="text-brand-600 dark:text-brand-400">{v.voucher_no}</span>

                        )}

                      </td>

                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{v.party || '—'}</td>

                      <td className={`px-4 py-2.5 text-right font-semibold ${dirColor}`}>

                        {fmtAmt(v.amount)}

                      </td>

                      <td className="px-4 py-2.5 text-right text-gray-500">

                        {v.outstanding_amount > 0 ? fmtAmt(v.outstanding_amount) : '—'}

                      </td>

                      <td className="px-4 py-2.5 text-center">

                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${

                          v.docstatus === 1

                            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'

                            : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'

                        }`}>

                          {v.docstatus === 1 ? 'Posted' : 'Draft'}

                        </span>

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </div>

        )}



        {/* Pagination */}

        {vouchers.length > 0 && (

          <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">

            <span className="text-xs text-gray-400">Page {page}</span>

            <div className="flex gap-2">

              <button

                onClick={() => setPage((p) => Math.max(1, p - 1))}

                disabled={page === 1}

                className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-40"

              >

                <ChevronLeft className="w-4 h-4" />

              </button>

              <button

                onClick={() => setPage((p) => p + 1)}

                disabled={vouchers.length < 50}

                className="p-1 rounded text-gray-400 hover:text-gray-700 disabled:opacity-40"

              >

                <ChevronRight className="w-4 h-4" />

              </button>

            </div>

          </div>

        )}

      </div>



      {/* Mobile FAB bar */}

      <div className="fixed bottom-4 left-4 right-4 z-30 sm:hidden">

        <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">

          {ACTION_BUTTONS.map(({ type, label, icon: Icon, className }) => (

            <button

              key={type}

              type="button"

              onClick={() => setEntryType(type)}

              className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl text-xs font-medium shadow-lg ${className}`}

            >

              <Icon className="w-4 h-4" />

              {label}

            </button>

          ))}

        </div>

      </div>



      <DayBookEntryPanel

        open={entryType !== null}

        entryType={entryType || 'sale'}

        postingDate={date}

        onClose={() => setEntryType(null)}

        onSuccess={handleEntrySuccess}

      />

    </div>

  );

}



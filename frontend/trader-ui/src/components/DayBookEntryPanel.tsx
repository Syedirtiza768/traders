import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import QuickAddProvider from './QuickAddProvider';
import useQuickAdd from './useQuickAdd';
import ComponentLineEntry, { type ComponentLine } from './ComponentLineEntry';
import {
  customersApi,
  daybookApi,
  financeApi,
  suppliersApi,
} from '../lib/api';
import { extractFrappeError } from '../lib/utils';

export type DayBookEntryType = 'sale' | 'purchase' | 'payment_in' | 'payment_out';

const TITLES: Record<DayBookEntryType, string> = {
  sale: 'Record Sale',
  purchase: 'Record Purchase',
  payment_in: 'Receive Payment',
  payment_out: 'Make Payment',
};

type Props = {
  open: boolean;
  entryType: DayBookEntryType;
  postingDate: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export default function DayBookEntryPanel({
  open,
  entryType,
  postingDate,
  onClose,
  onSuccess,
}: Props) {
  const quickAdd = useQuickAdd();
  const isInvoice = entryType === 'sale' || entryType === 'purchase';

  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [party, setParty] = useState('');
  const [lines, setLines] = useState<ComponentLine[]>([]);
  const [cashNow, setCashNow] = useState(true);
  const [amount, setAmount] = useState('');
  const [modeOfPayment, setModeOfPayment] = useState('Cash');
  const [settlementAccount, setSettlementAccount] = useState('');
  const [paymentModes, setPaymentModes] = useState<{ name: string }[]>([]);
  const [settlementAccounts, setSettlementAccounts] = useState<{ name: string; account_name?: string; account_type?: string }[]>([]);
  const [openInvoices, setOpenInvoices] = useState<any[]>([]);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partyOptions = useMemo(() => {
    if (entryType === 'purchase' || entryType === 'payment_out') {
      return suppliers.map((s) => ({
        label: s.supplier_name || s.name,
        value: s.name,
      }));
    }
    return customers.map((c) => ({
      label: c.customer_name || c.name,
      value: c.name,
    }));
  }, [customers, suppliers, entryType]);

  const resetForm = useCallback(() => {
    setParty('');
    setLines([]);
    setCashNow(true);
    setAmount('');
    setOpenInvoices([]);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    resetForm();
    setLoadingSetup(true);
    const load = async () => {
      try {
        const [payRes, customersRes, suppliersRes] = await Promise.all([
          financeApi.getPaymentEntrySetup(),
          customersApi.getList({ page: 1, page_size: 200 }),
          suppliersApi.getList({ page: 1, page_size: 200 }),
        ]);
        const payMsg = payRes.data.message || {};
        const modes = payMsg.modes || [];
        const accounts = payMsg.settlement_accounts || [];
        setPaymentModes(modes);
        setSettlementAccounts(accounts);
        setModeOfPayment(
          modes.find((m: { name: string }) => m.name === 'Cash')?.name || modes[0]?.name || 'Cash',
        );
        const defaultAccount = payMsg.defaults?.receive_account
          || payMsg.defaults?.cash_account
          || accounts[0]?.name
          || '';
        setSettlementAccount(defaultAccount);
        setCustomers(customersRes.data.message?.data || []);
        setSuppliers(suppliersRes.data.message?.data || []);
      } catch {
        setError('Could not load form setup.');
      } finally {
        setLoadingSetup(false);
      }
    };
    void load();
  }, [open, entryType, resetForm]);

  useEffect(() => {
    if (!open || !party) {
      setOpenInvoices([]);
      return;
    }
    if (entryType !== 'payment_in' && entryType !== 'payment_out') return;

    setLoadingInvoices(true);
    daybookApi.getPartyOpenInvoices({
      party_type: entryType === 'payment_in' ? 'Customer' : 'Supplier',
      party,
    }).then((res) => {
      const msg = res.data.message as any;
      setOpenInvoices(msg.invoices || []);
      if (msg.total_outstanding > 0) {
        setAmount((prev) => prev || String(msg.total_outstanding));
      }
    }).catch(() => {
      setOpenInvoices([]);
    }).finally(() => {
      setLoadingInvoices(false);
    });
  }, [open, party, entryType]);

  const handleSubmit = async () => {
    if (!party) {
      setError(
        entryType === 'purchase' || entryType === 'payment_out'
          ? 'Select a supplier.'
          : 'Select a customer.',
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isInvoice) {
        if (lines.length === 0) {
          setError('Add at least one item line.');
          setSaving(false);
          return;
        }
        const res = await daybookApi.postDayTransaction({
          tx_type: entryType,
          party,
          lines: lines.map((l) => ({ item_code: l.item_code, qty: l.qty, rate: l.rate })),
          posting_date: postingDate,
          record_payment: cashNow ? 1 : 0,
          mode_of_payment: modeOfPayment,
          settlement_account: settlementAccount || undefined,
        });
        const msg = res.data.message as any;
        onSuccess(
          `${entryType === 'sale' ? 'Sale' : 'Purchase'} ${msg.invoice} posted`
          + (msg.payment_entry ? ` · Payment ${msg.payment_entry}` : '')
          + (msg.outstanding_amount > 0 ? ` · Outstanding ${msg.outstanding_amount.toFixed(2)}` : ''),
        );
      } else {
        const payAmount = parseFloat(amount);
        if (!payAmount || payAmount <= 0) {
          setError('Enter a valid payment amount.');
          setSaving(false);
          return;
        }
        const res = await daybookApi.postDayTransaction({
          tx_type: entryType,
          party,
          amount: payAmount,
          posting_date: postingDate,
          mode_of_payment: modeOfPayment,
          settlement_account: settlementAccount || undefined,
        });
        const msg = res.data.message as any;
        onSuccess(
          `Payment ${msg.payment_entry} recorded`
          + (msg.allocated_amount ? ` · Allocated ${Number(msg.allocated_amount).toFixed(2)}` : ''),
        );
      }
      onClose();
    } catch (err: unknown) {
      setError(extractFrappeError(err, 'Could not post transaction.'));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 shadow-xl flex flex-col border-l border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {TITLES[entryType]}
          </h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-xs text-gray-500">Posting date: <strong>{postingDate}</strong></p>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {loadingSetup ? (
            <div className="flex justify-center py-12"><div className="spinner" /></div>
          ) : (
            <>
              <div>
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  {entryType === 'purchase' || entryType === 'payment_out' ? 'Supplier' : 'Customer'}
                </span>
                <SearchableSelect
                  value={party}
                  onChange={setParty}
                  options={partyOptions}
                  placeholder="Select party"
                  creatable
                  onCreateNew={(q) => quickAdd.open(
                    entryType === 'purchase' || entryType === 'payment_out' ? 'supplier' : 'customer',
                    q,
                  )}
                />
              </div>

              {isInvoice && (
                <>
                  <ComponentLineEntry lines={lines} onChange={setLines} />
                  <div className="space-y-2 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                      <input
                        type="radio"
                        checked={cashNow}
                        onChange={() => setCashNow(true)}
                        className="text-brand-600"
                      />
                      Cash now (full payment on post)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                      <input
                        type="radio"
                        checked={!cashNow}
                        onChange={() => setCashNow(false)}
                        className="text-brand-600"
                      />
                      Credit (invoice only)
                    </label>
                    {cashNow && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <select
                          value={modeOfPayment}
                          onChange={(e) => setModeOfPayment(e.target.value)}
                          className="input-field text-sm"
                        >
                          {paymentModes.map((m) => (
                            <option key={m.name} value={m.name}>{m.name}</option>
                          ))}
                        </select>
                        <select
                          value={settlementAccount}
                          onChange={(e) => setSettlementAccount(e.target.value)}
                          className="input-field text-sm"
                        >
                          {settlementAccounts.map((a) => (
                            <option key={a.name} value={a.name}>
                              {a.account_name || a.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}

              {!isInvoice && (
                <>
                  <div>
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      Amount
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                        Mode
                      </span>
                      <select
                        value={modeOfPayment}
                        onChange={(e) => setModeOfPayment(e.target.value)}
                        className="input-field text-sm"
                      >
                        {paymentModes.map((m) => (
                          <option key={m.name} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                        Account
                      </span>
                      <select
                        value={settlementAccount}
                        onChange={(e) => setSettlementAccount(e.target.value)}
                        className="input-field text-sm"
                      >
                        {settlementAccounts.map((a) => (
                          <option key={a.name} value={a.name}>
                            {a.account_name || a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {party && (
                    <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 text-xs space-y-1">
                      <p className="font-semibold text-gray-700 dark:text-slate-200">Open invoices (FIFO)</p>
                      {loadingInvoices ? (
                        <p className="text-gray-400">Loading…</p>
                      ) : openInvoices.length === 0 ? (
                        <p className="text-gray-400">No open invoices — payment posts as advance.</p>
                      ) : (
                        openInvoices.map((inv) => (
                          <div key={inv.name} className="flex justify-between text-gray-600 dark:text-slate-300">
                            <span className="font-mono">{inv.name}</span>
                            <span>{Number(inv.outstanding_amount).toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || loadingSetup}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Posting…' : 'Post to Day Book'}
          </button>
        </div>
      </aside>

      <QuickAddProvider
        quickAdd={quickAdd}
        customersSetter={setCustomers}
        customerValueSetter={setParty}
        suppliersSetter={setSuppliers}
        supplierValueSetter={setParty}
      />
    </>
  );
}

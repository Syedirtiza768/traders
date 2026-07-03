import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import QuickAddProvider from './QuickAddProvider';
import useQuickAdd from './useQuickAdd';
import ItemLineEntry, { type ItemLineEntryLine } from './ItemLineEntry';
import PaymentAllocationPanel, {
  type InvoiceAllocation,
  buildFifoAllocations,
} from './PaymentAllocationPanel';
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
  const [lines, setLines] = useState<ItemLineEntryLine[]>([]);
  const [cashNow, setCashNow] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [amount, setAmount] = useState('');
  const [modeOfPayment, setModeOfPayment] = useState('Cash');
  const [settlementAccount, setSettlementAccount] = useState('');
  const [paymentModes, setPaymentModes] = useState<{ name: string; type?: string }[]>([]);
  const [settlementAccounts, setSettlementAccounts] = useState<{ name: string; account_name?: string; account_type?: string }[]>([]);
  const [modeAccounts, setModeAccounts] = useState<Record<string, string>>({});
  const [openInvoices, setOpenInvoices] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([]);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partyOptions = useMemo(() => {
    if (entryType === 'purchase' || entryType === 'payment_out') {
      return suppliers.map((s) => ({
        label: s.trader_short_code
          ? `${s.supplier_name || s.name} (${s.trader_short_code})`
          : (s.supplier_name || s.name),
        value: s.name,
      }));
    }
    return customers.map((c) => ({
      label: c.trader_short_code
        ? `${c.customer_name || c.name} (${c.trader_short_code})`
        : (c.customer_name || c.name),
      value: c.name,
    }));
  }, [customers, suppliers, entryType]);

  const paymentModeOptions = useMemo(
    () => paymentModes.map((m) => ({ label: m.name, value: m.name })),
    [paymentModes],
  );

  const settlementAccountOptions = useMemo(
    () => settlementAccounts.map((a) => ({
      label: `${a.account_type === 'Bank' ? 'Bank' : 'Cash'}: ${a.account_name || a.name}`,
      value: a.name,
    })),
    [settlementAccounts],
  );

  const resetForm = useCallback(() => {
    setParty('');
    setLines([]);
    setCashNow(true);
    setPaymentAmount('');
    setAmount('');
    setOpenInvoices([]);
    setAllocations([]);
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
        setModeAccounts(payMsg.mode_accounts || {});
        setModeOfPayment(
          modes.find((m: { name: string }) => m.name === 'Cash')?.name || modes[0]?.name || 'Cash',
        );
        const defaultAccount = (entryType === 'payment_out'
          ? payMsg.defaults?.pay_account
          : payMsg.defaults?.receive_account)
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
    if (!open) return;
    const mapped = modeAccounts[modeOfPayment];
    if (mapped) {
      setSettlementAccount(mapped);
    }
  }, [modeOfPayment, modeAccounts, open]);

  useEffect(() => {
    if (!open || !party) {
      setOpenInvoices([]);
      setAllocations([]);
      return;
    }
    if (entryType !== 'payment_in' && entryType !== 'payment_out') return;

    setLoadingInvoices(true);
    daybookApi.getPartyOpenInvoices({
      party_type: entryType === 'payment_in' ? 'Customer' : 'Supplier',
      party,
    }).then((res) => {
      const msg = res.data.message as any;
      const invoices = msg.invoices || [];
      setOpenInvoices(invoices);
      if (msg.total_outstanding > 0) {
        setAmount((prev) => prev || String(msg.total_outstanding));
      }
    }).catch(() => {
      setOpenInvoices([]);
      setAllocations([]);
    }).finally(() => {
      setLoadingInvoices(false);
    });
  }, [open, party, entryType]);

  const invoiceTotal = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.qty) || 0) * (Number(line.rate) || 0), 0),
    [lines],
  );

  const payAmount = parseFloat(amount) || 0;
  const totalAllocated = allocations.reduce(
    (sum, row) => sum + (Number(row.allocated_amount) || 0),
    0,
  );

  const handleCreateParty = async (query: string) => {
    const partyType = entryType === 'purchase' || entryType === 'payment_out' ? 'Supplier' : 'Customer';
    try {
      const res = await daybookApi.findOrCreateParty({
        party_type: partyType,
        party_name: query.trim(),
      });
      const msg = res.data.message as { party: string; created?: boolean };
      const name = msg.party;
      if (partyType === 'Customer') {
        setCustomers((prev) => (
          prev.some((c) => c.name === name)
            ? prev
            : [...prev, { name, customer_name: query.trim() }]
        ));
      } else {
        setSuppliers((prev) => (
          prev.some((s) => s.name === name)
            ? prev
            : [...prev, { name, supplier_name: query.trim() }]
        ));
      }
      setParty(name);
    } catch (err: unknown) {
      setError(extractFrappeError(err, 'Could not resolve or create party.'));
    }
  };

  const handleSubmit = async () => {
    if (!party || !party.trim()) {
      setError(
        entryType === 'purchase' || entryType === 'payment_out'
          ? 'Select a supplier.'
          : 'Select a customer.',
      );
      return;
    }

    if (isInvoice) {
      if (lines.length === 0) {
        setError('Add at least one item line.');
        return;
      }
      const invalid = lines.some((l) => !l.item_code || !l.qty || l.qty <= 0);
      if (invalid) {
        setError('Each line needs an item and quantity greater than zero.');
        return;
      }
      const zeroRate = lines.some((l) => l.rate <= 0);
      if (zeroRate) {
        setError('Each line must have a rate greater than zero.');
        return;
      }
      if (cashNow) {
        const pay = parseFloat(paymentAmount);
        if (!pay || pay <= 0) {
          setError('Enter a payment amount greater than zero.');
          return;
        }
        if (invoiceTotal > 0 && pay > invoiceTotal + 0.005) {
          setError('Payment amount cannot exceed invoice total.');
          return;
        }
      }
    } else {
      if (!payAmount || payAmount <= 0) {
        setError('Enter a valid payment amount.');
        return;
      }
      if (totalAllocated > payAmount + 0.005) {
        setError('Allocated total exceeds payment amount.');
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      if (isInvoice) {
        const res = await daybookApi.postDayTransaction({
          tx_type: entryType,
          party,
          lines: lines.map((l) => ({
            item_code: l.item_code,
            qty: l.qty,
            rate: l.rate,
            warehouse: l.warehouse || undefined,
            serial_no: l.serial_no || undefined,
            description: l.description || l.item_name || undefined,
          })),
          posting_date: postingDate,
          record_payment: cashNow ? 1 : 0,
          payment_amount: cashNow && paymentAmount ? parseFloat(paymentAmount) : undefined,
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
        const activeAllocations = allocations
          .filter((row) => Number(row.allocated_amount) > 0)
          .map((row) => ({
            reference_name: row.reference_name,
            allocated_amount: Number(row.allocated_amount),
          }));

        const res = await daybookApi.postDayTransaction({
          tx_type: entryType,
          party,
          amount: payAmount,
          posting_date: postingDate,
          mode_of_payment: modeOfPayment,
          settlement_account: settlementAccount || undefined,
          allocations: openInvoices.length > 0 ? activeAllocations : undefined,
        });
        const msg = res.data.message as any;
        const unapplied = payAmount - (Number(msg.allocated_amount) || totalAllocated);
        onSuccess(
          `Payment ${msg.payment_entry} recorded`
          + (msg.allocated_amount ? ` · Allocated ${Number(msg.allocated_amount).toFixed(2)}` : '')
          + (unapplied > 0.005 ? ` · Advance ${unapplied.toFixed(2)}` : ''),
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
                  placeholder="Search party or short code"
                  creatable
                  onCreateNew={(q) => { void handleCreateParty(q); }}
                />
              </div>

              {isInvoice && (
                <>
                  <ItemLineEntry
                    lines={lines}
                    onChange={(next) => {
                      setLines(next);
                      const total = next.reduce(
                        (sum, line) => sum + (Number(line.qty) || 0) * (Number(line.rate) || 0),
                        0,
                      );
                      if (cashNow && !paymentAmount) {
                        setPaymentAmount(total > 0 ? String(total) : '');
                      }
                    }}
                    priceContext={entryType}
                  />
                  <div className="space-y-2 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                      <input
                        type="radio"
                        checked={cashNow}
                        onChange={() => {
                          setCashNow(true);
                          if (!paymentAmount && invoiceTotal > 0) {
                            setPaymentAmount(String(invoiceTotal));
                          }
                        }}
                        className="text-brand-600"
                      />
                      Cash now (record payment on post)
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
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        <div>
                          <span className="mb-1 block text-xs text-gray-500">
                            Payment amount {invoiceTotal > 0 ? `(invoice ${invoiceTotal.toFixed(2)})` : ''}
                          </span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="input-field"
                            placeholder={invoiceTotal > 0 ? String(invoiceTotal) : 'Full or partial'}
                          />
                        </div>
                        <SearchableSelect
                          value={modeOfPayment}
                          onChange={setModeOfPayment}
                          options={paymentModeOptions}
                          placeholder="Mode of payment"
                        />
                        <SearchableSelect
                          value={settlementAccount}
                          onChange={setSettlementAccount}
                          options={settlementAccountOptions}
                          placeholder="Settlement account"
                        />
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
                      onChange={(e) => {
                        setAmount(e.target.value);
                        const next = parseFloat(e.target.value) || 0;
                        if (openInvoices.length > 0) {
                          setAllocations(buildFifoAllocations(openInvoices, next));
                        }
                      }}
                      className="input-field"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                        Mode
                      </span>
                      <SearchableSelect
                        value={modeOfPayment}
                        onChange={setModeOfPayment}
                        options={paymentModeOptions}
                        placeholder="Mode of payment"
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                        Account
                      </span>
                      <SearchableSelect
                        value={settlementAccount}
                        onChange={setSettlementAccount}
                        options={settlementAccountOptions}
                        placeholder="Settlement account"
                      />
                    </div>
                  </div>
                  {party && (
                    <PaymentAllocationPanel
                      invoices={openInvoices}
                      amount={payAmount}
                      allocations={allocations}
                      onChange={setAllocations}
                      loading={loadingInvoices}
                    />
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

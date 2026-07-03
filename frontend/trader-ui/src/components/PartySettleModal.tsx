import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { daybookApi, financeApi } from '../lib/api';
import PaymentAllocationPanel, {
  type InvoiceAllocation,
  buildFifoAllocations,
} from './PaymentAllocationPanel';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtAmt(n: number) {
  return new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export type PartySettleModalProps = {
  partyType: 'Customer' | 'Supplier';
  party: string;
  partyName: string;
  balance: number;
  /** receive = AR (emerald), pay = AP (rose) */
  variant: 'receive' | 'pay';
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export default function PartySettleModal({
  partyType,
  party,
  partyName,
  balance,
  variant,
  onClose,
  onSuccess,
}: PartySettleModalProps) {
  const isReceive = variant === 'receive';
  const outstandingClass = isReceive
    ? 'text-emerald-600'
    : 'text-rose-600';

  const [amount, setAmount] = useState(String(balance));
  const [postingDate, setPostingDate] = useState(todayStr());
  const [modeOfPayment, setModeOfPayment] = useState('Cash');
  const [settlementAccount, setSettlementAccount] = useState('');
  const [paymentModes, setPaymentModes] = useState<{ name: string }[]>([]);
  const [settlementAccounts, setSettlementAccounts] = useState<
    { name: string; account_name?: string; account_type?: string }[]
  >([]);
  const [modeAccounts, setModeAccounts] = useState<Record<string, string>>({});
  const [invoices, setInvoices] = useState<any[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([]);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settlementAccountOptions = useMemo(
    () => settlementAccounts.map((a) => ({
      label: `${a.account_type === 'Bank' ? 'Bank' : 'Cash'}: ${a.account_name || a.name}`,
      value: a.name,
    })),
    [settlementAccounts],
  );

  useEffect(() => {
    setLoadingSetup(true);
    financeApi.getPaymentEntrySetup()
      .then((res) => {
        const payMsg = res.data.message || {};
        const modes = payMsg.modes || [];
        const accounts = payMsg.settlement_accounts || [];
        setPaymentModes(modes);
        setSettlementAccounts(accounts);
        setModeAccounts(payMsg.mode_accounts || {});
        const defaultMode = modes.find((m: { name: string }) => m.name === 'Cash')?.name
          || modes[0]?.name
          || 'Cash';
        setModeOfPayment(defaultMode);
        const defaultAccount = (isReceive
          ? payMsg.defaults?.receive_account
          : payMsg.defaults?.pay_account)
          || payMsg.defaults?.cash_account
          || accounts[0]?.name
          || '';
        setSettlementAccount(defaultAccount);
      })
      .catch(() => setError('Could not load payment setup.'))
      .finally(() => setLoadingSetup(false));
  }, [isReceive]);

  useEffect(() => {
    const mapped = modeAccounts[modeOfPayment];
    if (mapped) setSettlementAccount(mapped);
  }, [modeOfPayment, modeAccounts]);

  useEffect(() => {
    setLoadingInvoices(true);
    daybookApi.getPartyOpenInvoices({ party_type: partyType, party })
      .then((res) => {
        const msg = res.data.message as any;
        const rows = msg?.invoices || [];
        setInvoices(rows);
        setOpeningBalance(Number(msg?.opening_balance) || 0);
        setAllocations(buildFifoAllocations(rows, balance));
      })
      .catch(() => {
        setInvoices([]);
        setOpeningBalance(0);
        setAllocations([]);
      })
      .finally(() => setLoadingInvoices(false));
  }, [party, partyType, balance]);

  const payAmount = parseFloat(amount) || 0;

  const handleAmountChange = (next: string) => {
    setAmount(next);
    const amt = parseFloat(next) || 0;
    if (invoices.length > 0) {
      setAllocations(buildFifoAllocations(invoices, amt));
    }
  };

  const handleSubmit = async () => {
    if (payAmount <= 0) {
      setError('Enter a positive amount.');
      return;
    }
    const totalAllocated = allocations.reduce(
      (sum, row) => sum + (Number(row.allocated_amount) || 0),
      0,
    );
    if (totalAllocated > payAmount + 0.005) {
      setError('Allocated total exceeds payment amount.');
      return;
    }
    const activeAllocations = allocations
      .filter((row) => Number(row.allocated_amount) > 0)
      .map((row) => ({
        reference_name: row.reference_name,
        allocated_amount: Number(row.allocated_amount),
      }));

    setSaving(true);
    setError(null);
    try {
      await daybookApi.settleParty({
        party_type: partyType,
        party,
        amount: payAmount,
        mode_of_payment: modeOfPayment,
        settlement_account: settlementAccount || undefined,
        posting_date: postingDate,
        allocations: invoices.length > 0 ? activeAllocations : undefined,
      });
      const verb = isReceive ? 'received from' : 'made to';
      onSuccess(`Payment of ${fmtAmt(payAmount)} ${verb} ${partyName}.`);
    } catch (err: any) {
      setError(err?.response?.data?.exception || 'Failed to settle.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Settle — {partyName}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Outstanding:{' '}
          <span className={`font-bold ${outstandingClass}`}>{fmtAmt(balance)}</span>
          {openingBalance > 0 && (
            <span className="block text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              incl. opening balance {fmtAmt(openingBalance)}
            </span>
          )}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-gray-500">Posting date</span>
            <input
              type="date"
              value={postingDate}
              onChange={(e) => setPostingDate(e.target.value)}
              className="input-field text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-500">Amount</span>
            <input
              type="number"
              value={amount}
              min={0}
              max={balance}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="input-field text-sm"
              placeholder="Amount"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-gray-500">Mode of payment</span>
            <select
              value={modeOfPayment}
              onChange={(e) => setModeOfPayment(e.target.value)}
              className="input-field text-sm"
              disabled={loadingSetup}
            >
              {paymentModes.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-gray-500">Settlement account</span>
            <select
              value={settlementAccount}
              onChange={(e) => setSettlementAccount(e.target.value)}
              className="input-field text-sm"
              disabled={loadingSetup}
            >
              {settlementAccountOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        <PaymentAllocationPanel
          invoices={invoices}
          amount={payAmount}
          allocations={allocations}
          onChange={setAllocations}
          loading={loadingInvoices}
        />

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 btn-secondary text-sm py-2">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || loadingSetup}
            className="flex-1 btn-primary text-sm py-2 disabled:opacity-60"
          >
            {saving ? 'Posting…' : 'Post Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

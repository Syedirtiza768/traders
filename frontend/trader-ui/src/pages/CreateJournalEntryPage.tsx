import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { financeApi } from '../lib/api';
import { appendPreservedListQuery, formatCurrency } from '../lib/utils';
import SearchableSelect from '../components/SearchableSelect';

type AccountLine = {
  account: string;
  debit: number;
  credit: number;
  user_remark?: string;
};

type SelectableAccount = {
  name: string;
  account_name?: string;
  account_number?: string;
  account_type?: string;
  root_type?: string;
};

type JournalTemplateKey = 'cash-receipt' | 'supplier-payment' | 'expense-payment';

const EMPTY_LINE: AccountLine = { account: '', debit: 0, credit: 0, user_remark: '' };
const VOUCHER_TYPES = ['Journal Entry', 'Bank Entry', 'Cash Entry', 'Credit Note', 'Debit Note'];
const JOURNAL_TEMPLATES: Array<{ key: JournalTemplateKey; label: string; description: string; voucherType: string }> = [
  {
    key: 'cash-receipt',
    label: 'Cash Receipt',
    description: 'Debit cash/bank and credit receivable or income.',
    voucherType: 'Cash Entry',
  },
  {
    key: 'supplier-payment',
    label: 'Supplier Payment',
    description: 'Credit cash/bank and debit payable or expense.',
    voucherType: 'Bank Entry',
  },
  {
    key: 'expense-payment',
    label: 'Expense Payment',
    description: 'Debit expense and credit cash/bank for direct spends.',
    voucherType: 'Cash Entry',
  },
];

export default function CreateJournalEntryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [voucherType, setVoucherType] = useState('Journal Entry');
  const [postingDate, setPostingDate] = useState(today());
  const [remark, setRemark] = useState('');
  const [accounts, setAccounts] = useState<SelectableAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [lines, setLines] = useState<AccountLine[]>([
    { ...EMPTY_LINE },
    { ...EMPTY_LINE },
  ]);
  const [activeTemplate, setActiveTemplate] = useState<JournalTemplateKey | null>(null);
  const [syncPairedAmounts, setSyncPairedAmounts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listSearch = searchParams.get('list');
  const backToPath = listSearch ? `/finance/journals?${listSearch}` : '/finance/journals';

  const totalDebit = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0),
    [lines],
  );
  const totalCredit = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0),
    [lines],
  );
  const difference = totalDebit - totalCredit;
  const activeTemplateInfo = JOURNAL_TEMPLATES.find((template) => template.key === activeTemplate) || null;

  useEffect(() => {
    const loadAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const response = await financeApi.getAccounts({ limit: 200 });
        setAccounts(response.data.message || []);
      } catch (err) {
        console.error('Failed to load chart of accounts:', err);
        setError('Could not load accounts for journal entry creation.');
      } finally {
        setLoadingAccounts(false);
      }
    };

    void loadAccounts();
  }, []);

  const updateLine = (index: number, patch: Partial<AccountLine>) => {
    setLines((current) => {
      const next = current.map((line, i) => (i === index ? { ...line, ...patch } : line));

      if (syncPairedAmounts && next.length === 2) {
        const updated = next[index];
        const pairedIndex = index === 0 ? 1 : 0;
        const debit = Number(updated.debit) || 0;
        const credit = Number(updated.credit) || 0;

        if (debit > 0 && credit <= 0) {
          next[pairedIndex] = { ...next[pairedIndex], debit: 0, credit: debit };
        } else if (credit > 0 && debit <= 0) {
          next[pairedIndex] = { ...next[pairedIndex], debit: credit, credit: 0 };
        }
      }

      return next;
    });
  };

  const applyTemplate = (templateKey: JournalTemplateKey) => {
    const template = buildTemplate(templateKey, accounts, remark);
    setVoucherType(template.voucherType);
    setLines(template.lines);
    setActiveTemplate(templateKey);
    setSyncPairedAmounts(true);
    setError(null);
  };

  const addLine = () => {
    setActiveTemplate(null);
    setSyncPairedAmounts(false);
    setLines((current) => [...current, { ...EMPTY_LINE, user_remark: remark }]);
  };

  const removeLine = (index: number) => {
    setLines((current) => {
      const next = current.length > 2 ? current.filter((_, i) => i !== index) : current;
      if (next.length !== 2) {
        setActiveTemplate(null);
        setSyncPairedAmounts(false);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const validLines = lines.filter((line) => line.account && ((Number(line.debit) || 0) > 0 || (Number(line.credit) || 0) > 0));

    if (validLines.length < 2) {
      setError('Add at least two balanced account lines.');
      return;
    }

    if (Math.abs(difference) > 0.005) {
      setError('Total debit and total credit must be equal before saving.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await financeApi.createJournalEntry({
        voucher_type: voucherType,
        posting_date: postingDate,
        user_remark: remark,
        accounts: validLines,
      });
      const created = response.data.message;
  navigate(appendPreservedListQuery(`/finance/journals/${encodeURIComponent(created.name)}`, listSearch));
    } catch (err: any) {
      console.error('Failed to create journal entry:', err);
      setError(err?.response?.data?.exception || 'Could not create journal entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate(backToPath)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft size={16} /> Back to Journal Entries
          </button>
          <h1 className="page-title">New Journal Entry</h1>
          <p className="mt-1 text-gray-500">Create a balanced draft journal entry for adjustments, accruals, and manual ledger postings.</p>
        </div>
        <button onClick={handleSubmit} disabled={saving || loadingAccounts} className="btn-primary flex items-center gap-2 disabled:opacity-60">
          <Save size={14} /> {saving ? 'Creating…' : 'Create Draft'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Voucher Type">
              <SearchableSelect
                value={voucherType}
                onChange={setVoucherType}
                options={VOUCHER_TYPES.map((t) => ({ label: t, value: t }))}
                placeholder="Select type"
              />
            </Field>
            <Field label="Posting Date">
              <input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} className="input-field" />
            </Field>
            <Field label="Remark">
              <input value={remark} onChange={(e) => setRemark(e.target.value)} className="input-field" placeholder="Optional entry remark" />
            </Field>
          </div>

          <div className="space-y-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Quick Start Templates</h2>
              <p className="text-sm text-gray-500">Prefill a balanced starter entry, then adjust accounts or amounts as needed.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {JOURNAL_TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => applyTemplate(template.key)}
                  disabled={loadingAccounts}
                  className={`rounded-xl border bg-white p-4 text-left transition hover:border-brand-300 hover:shadow-sm disabled:opacity-60 ${activeTemplate === template.key ? 'border-brand-300 ring-1 ring-brand-200' : 'border-gray-200'}`}
                >
                  <div className="text-sm font-semibold text-gray-900">{template.label}</div>
                  <div className="mt-1 text-xs leading-5 text-gray-500">{template.description}</div>
                </button>
              ))}
            </div>
            {activeTemplateInfo && (
              <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
                <div className="font-medium">Active template: {activeTemplateInfo.label}</div>
                <div className="mt-1 text-brand-800">{getTemplateAmountHint(activeTemplateInfo.key)}</div>
              </div>
            )}
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={syncPairedAmounts}
                onChange={(e) => setSyncPairedAmounts(e.target.checked)}
                disabled={lines.length !== 2}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span>
                Sync paired amounts for two-line entries
                <span className="ml-2 text-xs text-gray-500">Mirror debit to credit or credit to debit automatically.</span>
              </span>
            </label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Account Lines</h2>
              <button onClick={addLine} className="btn-secondary flex items-center gap-2">
                <Plus size={14} /> Add Line
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[2fr_1fr_1fr_2fr_auto]">
                  <Field label="Account">
                    <div className="space-y-1">
                      <SearchableSelect
                        value={line.account}
                        onChange={(v) => updateLine(index, { account: v })}
                        options={accounts.map((account) => ({ label: formatAccountLabel(account), value: account.name }))}
                        placeholder="Select account"
                        disabled={loadingAccounts}
                      />
                      <p className="text-xs text-gray-500">
                        {line.account ? getLineHint(activeTemplate, index, accounts, line.account) : getEmptyLineHint(activeTemplate, index)}
                      </p>
                    </div>
                  </Field>
                  <Field label={getAmountLabel(activeTemplate, index, 'debit')}>
                    <input type="number" min={0} step="0.01" value={line.debit} onChange={(e) => updateLine(index, { debit: Number(e.target.value) })} className="input-field" />
                  </Field>
                  <Field label={getAmountLabel(activeTemplate, index, 'credit')}>
                    <input type="number" min={0} step="0.01" value={line.credit} onChange={(e) => updateLine(index, { credit: Number(e.target.value) })} className="input-field" />
                  </Field>
                  <Field label="Line Remark">
                    <input value={line.user_remark || ''} onChange={(e) => updateLine(index, { user_remark: e.target.value })} className="input-field" placeholder="Optional line remark" />
                  </Field>
                  <div className="flex items-end">
                    <button onClick={() => removeLine(index)} disabled={lines.length <= 2} className="rounded-lg border border-gray-200 p-3 text-gray-500 hover:text-red-600 disabled:opacity-40">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Balance Summary</h2>
          {activeTemplateInfo && <SummaryRow label="Template" value={activeTemplateInfo.label} />}
          <SummaryRow label="Voucher Type" value={voucherType} />
          <SummaryRow label="Posting Date" value={postingDate} />
          <SummaryRow label="Total Debit" value={formatCurrency(totalDebit)} />
          <SummaryRow label="Total Credit" value={formatCurrency(totalCredit)} />
          <SummaryRow label="Difference" value={formatCurrency(difference)} />
          <p className="text-xs leading-5 text-gray-500">
            This creates a draft Journal Entry only when the debit and credit totals balance.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatAccountLabel(account: SelectableAccount) {
  const name = account.account_name || account.name;
  const number = account.account_number ? `${account.account_number} · ` : '';
  return `${number}${name}`;
}

function getAccountMeta(accounts: SelectableAccount[], accountName: string) {
  const account = accounts.find((entry) => entry.name === accountName);
  if (!account) return 'Selected account';

  const type = account.account_type || 'Ledger';
  const root = account.root_type || 'Account';
  return `${root} · ${type}`;
}

function getTemplateAmountHint(templateKey: JournalTemplateKey) {
  switch (templateKey) {
    case 'cash-receipt':
      return 'Enter the receipt amount once. With sync enabled, the opposite side will mirror automatically.';
    case 'supplier-payment':
      return 'Enter the payment amount on either side. The paired payable/cash line will stay balanced.';
    case 'expense-payment':
      return 'Use one amount for the expense and cash/bank lines to keep the draft balanced quickly.';
    default:
      return 'Enter a balanced amount across both sides.';
  }
}

function getAmountLabel(templateKey: JournalTemplateKey | null, index: number, field: 'debit' | 'credit') {
  if (!templateKey) return field === 'debit' ? 'Debit' : 'Credit';

  const role = getTemplateRole(templateKey, index);
  return role && ((field === 'debit' && role.preferredSide === 'debit') || (field === 'credit' && role.preferredSide === 'credit'))
    ? `${field === 'debit' ? 'Debit' : 'Credit'} (${role.amountLabel})`
    : field === 'debit' ? 'Debit' : 'Credit';
}

function getEmptyLineHint(templateKey: JournalTemplateKey | null, index: number) {
  const role = templateKey ? getTemplateRole(templateKey, index) : null;
  return role ? `${role.label} · ${role.help}` : 'Choose a posted ledger account from the chart of accounts.';
}

function getLineHint(templateKey: JournalTemplateKey | null, index: number, accounts: SelectableAccount[], accountName: string) {
  const base = getAccountMeta(accounts, accountName);
  const role = templateKey ? getTemplateRole(templateKey, index) : null;
  return role ? `${role.label} · ${role.help} · ${base}` : base;
}

function getTemplateRole(templateKey: JournalTemplateKey, index: number) {
  const maps: Record<JournalTemplateKey, Array<{ label: string; help: string; preferredSide: 'debit' | 'credit'; amountLabel: string }>> = {
    'cash-receipt': [
      { label: 'Receipt account', help: 'Usually cash or bank receiving the funds.', preferredSide: 'debit', amountLabel: 'receipt amount' },
      { label: 'Offset account', help: 'Usually receivable or income being cleared.', preferredSide: 'credit', amountLabel: 'receipt amount' },
    ],
    'supplier-payment': [
      { label: 'Liability or expense', help: 'Usually payable or the cost being settled.', preferredSide: 'debit', amountLabel: 'payment amount' },
      { label: 'Payment account', help: 'Usually cash or bank funding the payment.', preferredSide: 'credit', amountLabel: 'payment amount' },
    ],
    'expense-payment': [
      { label: 'Expense account', help: 'Choose the expense being recognized.', preferredSide: 'debit', amountLabel: 'expense amount' },
      { label: 'Cash or bank account', help: 'Choose the account used to pay it.', preferredSide: 'credit', amountLabel: 'expense amount' },
    ],
  };

  return maps[templateKey][index] || null;
}

function buildTemplate(templateKey: JournalTemplateKey, accounts: SelectableAccount[], remark: string) {
  const cashOrBank = findAccount(accounts, (account) =>
    account.account_type === 'Cash' || account.account_type === 'Bank' || account.root_type === 'Asset',
  );
  const receivable = findAccount(accounts, (account) => account.account_type === 'Receivable');
  const payable = findAccount(accounts, (account) => account.account_type === 'Payable');
  const expense = findAccount(accounts, (account) => account.root_type === 'Expense');
  const income = findAccount(accounts, (account) => account.root_type === 'Income');

  if (templateKey === 'cash-receipt') {
    return {
      voucherType: 'Cash Entry',
      lines: [
        { account: cashOrBank?.name || '', debit: 0, credit: 0, user_remark: remark || 'Cash received' },
        { account: receivable?.name || income?.name || '', debit: 0, credit: 0, user_remark: remark || 'Against customer or income' },
      ],
    };
  }

  if (templateKey === 'supplier-payment') {
    return {
      voucherType: 'Bank Entry',
      lines: [
        { account: payable?.name || expense?.name || '', debit: 0, credit: 0, user_remark: remark || 'Against supplier payable' },
        { account: cashOrBank?.name || '', debit: 0, credit: 0, user_remark: remark || 'Payment account' },
      ],
    };
  }

  return {
    voucherType: 'Cash Entry',
    lines: [
      { account: expense?.name || '', debit: 0, credit: 0, user_remark: remark || 'Expense line' },
      { account: cashOrBank?.name || '', debit: 0, credit: 0, user_remark: remark || 'Cash or bank line' },
    ],
  };
}

function findAccount(accounts: SelectableAccount[], predicate: (account: SelectableAccount) => boolean) {
  return accounts.find(predicate);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
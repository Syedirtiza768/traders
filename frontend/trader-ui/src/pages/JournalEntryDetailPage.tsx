import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookText,
  Calendar,
  FileText,
  ReceiptText,
  Scale,
} from 'lucide-react';
import { financeApi } from '../lib/api';
import { classNames, extractFrappeError, formatCurrency, formatDate, getStatusColor } from '../lib/utils';

type JournalEntryDetail = Record<string, any>;

export default function JournalEntryDetailPage() {
  const navigate = useNavigate();
  const { journalId } = useParams();
  const [searchParams] = useSearchParams();
  const [entry, setEntry] = useState<JournalEntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!journalId) {
        setError('Journal entry not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setFeedback(null);

      try {
        const decodedId = decodeURIComponent(journalId);
        const response = await financeApi.getJournalEntryDetail(decodedId);
        setEntry(response.data.message);
      } catch (err) {
        console.error('Failed to load journal entry detail:', err);
        setError('Could not load journal entry details at the moment.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [journalId]);

  const reloadEntry = async () => {
    if (!journalId) return;

    const decodedId = decodeURIComponent(journalId);
    const response = await financeApi.getJournalEntryDetail(decodedId);
    setEntry(response.data.message);
  };

  const handleSubmitEntry = async () => {
    if (!entry?.name) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      await financeApi.submitJournalEntry(entry.name);
      await reloadEntry();
      setFeedback({ type: 'success', message: 'Journal entry submitted successfully.' });
    } catch (err) {
      console.error('Failed to submit journal entry:', err);
      setFeedback({ type: 'error', message: extractFrappeError(err, 'Could not submit this journal entry.') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEntry = async () => {
    if (!entry?.name) return;
    if (!window.confirm('Are you sure you want to cancel this journal entry? This action cannot be undone.')) return;

    setCancelling(true);
    setFeedback(null);
    try {
      await financeApi.cancelJournalEntry(entry.name);
      await reloadEntry();
      setFeedback({ type: 'success', message: 'Journal entry cancelled successfully.' });
    } catch (err) {
      console.error('Failed to cancel journal entry:', err);
      setFeedback({ type: 'error', message: extractFrappeError(err, 'Could not cancel this journal entry.') });
    } finally {
      setCancelling(false);
    }
  };

  const accountRows = useMemo(() => (Array.isArray(entry?.accounts) ? entry.accounts : []), [entry]);
  const statusLabel = entry?.docstatus === 0 ? 'Draft' : entry?.docstatus === 2 ? 'Cancelled' : 'Submitted';
  const listSearch = searchParams.get('list');
  const backToPath = listSearch ? `/finance/journals?${listSearch}` : '/finance/journals';

  if (loading) {
    return <div className="flex justify-center py-16"><div className="spinner" /></div>;
  }

  if (error || !entry) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(backToPath)} className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Journal Entries
        </button>
        <div className="card p-8 text-center text-gray-500">{error || 'Journal entry not found.'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button onClick={() => navigate(backToPath)} className="mb-3 inline-flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800">
            <ArrowLeft className="h-4 w-4" /> Back to Journal Entries
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{entry.name}</h1>
          <p className="mt-1 text-gray-500">Journal entry detail and ledger line review</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <span className={classNames('inline-flex rounded-full px-3 py-1 text-sm font-medium', getStatusColor(statusLabel))}>
            {statusLabel}
          </span>
          {entry.docstatus === 0 && (
            <button onClick={handleSubmitEntry} disabled={submitting} className="btn-primary disabled:opacity-60">
              {submitting ? 'Submitting…' : 'Submit Entry'}
            </button>
          )}
          {entry.docstatus === 1 && (
            <button onClick={handleCancelEntry} disabled={cancelling} className="btn-danger disabled:opacity-60">
              {cancelling ? 'Cancelling…' : 'Cancel Entry'}
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm ${feedback.type === 'success' ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailKPI icon={Scale} label="Total Debit" value={formatCurrency(entry.total_debit)} tone="green" />
        <DetailKPI icon={Scale} label="Total Credit" value={formatCurrency(entry.total_credit)} tone="blue" />
        <DetailKPI icon={BookText} label="Voucher Type" value={entry.voucher_type || 'Journal Entry'} tone="purple" />
        <DetailKPI icon={Calendar} label="Posting Date" value={formatDate(entry.posting_date)} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Entry Overview</h2>
            <p className="text-sm text-gray-500">Posting context and journal metadata</p>
          </div>
          <div className="card-body grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoRow icon={Calendar} label="Posting Date" value={formatDate(entry.posting_date)} />
            <InfoRow icon={BookText} label="Voucher Type" value={entry.voucher_type || 'Journal Entry'} />
            <InfoRow icon={FileText} label="Company" value={entry.company || '—'} />
            <InfoRow icon={ReceiptText} label="Remark" value={entry.user_remark || '—'} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Balance Summary</h2>
            <p className="text-sm text-gray-500">Entry totals from the journal</p>
          </div>
          <div className="card-body space-y-4">
            <SummaryLine label="Total Debit" value={formatCurrency(entry.total_debit)} />
            <SummaryLine label="Total Credit" value={formatCurrency(entry.total_credit)} />
            <SummaryLine label="Difference" value={formatCurrency((entry.total_debit || 0) - (entry.total_credit || 0))} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Account Lines</h2>
          <p className="text-sm text-gray-500">Accounts impacted by this journal entry</p>
        </div>
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Account</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Party</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Debit</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase text-gray-500">Credit</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accountRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">No account lines found.</td>
                </tr>
              ) : (
                accountRows.map((line, index) => (
                  <tr key={`${line.account || 'account'}-${index}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{line.account || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{line.party || '—'}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">{formatCurrency(line.debit_in_account_currency || line.debit)}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">{formatCurrency(line.credit_in_account_currency || line.credit)}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{line.user_remark || line.reference_name || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DetailKPI({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: 'blue' | 'green' | 'purple' | 'amber' }) {
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  } as const;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="break-words text-sm text-gray-900">{value}</div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
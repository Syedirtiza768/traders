import { useCallback, useEffect, useState } from 'react';
import { approvalsApi } from '../lib/api';
import { extractFrappeError } from '../lib/utils';
import { AlertBanner } from './ui';

interface ApprovalStatus {
  docstatus: number;
  required: boolean;
  approved: boolean;
  reason: string;
  is_approver: boolean;
}

interface ApprovalPanelProps {
  doctype: 'Quotation' | 'Purchase Order' | 'Payment Entry' | 'Purchase Invoice';
  name: string;
}

/**
 * Shows whether a draft is above its approval limit and needs an approver's record before it can be submitted.
 * An approver (Trader Admin or Trader Finance Manager) records the approval here; the submit action then works.
 */
export default function ApprovalPanel({ doctype, name }: ApprovalPanelProps) {
  const [status, setStatus] = useState<ApprovalStatus | null>(null);
  const [reason, setReason] = useState('Reviewed and approved');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await approvalsApi.getStatus(doctype, name);
      setStatus(response.data.message);
    } catch {
      setStatus(null);
    }
  }, [doctype, name]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!status || status.docstatus !== 0 || !status.required) return null;

  const record = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await approvalsApi.approve(doctype, name, reason.trim() || 'Approved');
      setMessage('Approval recorded. The document can now be submitted.');
      await refresh();
    } catch (err) {
      setError(extractFrappeError(err, 'Could not record the approval.'));
    } finally {
      setBusy(false);
    }
  };

  if (status.approved) {
    return <AlertBanner tone="success">Approval recorded for this draft. It can be submitted.</AlertBanner>;
  }

  return (
    <div className="space-y-3">
      <AlertBanner tone="warning">
        Approval needed before submission: {status.reason}. The draft cannot be submitted until an approver records the
        approval.
      </AlertBanner>
      {message && <AlertBanner tone="success">{message}</AlertBanner>}
      {error && <AlertBanner tone="error">{error}</AlertBanner>}
      {status.is_approver && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <input
            className="input-field min-w-[16rem] flex-1"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason for the approval"
          />
          <button type="button" className="btn-primary" onClick={() => void record()} disabled={busy}>
            {busy ? 'Recording...' : 'Record approval'}
          </button>
        </div>
      )}
    </div>
  );
}

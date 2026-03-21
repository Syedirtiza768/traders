/**
 * Trader App — Utility Functions
 *
 * Shared helpers for formatting, dates, colours, etc.
 */

// ─── Currency ────────────────────────────────────────────────────

export function formatCurrency(value: number | undefined | null, currency = 'PKR'): string {
  if (value == null) return `${currency} 0`;
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompact(value: number | undefined | null): string {
  if (value == null) return '0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

export function formatNumber(value: number | undefined | null): string {
  if (value == null) return '0';
  return value.toLocaleString('en-PK');
}

// ─── Dates ───────────────────────────────────────────────────────

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Status Colours ──────────────────────────────────────────────

export function getStatusColor(status: string | undefined): string {
  switch (status?.toLowerCase()) {
    case 'paid':
    case 'completed':
    case 'submitted':
      return 'bg-green-100 text-green-800';
    case 'unpaid':
    case 'overdue':
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'partly paid':
    case 'partially paid':
      return 'bg-yellow-100 text-yellow-800';
    case 'draft':
      return 'bg-gray-100 text-gray-700';
    case 'pending':
    case 'to deliver and bill':
    case 'to bill':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

// ─── Misc ────────────────────────────────────────────────────────

export function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms = 300): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

// ─── Navigation Helpers ──────────────────────────────────────────

/**
 * Append a `?list=<listSearch>` param to a path so detail pages can
 * navigate back to the originating list view with filters intact.
 */
export function appendPreservedListQuery(path: string, listSearch: string | null | undefined): string {
  if (!listSearch) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}list=${encodeURIComponent(listSearch)}`;
}

/** Check whether a list-search string represents an Operations context. */
export function isOperationsContext(listSearch: string | null | undefined): boolean {
  return Boolean(listSearch && listSearch.includes('ctx=operations'));
}

/** Check whether a list-search string represents a Report context. */
export function isReportContext(listSearch: string | null | undefined): boolean {
  return Boolean(listSearch && listSearch.includes('ctx=report'));
}

/** Check whether a list-search string represents a filter-list (party detail) context. */
export function isFilterListContext(listSearch: string | null | undefined): boolean {
  return Boolean(listSearch && listSearch.includes('ctx=filter'));
}

/** Check whether a list-search string represents a workflow context. */
export function isWorkflowContext(listSearch: string | null | undefined): boolean {
  return Boolean(listSearch && listSearch.includes('ctx=workflow'));
}

// ─── Error Extraction ────────────────────────────────────────────

/**
 * Pull a human-readable error message from a Frappe API error response,
 * falling back to a provided default string.
 */
export function extractFrappeError(err: any, fallback = 'An unexpected error occurred.'): string {
  const exc = err?.response?.data?.exception
    || err?.response?.data?._server_messages
    || err?.message;
  if (typeof exc === 'string') {
    try {
      const parsed = JSON.parse(exc);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const inner = JSON.parse(parsed[0]);
        return inner?.message || fallback;
      }
    } catch {
      // not JSON — return the string as-is
      return exc;
    }
  }
  return fallback;
}

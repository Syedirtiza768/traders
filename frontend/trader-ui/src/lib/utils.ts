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

export function toCsv(rows: Array<Record<string, any>>): string {
  if (!rows.length) {
    return '';
  }

  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  const escapeCell = (value: any) => {
    const text = value == null ? '' : String(value);
    if (/[,"\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(',')),
  ].join('\n');
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function parseListContext(listSearch: string | null | undefined): URLSearchParams | null {
  if (!listSearch) return null;
  return new URLSearchParams(listSearch);
}

export function isReportContext(listSearch: string | null | undefined): boolean {
  const parsed = parseListContext(listSearch);
  if (!parsed) return false;
  return parsed.has('tab') || parsed.has('receivableSearch') || parsed.has('payableSearch');
}

export function isFilterListContext(listSearch: string | null | undefined): boolean {
  const parsed = parseListContext(listSearch);
  if (!parsed) return false;
  return parsed.has('group') || parsed.has('search');
}

export function isWorkflowContext(listSearch: string | null | undefined): boolean {
  const parsed = parseListContext(listSearch);
  if (!parsed) return false;
  return parsed.has('workflow');
}

export function isOperationsContext(listSearch: string | null | undefined): boolean {
  const parsed = parseListContext(listSearch);
  if (!parsed) return false;
  return parsed.has('module') || parsed.has('openOnly');
}

export function buildPreservedListQuery(listSearch: string | null | undefined, key = 'list'): string {
  if (!listSearch) return '';
  return `?${key}=${encodeURIComponent(listSearch)}`;
}

export function appendPreservedListQuery(path: string, listSearch: string | null | undefined, key = 'list'): string {
  if (!listSearch) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${key}=${encodeURIComponent(listSearch)}`;
}

import { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatNumber, formatDate } from '../../lib/utils';

export type ColDef = {
  key: string;
  label: string;
  format?: 'currency' | 'number' | 'percent' | 'date' | 'text';
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  width?: string;
  /** If true, this column is shown in the mobile card header (first row). Max 2 recommended. */
  primary?: boolean;
};

type Props = {
  columns: ColDef[];
  data: any[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onRowClick?: (row: any) => void;
  loading?: boolean;
};

function formatCell(value: any, format?: ColDef['format']) {
  if (value == null) return '—';
  switch (format) {
    case 'currency': return formatCurrency(value);
    case 'number': return formatNumber(value);
    case 'percent': return `${Number(value).toFixed(1)}%`;
    case 'date': return formatDate(value);
    default: return String(value);
  }
}

export default function ReportTable({ columns, data, page, pageSize, total, onPageChange, onRowClick, loading }: Props) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }, [sortKey]);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Determine primary columns for the mobile card header
  const primaryCols = columns.filter(c => c.primary);
  const detailCols = primaryCols.length > 0 ? columns.filter(c => !c.primary) : columns.slice(2);
  const headerCols = primaryCols.length > 0 ? primaryCols : columns.slice(0, 2);

  return (
    <div className="card overflow-hidden">
      {/* ── Desktop table ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-semibold text-gray-600 whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.sortable !== false ? 'cursor-pointer select-none hover:text-gray-900' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">No data</td></tr>
            ) : (
              sorted.map((row, idx) => (
                <tr key={idx} className={`${onRowClick ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50'}`}
                    onClick={() => onRowClick?.(row)}>
                  {columns.map((col) => (
                    <td key={col.key}
                        className={`px-4 py-2.5 whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                      {formatCell(row[col.key], col.format)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card list ── */}
      <div className="md:hidden divide-y divide-gray-100">
        {loading ? (
          <div className="px-4 py-12 text-center text-gray-400"><div className="spinner mx-auto" /></div>
        ) : sorted.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-400">No data</div>
        ) : (
          sorted.map((row, idx) => (
            <div
              key={idx}
              className={`px-4 py-3 space-y-1.5 ${onRowClick ? 'cursor-pointer active:bg-gray-50' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {/* Header row: primary columns side by side */}
              <div className="flex items-center justify-between">
                {headerCols.map((col) => (
                  <span key={col.key} className={`text-sm font-medium ${col.align === 'right' ? 'text-right' : ''} ${col.format === 'currency' ? 'text-gray-900' : 'text-brand-700'}`}>
                    {formatCell(row[col.key], col.format)}
                  </span>
                ))}
              </div>
              {/* Detail rows */}
              {detailCols.map((col) => (
                <div key={col.key} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{col.label}</span>
                  <span className={`font-medium ${col.format === 'currency' ? 'text-gray-900' : 'text-gray-700'}`}>
                    {formatCell(row[col.key], col.format)}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-xs sm:text-sm text-gray-600">
        <span>
          {data.length === 0 ? '0 results' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="px-2">{page}/{totalPages}</span>
          <button
            disabled={page >= totalPages}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

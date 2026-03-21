import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ReportDef } from '../../lib/reportDefinitions';
import ReportFiltersBar from './ReportFiltersBar';
import ReportKpiStrip from './ReportKpiStrip';
import ReportChartPanel from './ReportChartPanel';
import ReportTable from './ReportTable';
import { toCsv, downloadTextFile } from '../../lib/utils';

type Props = {
  report: ReportDef;
};

export default function ReportView({ report }: Props) {
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    report.filters.forEach((f) => { defaults[f.key] = f.defaultValue ?? ''; });
    return defaults;
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { page, page_size: 50 };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await report.fetch(params);
      setData(res.data.message);
    } catch (err: any) {
      setData(null);
      const msg = err?.response?.data?._server_messages
        ? JSON.parse(JSON.parse(err.response.data._server_messages)[0])?.message
        : err?.message || 'Failed to load report';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [report, filters, page]);

  useEffect(() => { load(); }, [load]);

  // Reset page & filters when switching reports
  useEffect(() => {
    setPage(1);
    const defaults: Record<string, string> = {};
    report.filters.forEach((f) => { defaults[f.key] = f.defaultValue ?? ''; });
    setFilters(defaults);
  }, [report.id]);

  const handleFiltersChange = (vals: Record<string, string>) => {
    setFilters(vals);
    setPage(1);
  };

  const handleExport = () => {
    if (!data) return;
    const rows = resolve(data, report.dataPath ?? 'data') ?? [];
    if (!rows.length) return;
    const csv = toCsv(rows, report.columns.map((c) => c.key));
    downloadTextFile(`${report.id}.csv`, csv, 'text/csv;charset=utf-8');
  };

  const kpis = data ? report.kpis(data) : [];
  const tableData = resolve(data, report.dataPath ?? 'data') ?? [];
  const total = resolve(data, report.totalPath ?? 'total') ?? tableData.length;
  const chartData = report.chart
    ? resolve(data, report.chart.dataPath ?? 'chart') ?? []
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">{report.title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{report.description}</p>
      </div>

      {/* Filters */}
      {report.filters.length > 0 && (
        <ReportFiltersBar filters={report.filters} values={filters} onChange={handleFiltersChange} onExport={handleExport} />
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={load} className="px-4 py-1.5 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700">
            Retry
          </button>
        </div>
      )}

      {/* KPIs */}
      {!error && kpis.length > 0 && <ReportKpiStrip items={kpis} />}

      {/* Chart */}
      {!error && report.chart && chartData.length > 0 && (
        <ReportChartPanel
          type={report.chart.type}
          data={chartData}
          xKey={report.chart.xKey}
          bars={report.chart.bars}
          title={report.chart.title}
        />
      )}

      {/* Table */}
      {!error && (
        <ReportTable
          columns={report.columns}
          data={tableData}
          page={page}
          pageSize={50}
          total={total}
          onPageChange={setPage}
          loading={loading}
        />
      )}
    </div>
  );
}

/** Resolve a dotted path like 'summary.total' on an object */
function resolve(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

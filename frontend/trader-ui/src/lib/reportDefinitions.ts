/**
 * Report definitions registry.
 *
 * Each entry describes one report: its API method, filters, KPI strip,
 * chart config, and table columns. The generic ReportView component
 * renders any report from its definition.
 */
import type { FilterDef } from '../components/reports/ReportFiltersBar';
import type { ColDef } from '../components/reports/ReportTable';
import type { KpiItem } from '../components/reports/ReportKpiStrip';
import { reportsApi } from './api';

// ─── Types ───────────────────────────────────────────────────────

export type ReportCategory = 'sales' | 'purchasing' | 'inventory' | 'finance';

export type ChartConfig = {
  type: 'bar' | 'stacked-bar' | 'line' | 'pie' | 'horizontal-bar';
  xKey: string;
  bars?: { dataKey: string; name: string; color?: string }[];
  title?: string;
  /** path in response.message to chart data; defaults to 'chart' */
  dataPath?: string;
};

export type ReportDef = {
  id: string;
  category: ReportCategory;
  title: string;
  description: string;
  fetch: (params: Record<string, any>) => Promise<any>;
  filters: FilterDef[];
  /** Build KPI items from the API response.message */
  kpis: (msg: any) => KpiItem[];
  chart?: ChartConfig;
  columns: ColDef[];
  /** Path inside response.message that holds the table rows; defaults to 'data' */
  dataPath?: string;
  /** Path inside response.message that holds total count; defaults to 'total' */
  totalPath?: string;
};

// ─── Helper to build date filters shared across most reports ─────

const fromDateFilter: FilterDef = { key: 'from_date', label: 'From', type: 'date' };
const toDateFilter: FilterDef = { key: 'to_date', label: 'To', type: 'date' };

function groupByFilter(options: string[]): FilterDef {
  return {
    key: 'group_by',
    label: 'Group By',
    type: 'select',
    options: options.map((o) => ({ label: o.charAt(0).toUpperCase() + o.slice(1).replace(/_/g, ' '), value: o })),
    defaultValue: options[0],
  };
}

// ─── Report Definitions ──────────────────────────────────────────

export const REPORTS: ReportDef[] = [
  // ──── SALES ─────────────────────────────────────────────────────
  {
    id: 'sales-performance',
    category: 'sales',
    title: 'Sales Performance',
    description: 'Revenue, cost, gross profit breakdown by month, customer, item or salesperson',
    fetch: (p) => reportsApi.getSalesPerformanceReport(p),
    filters: [
      fromDateFilter, toDateFilter,
      groupByFilter(['month', 'customer', 'item', 'item_group', 'brand', 'sales_person']),
    ],
    kpis: (m) => [
      { label: 'Total Revenue', value: m.summary?.total_revenue, format: 'currency', color: 'text-green-700' },
      { label: 'Gross Profit', value: m.summary?.total_gp, format: 'currency', color: 'text-blue-700' },
      { label: 'Avg Margin', value: m.summary?.avg_margin, format: 'percent' },
      { label: 'Total Qty', value: m.summary?.total_qty, format: 'number' },
    ],
    chart: { type: 'bar', xKey: 'label', bars: [
      { dataKey: 'revenue', name: 'Revenue', color: '#2563eb' },
      { dataKey: 'gross_profit', name: 'Gross Profit', color: '#059669' },
    ], title: 'Revenue & Profit', dataPath: 'chart' },
    columns: [
      { key: 'label', label: 'Group', width: '200px' },
      { key: 'revenue', label: 'Revenue', format: 'currency', align: 'right' },
      { key: 'cost', label: 'Cost', format: 'currency', align: 'right' },
      { key: 'gross_profit', label: 'Gross Profit', format: 'currency', align: 'right' },
      { key: 'gp_margin', label: 'Margin %', format: 'percent', align: 'right' },
      { key: 'qty', label: 'Qty', format: 'number', align: 'right' },
      { key: 'avg_selling_price', label: 'Avg Price', format: 'currency', align: 'right' },
    ],
  },
  {
    id: 'customer-profitability',
    category: 'sales',
    title: 'Customer Profitability',
    description: 'Revenue, cost, GP margin and credit utilization per customer',
    fetch: (p) => reportsApi.getCustomerProfitabilityReport(p),
    filters: [fromDateFilter, toDateFilter],
    kpis: (m) => [
      { label: 'Customers', value: m.total, format: 'number' },
      { label: 'Total Revenue', value: m.data?.reduce((s: number, r: any) => s + (r.revenue || 0), 0), format: 'currency', color: 'text-green-700' },
    ],
    chart: { type: 'horizontal-bar', xKey: 'customer_name', bars: [
      { dataKey: 'revenue', name: 'Revenue', color: '#2563eb' },
      { dataKey: 'gross_profit', name: 'Gross Profit', color: '#059669' },
    ], title: 'Top Customers by Revenue', dataPath: 'data' },
    columns: [
      { key: 'customer_name', label: 'Customer', width: '200px' },
      { key: 'revenue', label: 'Revenue', format: 'currency', align: 'right' },
      { key: 'cost', label: 'Cost', format: 'currency', align: 'right' },
      { key: 'gross_profit', label: 'Gross Profit', format: 'currency', align: 'right' },
      { key: 'gp_margin', label: 'Margin %', format: 'percent', align: 'right' },
      { key: 'outstanding', label: 'Outstanding', format: 'currency', align: 'right' },
      { key: 'credit_utilization', label: 'Credit Util %', format: 'percent', align: 'right' },
    ],
  },
  {
    id: 'collection-efficiency',
    category: 'sales',
    title: 'Collection Efficiency',
    description: 'Billed vs collected amounts and efficiency percentage by month or customer',
    fetch: (p) => reportsApi.getCollectionEfficiencyReport(p),
    filters: [fromDateFilter, toDateFilter, groupByFilter(['month', 'customer'])],
    kpis: (m) => [
      { label: 'Total Billed', value: m.summary?.total_billed, format: 'currency' },
      { label: 'Total Collected', value: m.summary?.total_collected, format: 'currency', color: 'text-green-700' },
      { label: 'Efficiency', value: m.summary?.efficiency_pct, format: 'percent', color: 'text-blue-700' },
    ],
    chart: { type: 'bar', xKey: 'label', bars: [
      { dataKey: 'billed', name: 'Billed', color: '#2563eb' },
      { dataKey: 'collected', name: 'Collected', color: '#059669' },
    ], title: 'Billed vs Collected', dataPath: 'chart' },
    columns: [
      { key: 'label', label: 'Period / Customer', width: '200px' },
      { key: 'billed', label: 'Billed', format: 'currency', align: 'right' },
      { key: 'collected', label: 'Collected', format: 'currency', align: 'right' },
      { key: 'efficiency_pct', label: 'Efficiency %', format: 'percent', align: 'right' },
    ],
  },

  // ──── PURCHASING ────────────────────────────────────────────────
  {
    id: 'supplier-scorecard',
    category: 'purchasing',
    title: 'Supplier Scorecard',
    description: 'Purchase value, quantity, average rate, and outstanding per supplier',
    fetch: (p) => reportsApi.getSupplierScorecardReport(p),
    filters: [fromDateFilter, toDateFilter],
    kpis: (m) => [
      { label: 'Suppliers', value: m.total, format: 'number' },
      { label: 'Total Purchases', value: m.data?.reduce((s: number, r: any) => s + (r.purchase_value || 0), 0), format: 'currency', color: 'text-blue-700' },
    ],
    chart: { type: 'horizontal-bar', xKey: 'supplier_name', bars: [
      { dataKey: 'purchase_value', name: 'Purchase Value', color: '#059669' },
    ], title: 'Top Suppliers by Value', dataPath: 'data' },
    columns: [
      { key: 'supplier_name', label: 'Supplier', width: '200px' },
      { key: 'purchase_value', label: 'Value', format: 'currency', align: 'right' },
      { key: 'total_qty', label: 'Qty', format: 'number', align: 'right' },
      { key: 'avg_rate', label: 'Avg Rate', format: 'currency', align: 'right' },
      { key: 'outstanding', label: 'Outstanding', format: 'currency', align: 'right' },
    ],
  },
  {
    id: 'purchase-price-variance',
    category: 'purchasing',
    title: 'Purchase Price Variance',
    description: 'Min, max, avg rate and price spread per item/supplier',
    fetch: (p) => reportsApi.getPurchasePriceVarianceReport(p),
    filters: [fromDateFilter, toDateFilter],
    kpis: (m) => [
      { label: 'Items Tracked', value: m.total, format: 'number' },
    ],
    columns: [
      { key: 'item_name', label: 'Item' },
      { key: 'supplier_name', label: 'Supplier' },
      { key: 'total_qty', label: 'Qty', format: 'number', align: 'right' },
      { key: 'min_rate', label: 'Min Rate', format: 'currency', align: 'right' },
      { key: 'max_rate', label: 'Max Rate', format: 'currency', align: 'right' },
      { key: 'avg_rate', label: 'Avg Rate', format: 'currency', align: 'right' },
      { key: 'price_spread', label: 'Spread', format: 'currency', align: 'right' },
      { key: 'variance_pct', label: 'Variance %', format: 'percent', align: 'right' },
    ],
  },
  {
    id: 'open-purchase-orders',
    category: 'purchasing',
    title: 'Open Purchase Orders',
    description: 'Pending receipt items and overdue deliveries',
    fetch: (p) => reportsApi.getOpenPurchaseOrdersReport(p),
    filters: [fromDateFilter, toDateFilter],
    kpis: (m) => [
      { label: 'Open Items', value: m.total, format: 'number' },
      { label: 'Pending Value', value: m.summary?.pending_value, format: 'currency', color: 'text-orange-600' },
      { label: 'Overdue Items', value: m.summary?.overdue_count, format: 'number', color: 'text-red-600' },
    ],
    columns: [
      { key: 'purchase_order', label: 'PO #' },
      { key: 'supplier_name', label: 'Supplier' },
      { key: 'item_name', label: 'Item' },
      { key: 'qty', label: 'Ordered', format: 'number', align: 'right' },
      { key: 'received_qty', label: 'Received', format: 'number', align: 'right' },
      { key: 'pending_qty', label: 'Pending', format: 'number', align: 'right' },
      { key: 'pending_value', label: 'Pending Value', format: 'currency', align: 'right' },
      { key: 'required_date', label: 'Due', format: 'date' },
      { key: 'delay_days', label: 'Delay', format: 'number', align: 'right' },
    ],
  },

  // ──── INVENTORY ─────────────────────────────────────────────────
  {
    id: 'stock-aging',
    category: 'inventory',
    title: 'Stock Aging',
    description: 'Inventory value by age bucket (0-30, 31-60, 61-90, 91-180, 180+ days)',
    fetch: (p) => reportsApi.getStockAgingReport(p),
    filters: [{ key: 'warehouse', label: 'Warehouse', type: 'text' }],
    kpis: (m) => {
      const s = m.summary || {};
      return [
        { label: '0–30 Days', value: s['0-30'], format: 'currency' },
        { label: '31–60 Days', value: s['31-60'], format: 'currency' },
        { label: '61–90 Days', value: s['61-90'], format: 'currency', color: 'text-yellow-600' },
        { label: '91–180 Days', value: s['91-180'], format: 'currency', color: 'text-orange-600' },
        { label: '180+ Days', value: s['180+'], format: 'currency', color: 'text-red-600' },
        { label: 'Total Value', value: s.total_value, format: 'currency', color: 'text-gray-900' },
      ];
    },
    chart: { type: 'pie', xKey: 'bucket', bars: [{ dataKey: 'value', name: 'Value' }], title: 'Value by Age Bucket', dataPath: 'chart' },
    columns: [
      { key: 'item_name', label: 'Item' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'qty', label: 'Qty', format: 'number', align: 'right' },
      { key: 'valuation_rate', label: 'Rate', format: 'currency', align: 'right' },
      { key: 'stock_value', label: 'Value', format: 'currency', align: 'right' },
      { key: 'age_days', label: 'Age (Days)', format: 'number', align: 'right' },
      { key: 'age_bucket', label: 'Bucket' },
    ],
  },
  {
    id: 'inventory-movement',
    category: 'inventory',
    title: 'Inventory Movement',
    description: 'Fast, slow and non-moving item classification based on sales velocity',
    fetch: (p) => reportsApi.getInventoryMovementReport(p),
    filters: [{ key: 'warehouse', label: 'Warehouse', type: 'text' }, { key: 'classification', label: 'Class', type: 'select', options: [
      { label: 'Fast', value: 'fast' }, { label: 'Slow', value: 'slow' }, { label: 'Non-moving', value: 'non_moving' },
    ]}],
    kpis: (m) => {
      const s = m.summary || {};
      return [
        { label: 'Fast Moving', value: s.fast, format: 'number', color: 'text-green-600' },
        { label: 'Slow Moving', value: s.slow, format: 'number', color: 'text-yellow-600' },
        { label: 'Non-Moving', value: s.non_moving, format: 'number', color: 'text-red-600' },
        { label: 'Total Stock Value', value: s.total_stock_value, format: 'currency' },
      ];
    },
    chart: { type: 'pie', xKey: 'classification', bars: [{ dataKey: 'count', name: 'Items' }], title: 'Movement Classification', dataPath: 'chart' },
    columns: [
      { key: 'item_name', label: 'Item' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'actual_qty', label: 'Stock Qty', format: 'number', align: 'right' },
      { key: 'stock_value', label: 'Value', format: 'currency', align: 'right' },
      { key: 'sold_last_30', label: '30d Sales', format: 'number', align: 'right' },
      { key: 'sold_last_90', label: '90d Sales', format: 'number', align: 'right' },
      { key: 'classification', label: 'Class' },
    ],
  },
  {
    id: 'reorder',
    category: 'inventory',
    title: 'Reorder Report',
    description: 'Items at or below reorder level with suggested reorder quantities',
    fetch: (p) => reportsApi.getReorderReport(p),
    filters: [{ key: 'warehouse', label: 'Warehouse', type: 'text' }, { key: 'status', label: 'Status', type: 'select', options: [
      { label: 'Stockout', value: 'stockout' }, { label: 'Critical', value: 'critical' }, { label: 'Low', value: 'low' },
    ]}],
    kpis: (m) => {
      const s = m.summary || {};
      return [
        { label: 'Stockout', value: s.stockout, format: 'number', color: 'text-red-600' },
        { label: 'Critical', value: s.critical, format: 'number', color: 'text-orange-600' },
        { label: 'Low Stock', value: s.low, format: 'number', color: 'text-yellow-600' },
        { label: 'Healthy', value: s.healthy, format: 'number', color: 'text-green-600' },
      ];
    },
    columns: [
      { key: 'item_name', label: 'Item' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'actual_qty', label: 'On Hand', format: 'number', align: 'right' },
      { key: 'reorder_level', label: 'Reorder Lvl', format: 'number', align: 'right' },
      { key: 'reorder_qty', label: 'Reorder Qty', format: 'number', align: 'right' },
      { key: 'days_of_cover', label: 'Days Cover', format: 'number', align: 'right' },
      { key: 'avg_daily_sales', label: 'Avg Daily', format: 'number', align: 'right' },
      { key: 'suggested_reorder', label: 'Suggested', format: 'number', align: 'right' },
      { key: 'stock_status', label: 'Status' },
    ],
  },

  // ──── FINANCE ───────────────────────────────────────────────────
  {
    id: 'receivable-aging-detail',
    category: 'finance',
    title: 'Receivable Aging (Invoices)',
    description: 'Invoice-level accounts receivable aging with due-date buckets',
    fetch: (p) => reportsApi.getReceivableAgingInvoiceDetail(p),
    filters: [{ key: 'customer', label: 'Customer', type: 'text' }],
    kpis: (m) => {
      const s = m.summary || {};
      return [
        { label: '0–30 Days', value: s['0-30'], format: 'currency' },
        { label: '31–60 Days', value: s['31-60'], format: 'currency', color: 'text-yellow-600' },
        { label: '61–90 Days', value: s['61-90'], format: 'currency', color: 'text-orange-600' },
        { label: '90+ Days', value: s['90+'], format: 'currency', color: 'text-red-600' },
        { label: 'Total Outstanding', value: s.total, format: 'currency', color: 'text-red-700' },
      ];
    },
    columns: [
      { key: 'invoice', label: 'Invoice' },
      { key: 'customer_name', label: 'Customer' },
      { key: 'posting_date', label: 'Date', format: 'date' },
      { key: 'due_date', label: 'Due', format: 'date' },
      { key: 'grand_total', label: 'Total', format: 'currency', align: 'right' },
      { key: 'outstanding_amount', label: 'Outstanding', format: 'currency', align: 'right' },
      { key: 'age_days', label: 'Age', format: 'number', align: 'right' },
      { key: 'age_bucket', label: 'Bucket' },
    ],
  },
  {
    id: 'payable-aging-detail',
    category: 'finance',
    title: 'Payable Aging (Invoices)',
    description: 'Invoice-level accounts payable aging with due-date buckets',
    fetch: (p) => reportsApi.getPayableAgingInvoiceDetail(p),
    filters: [{ key: 'supplier', label: 'Supplier', type: 'text' }],
    kpis: (m) => {
      const s = m.summary || {};
      return [
        { label: '0–30 Days', value: s['0-30'], format: 'currency' },
        { label: '31–60 Days', value: s['31-60'], format: 'currency', color: 'text-yellow-600' },
        { label: '61–90 Days', value: s['61-90'], format: 'currency', color: 'text-orange-600' },
        { label: '90+ Days', value: s['90+'], format: 'currency', color: 'text-red-600' },
        { label: 'Total Payable', value: s.total, format: 'currency', color: 'text-orange-700' },
      ];
    },
    columns: [
      { key: 'invoice', label: 'Invoice' },
      { key: 'supplier_name', label: 'Supplier' },
      { key: 'posting_date', label: 'Date', format: 'date' },
      { key: 'due_date', label: 'Due', format: 'date' },
      { key: 'grand_total', label: 'Total', format: 'currency', align: 'right' },
      { key: 'outstanding_amount', label: 'Outstanding', format: 'currency', align: 'right' },
      { key: 'age_days', label: 'Age', format: 'number', align: 'right' },
      { key: 'age_bucket', label: 'Bucket' },
    ],
  },
  {
    id: 'tax-summary',
    category: 'finance',
    title: 'Tax Summary',
    description: 'Output tax (sales) vs input tax (purchases) with net tax payable',
    fetch: (p) => reportsApi.getTaxSummaryReport(p),
    filters: [fromDateFilter, toDateFilter],
    kpis: (m) => {
      const s = m.summary || {};
      return [
        { label: 'Output Tax', value: s.total_output_tax, format: 'currency', color: 'text-red-600' },
        { label: 'Input Tax', value: s.total_input_tax, format: 'currency', color: 'text-green-600' },
        { label: 'Net Tax Payable', value: s.net_tax_payable, format: 'currency', color: 'text-blue-700' },
      ];
    },
    chart: { type: 'bar', xKey: 'account_head', bars: [
      { dataKey: 'output_tax', name: 'Output Tax', color: '#dc2626' },
      { dataKey: 'input_tax', name: 'Input Tax', color: '#059669' },
    ], title: 'Tax by Account', dataPath: 'data' },
    columns: [
      { key: 'account_head', label: 'Tax Account' },
      { key: 'output_tax', label: 'Output Tax', format: 'currency', align: 'right' },
      { key: 'input_tax', label: 'Input Tax', format: 'currency', align: 'right' },
      { key: 'net_tax', label: 'Net Tax', format: 'currency', align: 'right' },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────

export function getReportById(id: string): ReportDef | undefined {
  return REPORTS.find((r) => r.id === id);
}

export function getReportsByCategory(category: ReportCategory): ReportDef[] {
  return REPORTS.filter((r) => r.category === category);
}

export const CATEGORIES: { key: ReportCategory; label: string; icon: string }[] = [
  { key: 'sales', label: 'Sales', icon: 'TrendingUp' },
  { key: 'purchasing', label: 'Purchasing', icon: 'ShoppingCart' },
  { key: 'inventory', label: 'Inventory', icon: 'Package' },
  { key: 'finance', label: 'Finance', icon: 'DollarSign' },
];

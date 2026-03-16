import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ClipboardList, CreditCard, Download, FilePlus2, FileText, HandCoins, Search, ShoppingCart, Wallet } from 'lucide-react';
import { dashboardApi } from '../lib/api';
import { appendPreservedListQuery, debounce, downloadTextFile, formatCompact, toCsv } from '../lib/utils';

type OperationsSummary = {
  quotations_awaiting_conversion: number;
  sales_orders_awaiting_invoice?: number;
  purchase_orders_awaiting_invoice?: number;
  sales_orders_with_unpaid_invoices: number;
  purchase_orders_with_unpaid_invoices: number;
};

type QueueCard = {
  key: string;
  title: string;
  description: string;
  value: number;
  icon: any;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  href: string;
  cta: string;
  secondaryAction?: {
    label: string;
    href: string;
  };
  module: 'Sales' | 'Purchases';
  queueType?: 'workflow' | 'approval';
};

export default function OperationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [summary, setSummary] = useState<OperationsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const moduleFilter = searchParams.get('module') || 'All';
  const onlyOpen = searchParams.get('openOnly') === '1';
  const approvalOnly = searchParams.get('approvalOnly') === '1';
  const search = searchParams.get('search') || '';
  const listSearch = searchParams.toString();

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    setSearchParams(nextParams);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await dashboardApi.getKPIs();
        setSummary(response.data.message || null);
      } catch (error) {
        console.error('Failed to load operations queues:', error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const buildQueuePath = (href: string) => appendPreservedListQuery(href, listSearch);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      updateSearchParams({ search: value || null });
    }, 300),
    [searchParams],
  );

  const cards = useMemo<QueueCard[]>(() => [
    {
      key: 'quotations-awaiting-conversion',
      title: 'Quotations Awaiting Conversion',
      description: 'Open quotations that have not yet converted into sales orders.',
      value: summary?.quotations_awaiting_conversion || 0,
      icon: FileText,
      color: 'purple',
      href: '/sales/quotations?workflow=awaiting-conversion',
      cta: 'Review quotations',
      secondaryAction: {
        label: 'New Sales Order',
        href: '/sales/orders/new',
      },
      module: 'Sales',
      queueType: 'workflow',
    },
    {
      key: 'sales-awaiting-invoice',
      title: 'Sales Orders Awaiting Invoice',
      description: 'Submitted sales orders that have not produced a downstream sales invoice yet.',
      value: summary?.sales_orders_awaiting_invoice || 0,
      icon: ShoppingCart,
      color: 'blue',
      href: '/sales/orders?workflow=awaiting-invoice',
      cta: 'Open sales orders',
      secondaryAction: {
        label: 'New Sales Invoice',
        href: '/sales/new',
      },
      module: 'Sales',
      queueType: 'workflow',
    },
    {
      key: 'sales-unpaid',
      title: 'Sales Orders With Unpaid Invoices',
      description: 'Orders with downstream sales invoices that still carry an outstanding balance.',
      value: summary?.sales_orders_with_unpaid_invoices || 0,
      icon: CreditCard,
      color: 'amber',
      href: '/sales/orders?workflow=unpaid-invoices',
      cta: 'Trace receivables',
      secondaryAction: {
        label: 'Record Customer Payment',
        href: '/finance/payments/new?paymentType=Receive&partyType=Customer',
      },
      module: 'Sales',
      queueType: 'workflow',
    },
    {
      key: 'sales-approvals',
      title: 'Sales Approvals & Exceptions',
      description: 'Review quotations and orders that need manager approval or exception handling before progressing.',
      value: (summary?.quotations_awaiting_conversion || 0) + (summary?.sales_orders_awaiting_invoice || 0),
      icon: FileText,
      color: 'purple',
      href: '/sales/orders?workflow=approval-review',
      cta: 'Open approval queue',
      secondaryAction: {
        label: 'Review return exceptions',
        href: '/sales?workflow=return-review&status=Paid',
      },
      module: 'Sales',
      queueType: 'approval',
    },
    {
      key: 'purchase-awaiting-invoice',
      title: 'Purchase Orders Awaiting Invoice',
      description: 'Submitted purchase orders that have not produced a supplier invoice yet.',
      value: summary?.purchase_orders_awaiting_invoice || 0,
      icon: ClipboardList,
      color: 'green',
      href: '/purchases/orders?workflow=awaiting-invoice',
      cta: 'Open purchase orders',
      secondaryAction: {
        label: 'New Purchase Invoice',
        href: '/purchases/new',
      },
      module: 'Purchases',
      queueType: 'workflow',
    },
    {
      key: 'purchase-unpaid',
      title: 'Purchase Orders With Unpaid Invoices',
      description: 'Orders with supplier invoices that still have unpaid balances downstream.',
      value: summary?.purchase_orders_with_unpaid_invoices || 0,
      icon: Wallet,
      color: 'red',
      href: '/purchases/orders?workflow=unpaid-invoices',
      cta: 'Trace payables',
      secondaryAction: {
        label: 'Record Supplier Payment',
        href: '/finance/payments/new?paymentType=Pay&partyType=Supplier',
      },
      module: 'Purchases',
      queueType: 'workflow',
    },
    {
      key: 'purchase-approvals',
      title: 'Purchase Approvals & Exceptions',
      description: 'Review submitted purchase orders and supplier invoice gaps that need approval or intervention.',
      value: (summary?.purchase_orders_awaiting_invoice || 0) + (summary?.purchase_orders_with_unpaid_invoices || 0),
      icon: ClipboardList,
      color: 'green',
      href: '/purchases/requisitions?workflow=approval-review',
      cta: 'Open approval queue',
      secondaryAction: {
        label: 'Review RFQs',
        href: '/purchases/rfqs?status=Draft',
      },
      module: 'Purchases',
      queueType: 'approval',
    },
  ], [summary]);

  const filteredCards = cards.filter((card) => {
    if (moduleFilter !== 'All' && card.module !== moduleFilter) {
      return false;
    }

    if (onlyOpen && card.value <= 0) {
      return false;
    }

    if (approvalOnly && card.queueType !== 'approval') {
      return false;
    }

    if (search) {
      const haystack = `${card.title} ${card.description} ${card.module}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  const grouped = {
    Sales: filteredCards.filter((card) => card.module === 'Sales'),
    Purchases: filteredCards.filter((card) => card.module === 'Purchases'),
  };

  const totalOpenQueues = cards.reduce((sum, card) => sum + card.value, 0);
  const hotQueues = cards.filter((card) => card.value > 0).length;

  const handleExport = () => {
    const content = toCsv(
      filteredCards.map((card) => ({
        module: card.module,
        queue: card.title,
        open_items: card.value,
        description: card.description,
        route: card.href,
      })),
    );

    downloadTextFile('operations-queues.csv', content || '');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Queues</h1>
          <p className="mt-1 text-gray-500">Shared controller view for the workflow hotspots already supported by current sales and purchasing data.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button onClick={handleExport} disabled={loading || filteredCards.length === 0} className="btn-secondary flex items-center gap-2 disabled:opacity-60">
            <Download className="h-4 w-4" /> Export Visible
          </button>
          <button onClick={() => navigate('/finance')} className="btn-secondary">Finance Overview</button>
          <button onClick={() => navigate('/reports')} className="btn-secondary">Reports</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Open Queue Items" value={formatCompact(totalOpenQueues)} tone="blue" />
        <SummaryCard label="Active Queue Buckets" value={hotQueues.toLocaleString()} tone="amber" />
        <SummaryCard label="Visible Queues" value={filteredCards.length.toLocaleString()} tone="green" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {['All', 'Sales', 'Purchases'].map((entry) => (
            <button
              key={entry}
              onClick={() => updateSearchParams({ module: entry === 'All' ? null : entry })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${moduleFilter === entry ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'bg-gray-100 text-gray-600 hover:text-gray-900'}`}
            >
              {entry}
            </button>
          ))}
          <button
            onClick={() => updateSearchParams({ openOnly: onlyOpen ? null : '1' })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${onlyOpen ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-600 hover:text-gray-900'}`}
          >
            Open only
          </button>
          <button
            onClick={() => updateSearchParams({ approvalOnly: approvalOnly ? null : '1' })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${approvalOnly ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-600 hover:text-gray-900'}`}
          >
            Approval focus
          </button>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            defaultValue={search}
            onChange={(e) => debouncedSearch(e.target.value)}
            placeholder="Search queues..."
            className="input-field pl-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        <button onClick={() => navigate(buildQueuePath('/sales/orders?workflow=awaiting-invoice'))} className="btn-secondary flex items-center justify-center gap-2">
          <ShoppingCart className="h-4 w-4" /> Review Sales Orders
        </button>
        <button onClick={() => navigate(buildQueuePath('/purchases/orders?workflow=awaiting-invoice'))} className="btn-secondary flex items-center justify-center gap-2">
          <ClipboardList className="h-4 w-4" /> Review Purchase Orders
        </button>
        <button onClick={() => navigate(buildQueuePath('/purchases/requisitions'))} className="btn-secondary flex items-center justify-center gap-2">
          <ClipboardList className="h-4 w-4" /> Review Requisitions
        </button>
        <button onClick={() => navigate(buildQueuePath('/sales/new'))} className="btn-secondary flex items-center justify-center gap-2">
          <FilePlus2 className="h-4 w-4" /> New Sales Invoice
        </button>
        <button onClick={() => navigate(buildQueuePath('/finance/payments/new?paymentType=Receive&partyType=Customer'))} className="btn-secondary flex items-center justify-center gap-2">
          <HandCoins className="h-4 w-4" /> Record Customer Payment
        </button>
        <button onClick={() => updateSearchParams({ approvalOnly: approvalOnly ? null : '1' })} className="btn-secondary flex items-center justify-center gap-2">
          <FileText className="h-4 w-4" /> {approvalOnly ? 'Show All Queues' : 'Approval Queues'}
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="spinner" />
        </div>
      ) : (
        <div className="space-y-8">
          {filteredCards.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
              No queues match the current filters.
            </div>
          )}
          {(['Sales', 'Purchases'] as const).map((module) => (
            <section key={module} className="space-y-4">
              {grouped[module].length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{module} queues</h2>
                <p className="text-sm text-gray-500">Workflow queues that already have list filtering, detail drill-ins, downstream actions, and approval-focused review modes.</p>
              </div>
              )}
              {grouped[module].length > 0 && (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {grouped[module].map((card) => (
                  <QueueWorkflowCard key={card.key} card={card} onNavigate={(href) => navigate(buildQueuePath(href))} />
                ))}
              </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'amber' | 'green' }) {
  const palette = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    green: 'border-green-100 bg-green-50 text-green-700',
  }[tone];

  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-medium ${palette}`}>{value}</div>
    </div>
  );
}

function QueueWorkflowCard({ card, onNavigate }: { card: QueueCard; onNavigate: (href: string) => void }) {
  const palette = {
    blue: { bg: 'bg-blue-50', fg: 'text-blue-600', pill: 'bg-blue-100 text-blue-700' },
    green: { bg: 'bg-green-50', fg: 'text-green-600', pill: 'bg-green-100 text-green-700' },
    amber: { bg: 'bg-amber-50', fg: 'text-amber-600', pill: 'bg-amber-100 text-amber-700' },
    red: { bg: 'bg-red-50', fg: 'text-red-600', pill: 'bg-red-100 text-red-700' },
    purple: { bg: 'bg-purple-50', fg: 'text-purple-600', pill: 'bg-purple-100 text-purple-700' },
  }[card.color];

  const Icon = card.icon;

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`rounded-xl p-3 ${palette.bg}`}>
            <Icon className={`h-5 w-5 ${palette.fg}`} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${palette.pill}`}>{card.module}</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">{card.description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-gray-400">Open items</p>
          <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
        <span className="text-sm text-gray-500">Uses existing workflow-filtered routed pages.</span>
        <div className="flex flex-wrap justify-end gap-2">
          {card.secondaryAction && (
            <button onClick={() => onNavigate(card.secondaryAction!.href)} className="btn-secondary text-xs">
              {card.secondaryAction.label}
            </button>
          )}
          <button onClick={() => onNavigate(card.href)} className="btn-secondary flex items-center gap-2">
            {card.cta} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

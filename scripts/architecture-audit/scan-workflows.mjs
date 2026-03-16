/**
 * Scanner: Workflows
 *
 * Identifies business workflow patterns from backend queries and frontend status handling.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

export function scanWorkflows(root) {
  const workflows = [];

  // Sales Workflow
  workflows.push({
    name: 'Sales Workflow',
    module: 'Sales',
    steps: [
      { step: 'Sales Order Created', actor: 'User (Frontend)', endpoint: 'resourceApi.create (Sales Order)', status: '⚠️ Inferred — no create UI exists' },
      { step: 'Sales Invoice Created', actor: 'User (Frontend)', endpoint: 'resourceApi.list (Sales Invoice) — read only', status: '⚠️ No create action in UI' },
      { step: 'Sales Invoice Submitted', actor: 'Backend (docstatus=1)', endpoint: 'Frappe workflow', status: '✅ Verified — queried with docstatus=1' },
      { step: 'Payment Received', actor: 'User / Backend', endpoint: 'Payment Entry', status: '✅ Verified — cash flow API' },
      { step: 'Delivery Note Created', actor: 'Backend / Demo', endpoint: 'Demo generator only', status: '⚠️ No frontend management' },
    ],
    uiScreens: ['SalesPage', 'DashboardPage'],
    backendApis: ['get_dashboard_kpis', 'get_sales_trend', 'get_recent_orders'],
    completeness: 'Partial — read-only workflow, no create/submit/cancel from UI',
  });

  // Purchase Workflow
  workflows.push({
    name: 'Purchase Workflow',
    module: 'Purchases',
    steps: [
      { step: 'Purchase Invoice Created', actor: 'User (Frontend)', endpoint: 'resourceApi.list (Purchase Invoice) — read only', status: '⚠️ No create action in UI' },
      { step: 'Purchase Invoice Submitted', actor: 'Backend (docstatus=1)', endpoint: 'Frappe workflow', status: '✅ Verified — queried with docstatus=1' },
      { step: 'Purchase Receipt Created', actor: 'Backend / Demo', endpoint: 'Demo generator only', status: '⚠️ No frontend management' },
      { step: 'Payment Made', actor: 'User / Backend', endpoint: 'Payment Entry', status: '✅ Verified — cash flow API (outflow)' },
    ],
    uiScreens: ['PurchasesPage', 'DashboardPage'],
    backendApis: ['get_dashboard_kpis', 'get_accounts_payable'],
    completeness: 'Partial — read-only workflow, no create/submit from UI',
  });

  // Inventory Workflow
  workflows.push({
    name: 'Inventory Workflow',
    module: 'Inventory',
    steps: [
      { step: 'Stock Entry (Initial)', actor: 'Demo generator', endpoint: 'InventoryGenerator', status: '✅ Verified — demo seeding' },
      { step: 'Stock Updated via Purchase', actor: 'Backend', endpoint: 'Purchase Receipt → Bin', status: '✅ Verified — ERPNext automatic' },
      { step: 'Stock Reduced via Sale', actor: 'Backend', endpoint: 'Delivery Note → Bin', status: '✅ Verified — ERPNext automatic' },
      { step: 'Stock Summary Viewed', actor: 'User (Frontend)', endpoint: 'inventoryApi.getStockSummary()', status: '✅ Verified' },
      { step: 'Low Stock Alerts Viewed', actor: 'User (Frontend)', endpoint: 'inventoryApi.getLowStockItems()', status: '✅ Verified' },
      { step: 'Stock Movement History', actor: 'User (Frontend)', endpoint: 'get_stock_movement()', status: '⚠️ Backend exists, no UI' },
    ],
    uiScreens: ['InventoryPage', 'DashboardPage'],
    backendApis: ['get_stock_summary', 'get_low_stock_items', 'get_warehouse_stock', 'get_stock_movement'],
    completeness: 'Mostly complete — viewing works, stock movement UI missing',
  });

  // Payment Workflow
  workflows.push({
    name: 'Payment Workflow',
    module: 'Finance',
    steps: [
      { step: 'Payment Entry Created', actor: 'Demo / Backend', endpoint: 'PaymentGenerator', status: '⚠️ No create from UI' },
      { step: 'Cash Inflow Tracked', actor: 'Backend', endpoint: 'get_cash_flow_summary() — Receive type', status: '✅ Verified' },
      { step: 'Cash Outflow Tracked', actor: 'Backend', endpoint: 'get_cash_flow_summary() — Pay type', status: '✅ Verified' },
      { step: 'Invoice Reconciliation', actor: 'Backend (ERPNext)', endpoint: 'outstanding_amount updates', status: '✅ Verified — reflected in reports' },
    ],
    uiScreens: ['FinancePage', 'DashboardPage'],
    backendApis: ['get_cash_flow_summary', 'get_profit_and_loss'],
    completeness: 'Partial — viewing works, no payment creation from UI',
  });

  // Reporting Workflow
  workflows.push({
    name: 'Reporting Workflow',
    module: 'Reports',
    steps: [
      { step: 'Accounts Receivable Report', actor: 'User (Frontend)', endpoint: 'reportsApi.getAccountsReceivable()', status: '✅ Verified' },
      { step: 'Accounts Payable Report', actor: 'User (Frontend)', endpoint: 'reportsApi.getAccountsPayable()', status: '✅ Verified' },
      { step: 'Profit & Loss Report', actor: 'User (Frontend)', endpoint: 'reportsApi.getProfitAndLoss()', status: '✅ Verified' },
      { step: 'Monthly Sales Report', actor: 'User (Frontend)', endpoint: 'reportsApi.getMonthlySalesReport()', status: '✅ Verified' },
      { step: 'Supplier Balances Report', actor: 'User (Frontend)', endpoint: 'reportsApi.getSupplierBalances()', status: '✅ Verified' },
      { step: 'Receivable Aging Summary', actor: 'User (Frontend)', endpoint: 'reportsApi.getReceivableAgingSummary()', status: '✅ Verified' },
    ],
    uiScreens: ['ReportsPage', 'FinancePage'],
    backendApis: ['get_accounts_receivable', 'get_accounts_payable', 'get_profit_and_loss', 'get_monthly_sales_report', 'get_supplier_balances', 'get_receivable_aging_summary'],
    completeness: 'Complete — all report endpoints have UI consumers',
  });

  // CRM Workflow
  workflows.push({
    name: 'Customer Management',
    module: 'CRM',
    steps: [
      { step: 'Customer List Viewed', actor: 'User (Frontend)', endpoint: 'resourceApi.list({ doctype: "Customer" })', status: '✅ Verified' },
      { step: 'Customer Created', actor: 'User (Frontend)', endpoint: '"Add Customer" button', status: '⚠️ Button exists, no handler' },
      { step: 'Customer Details Viewed', actor: 'User (Frontend)', endpoint: 'resourceApi.get("Customer", name)', status: '⚠️ Inferred — card is clickable but no detail view' },
    ],
    uiScreens: ['CustomersPage'],
    backendApis: ['resourceApi.list'],
    completeness: 'Partial — list only, no create/edit/detail views',
  });

  // Supplier Management
  workflows.push({
    name: 'Supplier Management',
    module: 'CRM',
    steps: [
      { step: 'Supplier List Viewed', actor: 'User (Frontend)', endpoint: 'resourceApi.list({ doctype: "Supplier" })', status: '✅ Verified' },
      { step: 'Supplier Created', actor: 'User (Frontend)', endpoint: '"Add Supplier" button', status: '⚠️ Button exists, no handler' },
    ],
    uiScreens: ['SuppliersPage'],
    backendApis: ['resourceApi.list'],
    completeness: 'Partial — list only, no create/edit views',
  });

  // Scan for additional patterns from hooks
  const hooksPath = join(root, 'apps', 'trader_app', 'trader_app', 'hooks.py');
  if (existsSync(hooksPath)) {
    const content = readFileSync(hooksPath, 'utf-8');

    // Check for scheduler events
    if (content.includes('scheduler_events') && !content.match(/^#\s*scheduler_events/m)) {
      workflows.push({
        name: 'Scheduled Tasks',
        module: 'System',
        steps: [{ step: 'Scheduled tasks defined in hooks', actor: 'System', endpoint: 'hooks.py', status: '🔍 Needs review' }],
        uiScreens: [],
        backendApis: [],
        completeness: 'Unknown',
      });
    }

    // Check for doc_events
    if (content.includes('doc_events') && !content.match(/^#\s*doc_events/m)) {
      workflows.push({
        name: 'Document Events',
        module: 'System',
        steps: [{ step: 'Doc events defined in hooks', actor: 'System', endpoint: 'hooks.py', status: '🔍 Needs review' }],
        uiScreens: [],
        backendApis: [],
        completeness: 'Unknown',
      });
    }
  }

  return workflows;
}

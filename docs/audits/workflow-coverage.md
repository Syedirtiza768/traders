# Workflow Coverage

## Title
Traders — Workflow Completeness Audit

## Purpose
Tracks the completeness of business workflows across UI, API, and database layers.

## Generated From
Workflow scanner analysis of all backend endpoints, frontend pages, and demo generators.

## Last Audit Basis
Full workflow pattern analysis — 2026-03-16

---

## Current interpretation note

This workflow audit has been refreshed against the current shipped application state. The earlier version described the old read-only shell. The repo now includes multiple working transaction flows, linked-document continuity, operational queue drill-ins, and finance action surfaces.

## Workflow Coverage Matrix

| # | Workflow | Module | UI Coverage | API Coverage | DB Coverage | Completeness |
|---|---|---|---|---|---|---|
| 1 | Sales Workflow | Sales | Quotations, Sales Orders, Sales Invoices, Dashboard, Customers | Expanded sales endpoints | ✅ | 85% — Strong core flow — list/detail/create/submit plus downstream traceability |
| 2 | Purchase Workflow | Purchases | Purchase Orders, Purchase Invoices, Dashboard, Suppliers | Expanded purchase endpoints | ✅ | 80% — Strong core flow — list/detail/create/submit plus payables continuity |
| 3 | Inventory Workflow | Inventory | Inventory, Item Detail, Warehouse Stock, Stock Movement | Expanded inventory endpoints | ✅ | 92% — Mostly complete — operational viewing and movement history shipped |
| 4 | Payment Workflow | Finance | Payment Entries, Payment Detail, New Payment Entry, customer/supplier shortcuts | Expanded finance endpoints | ✅ | 88% — Working draft/create/submit flow with contextual launch points |
| 5 | Reporting Workflow | Reports | ReportsPage, FinancePage | 6 endpoints | ✅ | 100% — Complete — all report endpoints have UI consumers |
| 6 | Customer Management | CRM | Customers, Customer Detail, Customer Outstanding, Customer Aging | Customer endpoints + report endpoints | ✅ | 82% — Practical CRM core — list/detail/create plus receivable actions |
| 7 | Supplier Management | CRM | Suppliers, Supplier Detail, purchase/payment shortcuts | Supplier endpoints + finance hooks | ✅ | 80% — Practical supplier core — list/detail/create plus payable actions |

## Exact evidence

| Workflow | Representative file evidence |
|---|---|
| Sales Workflow | `frontend/trader-ui/src/pages/QuotationsPage.tsx`, `QuotationDetailPage.tsx`, `SalesOrdersPage.tsx`, `SalesOrderDetailPage.tsx`, `CreateSalesOrderPage.tsx`, `CreateSalesInvoicePage.tsx`, `SalesInvoiceDetailPage.tsx`, `apps/trader_app/trader_app/api/sales.py` |
| Purchase Workflow | `frontend/trader-ui/src/pages/PurchaseOrdersPage.tsx`, `PurchaseOrderDetailPage.tsx`, `CreatePurchaseOrderPage.tsx`, `CreatePurchaseInvoicePage.tsx`, `PurchaseInvoiceDetailPage.tsx`, `apps/trader_app/trader_app/api/purchases.py` |
| Inventory Workflow | `frontend/trader-ui/src/pages/InventoryItemDetailPage.tsx`, `WarehouseStockPage.tsx`, `StockMovementPage.tsx`, `apps/trader_app/trader_app/api/inventory.py` |
| Payment Workflow | `frontend/trader-ui/src/pages/PaymentEntriesPage.tsx`, `PaymentEntryDetailPage.tsx`, `CreatePaymentEntryPage.tsx`, `apps/trader_app/trader_app/api/finance.py` |
| Reporting Workflow | `frontend/trader-ui/src/pages/ReportsPage.tsx`, `CustomerOutstandingPage.tsx`, `CustomerAgingPage.tsx`, `apps/trader_app/trader_app/api/reports.py` |
| Customer Management | `frontend/trader-ui/src/pages/CreateCustomerPage.tsx`, `CustomerDetailPage.tsx`, `CustomerOutstandingPage.tsx`, `CustomerAgingPage.tsx`, `apps/trader_app/trader_app/api/customers.py` |
| Supplier Management | `frontend/trader-ui/src/pages/CreateSupplierPage.tsx`, `SupplierDetailPage.tsx`, `apps/trader_app/trader_app/api/suppliers.py` |

## Detailed Workflow Steps

### Sales Workflow

**Current status:** core commercial workflow is now real and significantly broader than the original audit captured. What remains is specialist depth such as approvals, dispatch, returns, and pricing.

| Step | Actor | Endpoint | Status |
|---|---|---|---|
| Quotation queue viewed | User (Frontend) | `salesApi.getQuotations()` | ✅ Verified |
| Sales order created from quotation context | User (Frontend) | `salesApi.createOrder()` | ✅ Verified via `CreateSalesOrderPage.tsx` |
| Sales order submitted | User (Frontend) | `salesApi.submitOrder()` | ✅ Verified via `SalesOrderDetailPage.tsx` |
| Sales invoice created from sales order context | User (Frontend) | `salesApi.createInvoice()` | ✅ Verified via `CreateSalesInvoicePage.tsx` |
| Sales invoice submitted | User (Frontend) | `salesApi.submitInvoice()` | ✅ Verified via `SalesInvoiceDetailPage.tsx` |
| Payment collected from invoice or order context | User (Frontend) | `financeApi.createPaymentEntry()` | ✅ Verified via `CreatePaymentEntryPage.tsx` |
| Upstream/downstream traceability viewed | User (Frontend) | enriched detail/list payloads | ✅ Verified |

### Purchase Workflow

| Step | Actor | Endpoint | Status |
|---|---|---|---|
| Purchase order queue viewed | User (Frontend) | `purchasesApi.getOrders()` | ✅ Verified |
| Purchase order created | User (Frontend) | `purchasesApi.createOrder()` | ✅ Verified via `CreatePurchaseOrderPage.tsx` |
| Purchase order submitted | User (Frontend) | `purchasesApi.submitOrder()` | ✅ Verified via `PurchaseOrderDetailPage.tsx` |
| Purchase invoice created from order context | User (Frontend) | `purchasesApi.createInvoice()` | ✅ Verified via `CreatePurchaseInvoicePage.tsx` |
| Purchase invoice submitted | User (Frontend) | `purchasesApi.submitInvoice()` | ✅ Verified via `PurchaseInvoiceDetailPage.tsx` |
| Supplier payment launched contextually | User (Frontend) | `financeApi.createPaymentEntry()` | ✅ Verified |
| Downstream invoice traceability viewed | User (Frontend) | enriched purchase detail/list payloads | ✅ Verified |

### Inventory Workflow

| Step | Actor | Endpoint | Status |
|---|---|---|---|
| Stock Entry (Initial) | Demo generator | InventoryGenerator | ✅ Verified — demo seeding |
| Stock Updated via Purchase | Backend | Purchase Receipt → Bin | ✅ Verified — ERPNext automatic |
| Stock Reduced via Sale | Backend | Delivery Note → Bin | ✅ Verified — ERPNext automatic |
| Stock Summary Viewed | User (Frontend) | inventoryApi.getStockSummary() | ✅ Verified |
| Low Stock Alerts Viewed | User (Frontend) | inventoryApi.getLowStockItems() | ✅ Verified |
| Item detail viewed | User (Frontend) | inventory list payload/state handoff | ✅ Verified |
| Warehouse stock viewed | User (Frontend) | `inventoryApi.getStockBalance()` | ✅ Verified |
| Stock movement history viewed | User (Frontend) | stock ledger endpoint wiring | ✅ Verified via `StockMovementPage.tsx` |

### Payment Workflow

| Step | Actor | Endpoint | Status |
|---|---|---|---|
| Payment entry list viewed | User (Frontend) | `financeApi.getPaymentEntries()` | ✅ Verified |
| Payment entry created | User (Frontend) | `financeApi.createPaymentEntry()` | ✅ Verified |
| Payment entry submitted | User (Frontend) | `financeApi.submitPaymentEntry()` | ✅ Verified |
| Cash inflow tracked | Backend | cash-flow/dashboard/reporting APIs | ✅ Verified |
| Cash outflow tracked | Backend | cash-flow/dashboard/reporting APIs | ✅ Verified |
| Invoice allocation viewed | User (Frontend) | payment detail references | ✅ Verified |

### Reporting Workflow

| Step | Actor | Endpoint | Status |
|---|---|---|---|
| Accounts Receivable Report | User (Frontend) | reportsApi.getAccountsReceivable() | ✅ Verified |
| Accounts Payable Report | User (Frontend) | reportsApi.getAccountsPayable() | ✅ Verified |
| Profit & Loss Report | User (Frontend) | reportsApi.getProfitAndLoss() | ✅ Verified |
| Monthly Sales Report | User (Frontend) | reportsApi.getMonthlySalesReport() | ✅ Verified |
| Supplier Balances Report | User (Frontend) | reportsApi.getSupplierBalances() | ✅ Verified |
| Receivable Aging Summary | User (Frontend) | reportsApi.getReceivableAgingSummary() | ✅ Verified |

### Customer Management

| Step | Actor | Endpoint | Status |
|---|---|---|---|
| Customer List Viewed | User (Frontend) | resourceApi.list({ doctype: "Customer" }) | ✅ Verified |
| Customer Created | User (Frontend) | `customersApi.create()` | ✅ Verified |
| Customer Details Viewed | User (Frontend) | `customersApi.getDetail()` | ✅ Verified |
| Customer receivables reviewed | User (Frontend) | report APIs + customer detail transactions | ✅ Verified |
| Customer payment launched | User (Frontend) | `financeApi.createPaymentEntry()` | ✅ Verified |

### Supplier Management

| Step | Actor | Endpoint | Status |
|---|---|---|---|
| Supplier List Viewed | User (Frontend) | resourceApi.list({ doctype: "Supplier" }) | ✅ Verified |
| Supplier Created | User (Frontend) | `suppliersApi.create()` | ✅ Verified |
| Supplier Details Viewed | User (Frontend) | `suppliersApi.getDetail()` | ✅ Verified |
| Supplier payment launched | User (Frontend) | `financeApi.createPaymentEntry()` | ✅ Verified |

## Operational workflow maturity additions

The following cross-workflow capabilities are now shipped and materially improve usability even though they were not reflected in the original scanner-led audit:

- dashboard workflow KPI drill-ins into queues
- filtered workflow lists for quotations, sales orders, and purchase orders
- clearable workflow filter banners
- preserved list context when navigating into detail pages and back
- full queue URL state for workflow, page, status, and search
- truthful upstream/downstream linked-document cards and trace banners
- report tab persistence and report drill-ins that return to the correct report surface
- CRM list/search/group context preserved into detail, invoice, and payment flows
- finance-origin controller context preserved via explicit `source=finance`
- shared frontend helper coverage for report/list/workflow context detection

## Navigation context contract (current shipped behavior)

The frontend now relies on a lightweight URL/state contract to preserve operational context across list → detail → create → submit flows.

### Query-state conventions

| Key | Meaning | Representative consumers |
|---|---|---|
| `list` | Encoded upstream list/controller/report state passed into detail/create pages | `CustomerDetailPage.tsx`, `SupplierDetailPage.tsx`, `SalesInvoiceDetailPage.tsx`, `PurchaseInvoiceDetailPage.tsx`, `CreatePaymentEntryPage.tsx`, `PaymentEntryDetailPage.tsx` |
| `tab` | Active report tab in `ReportsPage` | `ReportsPage.tsx`, report-origin customer/supplier drill-ins |
| `search` / `group` | URL-backed CRM/filter list state | `CustomersPage.tsx`, `SuppliersPage.tsx` |
| `workflow` | Operational queue identity for order controllers | `SalesOrdersPage.tsx`, `PurchaseOrdersPage.tsx` |
| `paymentType` / `page` | Finance payment list state | `PaymentEntriesPage.tsx`, `PaymentEntryDetailPage.tsx` |
| `source=finance` | Explicit finance-hub origin on controller routes | `FinancePage.tsx`, `CustomerOutstandingPage.tsx`, `CustomerAgingPage.tsx` |

### Resolution rules now present in the frontend

- report context returns to `ReportsPage`
- filter-list context returns to CRM list pages (`CustomersPage` / `SuppliersPage`)
- workflow context returns to sales/purchase order queues
- payment-list context returns to `PaymentEntriesPage`
- finance controller origin can be preserved independently from list filters via `source=finance`

Primary implementation evidence:

- `frontend/trader-ui/src/lib/utils.ts`
- `frontend/trader-ui/src/pages/ReportsPage.tsx`
- `frontend/trader-ui/src/pages/CustomersPage.tsx`
- `frontend/trader-ui/src/pages/SuppliersPage.tsx`
- `frontend/trader-ui/src/pages/CustomerDetailPage.tsx`
- `frontend/trader-ui/src/pages/SupplierDetailPage.tsx`
- `frontend/trader-ui/src/pages/SalesInvoiceDetailPage.tsx`
- `frontend/trader-ui/src/pages/PurchaseInvoiceDetailPage.tsx`
- `frontend/trader-ui/src/pages/CreatePaymentEntryPage.tsx`
- `frontend/trader-ui/src/pages/PaymentEntryDetailPage.tsx`
- `frontend/trader-ui/src/pages/FinancePage.tsx`
- `frontend/trader-ui/src/pages/CustomerOutstandingPage.tsx`
- `frontend/trader-ui/src/pages/CustomerAgingPage.tsx`

- `frontend/trader-ui/src/pages/DashboardPage.tsx`
- `frontend/trader-ui/src/components/KPICard.tsx`
- `frontend/trader-ui/src/pages/QuotationsPage.tsx`
- `frontend/trader-ui/src/pages/SalesOrdersPage.tsx`
- `frontend/trader-ui/src/pages/PurchaseOrdersPage.tsx`
- `frontend/trader-ui/src/pages/QuotationDetailPage.tsx`
- `frontend/trader-ui/src/pages/SalesOrderDetailPage.tsx`
- `frontend/trader-ui/src/pages/PurchaseOrderDetailPage.tsx`
- `frontend/trader-ui/src/pages/ReportsPage.tsx`
- `frontend/trader-ui/src/pages/CustomersPage.tsx`
- `frontend/trader-ui/src/pages/SuppliersPage.tsx`
- `frontend/trader-ui/src/pages/CustomerDetailPage.tsx`
- `frontend/trader-ui/src/pages/SupplierDetailPage.tsx`
- `frontend/trader-ui/src/pages/SalesInvoiceDetailPage.tsx`
- `frontend/trader-ui/src/pages/PurchaseInvoiceDetailPage.tsx`
- `frontend/trader-ui/src/pages/CreatePaymentEntryPage.tsx`
- `frontend/trader-ui/src/pages/PaymentEntryDetailPage.tsx`
- `frontend/trader-ui/src/pages/FinancePage.tsx`
- `frontend/trader-ui/src/pages/CustomerOutstandingPage.tsx`
- `frontend/trader-ui/src/pages/CustomerAgingPage.tsx`
- `frontend/trader-ui/src/lib/utils.ts`
- `apps/trader_app/trader_app/api/dashboard.py`
- `apps/trader_app/trader_app/api/sales.py`
- `apps/trader_app/trader_app/api/purchases.py`


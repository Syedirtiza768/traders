# Frontend Screen Coverage Gap Audit

## Title
Traders — Target Screen vs Current Frontend Coverage

## Purpose
Trace every planned frontend screen from the target component matrix against the current React application, frontend API usage, and known backend support.

This document is intended to answer:

- which target screens already exist
- which screens are only partially represented by a broader module page
- which screens are entirely missing from the UI
- where backend/API support exists but has no screen
- where UI work is blocked by missing backend behavior

## Generated From
- `docs/frontend-component-matrix.md`
- `docs/audits/frontend-screen-inventory.md`
- `docs/audits/frontend-api-mapping.md`
- `docs/audits/frontend-backend-mapping.md`
- `docs/audits/backend-endpoints.md`
- `docs/audits/module-coverage-matrix.md`
- `docs/audits/workflow-coverage.md`
- `frontend/trader-ui/src/App.tsx`
- `frontend/trader-ui/src/pages/*.tsx`

## Last Audit Basis
Screen matrix reconciliation against current frontend routes, page components, and backend endpoint inventory — 2026-03-16

---

## Status Model

| Status | Meaning |
|---|---|
| ✅ Implemented | Dedicated route/page exists and meaningfully covers the target screen |
| 🟡 Partial | Covered only indirectly by a broader module page or read-only subset |
| ⚪ Missing UI | No dedicated frontend screen exists |
| 🔴 Blocked | Screen is missing and repo evidence shows no supporting backend/API path yet |

## Assessment Rules

- A target screen is **Implemented** only when there is a dedicated page/route that substantially matches the screen purpose.
- A target screen is **Partial** when an existing module page exposes a subset of the target workflow or data.
- A target screen is **Missing UI** when no page exists, even if backend resources or generic APIs could support it.
- A target screen is **Blocked** when both the UI and a specific supporting backend pathway appear absent from the current repo evidence.
- Generic Frappe resource endpoints count as **possible backend support**, but not proof of a fully implemented workflow.

---

## Executive Summary

### Current React screen reality

The frontend currently contains 10 concrete page components:

- `LoginPage`
- `DashboardPage`
- `SalesPage`
- `PurchasesPage`
- `InventoryPage`
- `CustomersPage`
- `SuppliersPage`
- `FinancePage`
- `ReportsPage`
- `SettingsPage`

Only the following target areas have meaningful implemented coverage today:

- authentication
- global business dashboard
- sales invoice list view
- purchase invoice list view
- inventory summary / low stock view
- customer list view
- supplier list view
- finance report overview
- multi-report viewer
- settings shell

### Coverage outcome by module

| Module | Implemented | Partial | Missing / Blocked | Notes |
|---|---:|---:|---:|---|
| Sales | 0 | 3 | 39 | `SalesPage` partially covers invoice listing only |
| Purchases | 0 | 1 | 24 | `PurchasesPage` partially covers supplier invoice listing only |
| Inventory | 0 | 1 | 14 | `InventoryPage` covers summary and low-stock subset only |
| Customers | 0 | 1 | 8 | `CustomersPage` covers list-only subset |
| Suppliers | 0 | 1 | 7 | `SuppliersPage` covers list-only subset |
| Finance | 0 | 2 | 22 | `FinancePage` and `ReportsPage` cover read-only reporting subsets |
| Cross-module global | 0 | 0 | 6 | No dedicated global utility screens found |
| Settings / templates | 0 | 1 | 6 | `SettingsPage` exists as shell but lacks persistence |

### Highest-value gaps

1. **Sales transaction workflow screens** — quotations, orders, delivery, returns, collections.
2. **Purchasing workflow screens** — requisitions, RFQs, POs, receipts, matching.
3. **ERP master/detail screens** — customer 360, supplier 360, item detail, warehouse detail.
4. **Finance transaction entry** — journals, AR/AP actions, reconciliation, period close.
5. **Cross-module utilities** — approvals, notifications, document manager, audit explorer.

---

## Current Coverage Anchors

These current pages are the only direct anchors available for mapping target screens:

| Current Page | Route | Coverage Type | Evidence |
|---|---|---|---|
| `DashboardPage` | `/` | broad dashboard | KPIs, sales trend, top customers, recent orders |
| `SalesPage` | `/sales` | sales invoice list only | `resourceApi.list({ doctype: 'Sales Invoice' })` |
| `PurchasesPage` | `/purchases` | purchase invoice list only | `resourceApi.list({ doctype: 'Purchase Invoice' })` |
| `InventoryPage` | `/inventory` | inventory summary only | `getStockSummary()`, `getLowStockItems()` |
| `CustomersPage` | `/customers` | customer list only | `resourceApi.list({ doctype: 'Customer' })` |
| `SuppliersPage` | `/suppliers` | supplier list only | `resourceApi.list({ doctype: 'Supplier' })` |
| `FinancePage` | `/finance` | finance summary / reporting | P&L, cash flow, AR aging, AP |
| `ReportsPage` | `/reports` | report viewer | receivables, payables, monthly sales, supplier balances |
| `SettingsPage` | `/settings` | settings shell | no backend persistence |

---

## 1. Sales Coverage Gap

### Summary

| Area | Status | Evidence |
|---|---|---|
| Sales dashboards | 🟡 Partial | `DashboardPage` covers generic KPIs but not dedicated sales dashboards |
| Leads & opportunities | ⚪ Missing UI | No lead or pipeline pages/routes |
| Quotations | ⚪ Missing UI | No quotation pages/routes |
| Sales orders | ⚪ Missing UI | No order pages/routes |
| Delivery & dispatch | ⚪ Missing UI | No delivery/dispatch pages/routes |
| Invoices & receipts | 🟡 Partial | `SalesPage` covers invoice list only |
| Returns & credit notes | ⚪ Missing UI | No return/credit note pages/routes |
| Pricing & promotions | ⚪ Missing UI | No pricing pages/routes |
| Sales team & territory | ⚪ Missing UI | No team/territory pages/routes |
| Controls & exceptions | ⚪ Missing UI | No queue/log pages/routes |

### Screen-by-screen mapping

| Target Screen | Current Route / Page | Frontend Evidence | Backend/API Evidence | Status | Gap Note |
|---|---|---|---|---|---|
| Sales Overview Dashboard | `/` → `DashboardPage` | KPI dashboard exists | dashboard endpoints verified | 🟡 Partial | Broad business dashboard, not sales-dedicated |
| Sales Operations Dashboard | None | no page | no dedicated API mapping | ⚪ Missing UI | Could be assembled partly from existing dashboard/report data, but no screen exists |
| Salesperson Dashboard | None | no page | no dedicated API mapping | ⚪ Missing UI | No user-specific sales workbench |
| Lead List | None | no page | generic resource APIs exist only in theory | ⚪ Missing UI | No lead route, list, or action flow |
| Lead Detail | None | no page | no dedicated lead API mapping | 🔴 Blocked | No verified lead-facing backend support in current audits |
| Opportunity Pipeline | None | no page | no dedicated opportunity API mapping | 🔴 Blocked | No verified opportunity workflow in repo audits |
| Quotation List | None | no page | generic resource API could list doctype if used | ⚪ Missing UI | No quotation UI despite likely resource capability |
| Quotation Detail / Edit | None | no page | `resourceApi.create/update` defined but unused | ⚪ Missing UI | UI and workflow missing |
| Quotation Approval Queue | None | no page | no queue API evidence | 🔴 Blocked | No verified approval backend route |
| Quotation Comparison | None | no page | no comparison API evidence | 🔴 Blocked | Requires workflow-specific implementation |
| Sales Order List | None | no page | backend data indirectly referenced by dashboard recent orders | ⚪ Missing UI | No order management UI |
| Sales Order Detail / Edit | None | no page | generic resource CRUD possible but unused | ⚪ Missing UI | No order form workflow in frontend |
| Order Fulfillment Status | None | no page | no dedicated fulfillment API | 🔴 Blocked | No fulfillment screen or endpoint inventory |
| Backorder Management | None | no page | no shortage/backorder API mapping | 🔴 Blocked | Operational logic missing from current audits |
| Sales Order Approval Queue | None | no page | no approval queue API | 🔴 Blocked | Requires workflow support |
| Delivery Note List | None | no page | no delivery UI/API mapping | 🔴 Blocked | Delivery workflow not exposed in frontend |
| Delivery Note Detail / Edit | None | no page | no delivery form API mapping | 🔴 Blocked | Missing UI and backend evidence |
| Dispatch Planning | None | no page | no routing/dispatch API mapping | 🔴 Blocked | Planning workflow absent |
| Packing List | None | no page | no packing API mapping | 🔴 Blocked | Packaging workflow absent |
| Delivery Tracking | None | no page | no tracking API mapping | 🔴 Blocked | Final-mile workflow absent |
| Sales Invoice List | `/sales` → `SalesPage` | invoice table, pagination | `GET /api/resource/Sales Invoice` verified | 🟡 Partial | List exists, but filters/actions are placeholders |
| Sales Invoice Detail / Edit | None | no page | `resourceApi.get/create/update` defined but unused | ⚪ Missing UI | No detail/edit route |
| Customer Payment Entry | None | no page | finance dashboards use payment-derived data only | 🔴 Blocked | No payment entry UI or mapped endpoint |
| Customer Outstanding | None | no page | AR reports exist in reports/finance | ⚪ Missing UI | Data exists indirectly, dedicated screen missing |
| Customer Aging | None | no page | receivables aging summary endpoint verified | ⚪ Missing UI | Backend summary exists, no dedicated sales aging screen |
| Sales Return List | None | no page | no return UI/API mapping | 🔴 Blocked | Return workflow absent |
| Sales Return Detail | None | no page | no return API mapping | 🔴 Blocked | Missing workflow support |
| Credit Note List / Detail | None | no page | no credit note UI/API mapping | 🔴 Blocked | Missing workflow support |
| Return Inspection | None | no page | no inspection API mapping | 🔴 Blocked | Missing workflow support |
| Price List | None | no page | no price list API mapping | 🔴 Blocked | Missing pricing admin support |
| Pricing Rules | None | no page | no pricing rules API mapping | 🔴 Blocked | Missing workflow support |
| Discount Rules | None | no page | no discount rules API mapping | 🔴 Blocked | Missing workflow support |
| Promotion Campaigns | None | no page | no campaign API mapping | 🔴 Blocked | Missing workflow support |
| Salesperson List | None | no page | no salesperson UI/API mapping | 🔴 Blocked | Missing master UI |
| Sales Targets | None | no page | no targets API mapping | 🔴 Blocked | Missing planning workflow |
| Territory Management | None | no page | no territory UI/API mapping | 🔴 Blocked | Missing hierarchy admin UI |
| Customer Assignment | None | no page | no assignment API mapping | 🔴 Blocked | Missing allocation workflow |
| Sales Reports | `/reports` → `ReportsPage` | report viewer exists, monthly sales only | reports endpoints verified | 🟡 Partial | Generic reports exist, not dedicated sales report screens |
| Pending Orders | None | no page | recent orders data exists only on dashboard | ⚪ Missing UI | Page not implemented |
| Ready for Dispatch | None | no page | no dispatch queue API | 🔴 Blocked | Missing operational queue support |
| Orders Awaiting Invoice | None | no page | no dedicated queue API | 🔴 Blocked | Missing operational queue support |
| Credit Hold Queue | None | no page | no credit hold API mapping | 🔴 Blocked | Missing controls workflow |
| Discount Approval Queue | None | no page | no approval API mapping | 🔴 Blocked | Missing discounts approval workflow |
| Sales Exception Log | None | no page | no exception/audit API mapping | 🔴 Blocked | Missing exception management support |

---

## 2. Purchases Coverage Gap

### Summary

| Area | Status | Evidence |
|---|---|---|
| Purchase dashboard | 🟡 Partial | `DashboardPage` and `FinancePage` expose generic purchasing-adjacent metrics only |
| Requisitions | ⚪ Missing UI | No requisition routes/pages |
| RFQs & supplier quotations | ⚪ Missing UI | No RFQ/quotation pages |
| Purchase orders | ⚪ Missing UI | No PO management pages |
| Goods receipts | ⚪ Missing UI | No GRN/inspection pages |
| Supplier invoices | 🟡 Partial | `PurchasesPage` covers purchase invoice list only |
| Returns | ⚪ Missing UI | No purchase return pages |
| Payments | ⚪ Missing UI | No supplier payment pages |
| Reports & exceptions | 🟡 Partial | `ReportsPage` and `FinancePage` expose report subsets |

### Screen-by-screen mapping

| Target Screen | Current Route / Page | Frontend Evidence | Backend/API Evidence | Status | Gap Note |
|---|---|---|---|---|---|
| Purchase Dashboard | `/` and `/finance` | only generic dashboards | AP and supplier balance reports exist | 🟡 Partial | No dedicated purchasing operations dashboard |
| Purchase Requisition List | None | no page | no requisition API mapping | 🔴 Blocked | Workflow absent in audit inventory |
| Purchase Requisition Detail / Edit | None | no page | no requisition CRUD mapping | 🔴 Blocked | Missing UI and backend evidence |
| Requisition Approval Queue | None | no page | no approval queue mapping | 🔴 Blocked | Missing workflow support |
| Requisition Tracking | None | no page | no lifecycle tracking API mapping | 🔴 Blocked | Missing workflow support |
| RFQ List | None | no page | no RFQ API mapping | 🔴 Blocked | Missing sourcing workflow |
| RFQ Detail | None | no page | no RFQ endpoints mapped | 🔴 Blocked | Missing sourcing workflow |
| Supplier Quotation Entry | None | no page | no supplier quotation API mapping | 🔴 Blocked | Missing sourcing workflow |
| Supplier Quotation Comparison | None | no page | no comparison API mapping | 🔴 Blocked | Missing sourcing workflow |
| RFQ Award Decision | None | no page | no awarding workflow mapping | 🔴 Blocked | Missing sourcing workflow |
| Purchase Order List | None | no page | no PO UI/API mapping | 🔴 Blocked | Missing PO workflow |
| Purchase Order Detail / Edit | None | no page | generic CRUD defined but unused | ⚪ Missing UI | Potential resource path, no actual implementation |
| PO Approval Queue | None | no page | no approval API mapping | 🔴 Blocked | Missing workflow support |
| PO Fulfillment Status | None | no page | no receipt linkage API mapping | 🔴 Blocked | Missing workflow support |
| Open Purchase Orders | None | no page | no open-PO report mapping | 🔴 Blocked | Missing operational reporting |
| PO Revision History | None | no page | no revision API mapping | 🔴 Blocked | Missing versioning workflow |
| Goods Receipt List | None | no page | no GRN route/API mapping | 🔴 Blocked | Missing receiving workflow |
| Goods Receipt Detail | None | no page | no GRN detail mapping | 🔴 Blocked | Missing receiving workflow |
| Partial Receipt | None | no page | no receipt variance mapping | 🔴 Blocked | Missing receiving workflow |
| Excess / Short Receipt | None | no page | no discrepancy mapping | 🔴 Blocked | Missing receiving workflow |
| Quality Inspection | None | no page | no inspection mapping | 🔴 Blocked | Missing quality workflow |
| Rejected Goods | None | no page | no rejected goods mapping | 🔴 Blocked | Missing quality/returns workflow |
| Supplier Invoice List | `/purchases` → `PurchasesPage` | purchase invoice list exists | `GET /api/resource/Purchase Invoice` verified | 🟡 Partial | List-only page, actions are placeholders |
| Supplier Invoice Detail / Match | None | no page | `resourceApi.get/create/update` available but unused | ⚪ Missing UI | No detail/match flow |
| Three-Way Match | None | no page | no dedicated match API mapping | 🔴 Blocked | Workflow not exposed |
| Invoice Discrepancy Review | None | no page | no discrepancy API mapping | 🔴 Blocked | Missing AP exception workflow |
| Debit Notes | None | no page | no debit note mapping | 🔴 Blocked | Missing AP adjustment workflow |
| Purchase Returns | None | no page | no return mapping | 🔴 Blocked | Missing workflow support |
| Supplier Payments | None | no page | AP data exists, no payment entry screen | 🔴 Blocked | Missing UI transaction workflow |
| Purchase Reports & Exceptions | `/reports` and `/finance` | supplier balances/payables only | reports endpoints verified | 🟡 Partial | Generic reporting exists, no purchase-specific operational screens |

---

## 3. Inventory Coverage Gap

### Summary

| Area | Status | Evidence |
|---|---|---|
| Inventory dashboard | 🟡 Partial | `InventoryPage` covers summary and low-stock |
| Item master | ⚪ Missing UI | No item list/detail pages |
| Warehouses | ⚪ Missing UI | No warehouse pages |
| Stock transactions | ⚪ Missing UI | No transaction entry/history pages |
| Batch / serial / expiry | ⚪ Missing UI | No traceability pages |
| Stock counting | ⚪ Missing UI | No count pages |
| Reservation & allocation | ⚪ Missing UI | No reservation pages |
| Valuation | ⚪ Missing UI | No valuation pages |
| Reports & exceptions | 🟡 Partial | low stock alerts plus backend stock endpoints |

### Screen-by-screen mapping

| Target Screen / Area | Current Route / Page | Frontend Evidence | Backend/API Evidence | Status | Gap Note |
|---|---|---|---|---|---|
| Inventory Dashboard | `/inventory` → `InventoryPage` | stock summary, low-stock tabs, search | `get_stock_summary`, `get_low_stock_items` verified | 🟡 Partial | Good summary screen, but not full dashboard matrix |
| Item List | None | no page | no item page usage mapped | ⚪ Missing UI | Likely possible through generic resource API |
| Item Detail / Edit | None | no page | generic resource CRUD exists, unused | ⚪ Missing UI | No detail/edit workflow |
| Item Categories | None | no page | no item category screen mapping | 🔴 Blocked | No verified screen/backend flow |
| UOM Conversion | None | no page | no UOM flow mapping | 🔴 Blocked | Missing admin workflow |
| Reorder Settings | None | no page | low-stock data references reorder context only | ⚪ Missing UI | Some backend context exists, no management screen |
| Barcode / SKU Setup | None | no page | no barcode workflow mapping | 🔴 Blocked | Missing operational support |
| Warehouses | None | no page | `get_warehouse_stock()` backend exists, no UI consumer | ⚪ Missing UI | Backend support exists for some warehouse viewing |
| Stock Transactions | None | no page | `get_stock_movement()` backend exists, no UI consumer | ⚪ Missing UI | History endpoint exists, no screen |
| Batch / Serial / Expiry | None | no page | no dedicated audit mapping | 🔴 Blocked | Missing flow evidence |
| Stock Counting | None | no page | no counting workflow mapping | 🔴 Blocked | Missing workflow support |
| Reservation & Allocation | None | no page | no allocation workflow mapping | 🔴 Blocked | Missing operational support |
| Valuation | None | no page | no valuation API mapping | 🔴 Blocked | Missing finance-inventory workflow support |
| Inventory Reports & Exceptions | `/inventory` | low stock plus summary only | stock-related endpoints partly available | 🟡 Partial | No dedicated report or exception pages |

---

## 4. Customers Coverage Gap

### Summary

| Area | Status | Evidence |
|---|---|---|
| Customer dashboard | 🟡 Partial | generic dashboard has top customers only |
| Customer master | 🟡 Partial | `CustomersPage` provides list-only |
| Contacts & addresses | ⚪ Missing UI | no dedicated pages |
| Financial profile | ⚪ Missing UI | no customer credit/aging screen |
| Sales settings | ⚪ Missing UI | no price list / territory assignment page |
| History & interactions | ⚪ Missing UI | no 360/history detail screen |
| Reports & exceptions | 🟡 Partial | reports and finance expose indirect customer data |

### Screen-by-screen mapping

| Target Screen / Area | Current Route / Page | Frontend Evidence | Backend/API Evidence | Status | Gap Note |
|---|---|---|---|---|---|
| Customer Dashboard | `/` → `DashboardPage` | top customers widget only | top customer data verified | 🟡 Partial | No customer-dedicated dashboard |
| Customer List | `/customers` → `CustomersPage` | list/search/pagination | `GET /api/resource/Customer` verified | 🟡 Partial | List exists, but no create/detail flow |
| Customer Detail / 360 View | None | no page | `resourceApi.get()` defined but unused | ⚪ Missing UI | No 360 experience |
| Customer Group / Segment | None | no page | no group page mapping | 🔴 Blocked | Missing admin workflow |
| Customer Category | None | no page | no category page mapping | 🔴 Blocked | Missing admin workflow |
| Customer Status Management | None | no page | no hold/block workflow mapping | 🔴 Blocked | Missing controls workflow |
| Contacts & Addresses | None | no page | no contact/address mapping | 🔴 Blocked | Missing detail workflow |
| Financial Profile | None | no page | finance/reports expose related data indirectly | ⚪ Missing UI | Could be assembled from existing reports plus customer detail |
| Sales Settings | None | no page | no pricing/assignment mapping | 🔴 Blocked | Missing settings workflow |
| History & Interactions | None | no page | no customer history page mapping | 🔴 Blocked | Missing CRM workflow |
| Customer Reports & Exceptions | `/reports` and `/finance` | receivable and aging reports only | reports endpoints verified | 🟡 Partial | Insight exists, customer-specific screens do not |

---

## 5. Suppliers Coverage Gap

### Summary

| Area | Status | Evidence |
|---|---|---|
| Supplier dashboard | 🟡 Partial | finance/reports expose AP and supplier balances |
| Supplier master | 🟡 Partial | `SuppliersPage` provides list-only |
| Contacts & addresses | ⚪ Missing UI | no dedicated detail pages |
| Financial profile | ⚪ Missing UI | no supplier financial detail page |
| Procurement settings | ⚪ Missing UI | no supplier default item/lead-time pages |
| History & performance | ⚪ Missing UI | no supplier 360/performance page |
| Reports & exceptions | 🟡 Partial | supplier balances report exists |

### Screen-by-screen mapping

| Target Screen / Area | Current Route / Page | Frontend Evidence | Backend/API Evidence | Status | Gap Note |
|---|---|---|---|---|---|
| Supplier Dashboard | `/finance` and `/reports` | AP + supplier balance summaries only | supplier balance/payables endpoints verified | 🟡 Partial | No supplier-dedicated dashboard |
| Supplier List | `/suppliers` → `SuppliersPage` | list/search/pagination | `GET /api/resource/Supplier` verified | 🟡 Partial | List exists, but no create/detail flow |
| Supplier Detail / 360 View | None | no page | `resourceApi.get()` defined but unused | ⚪ Missing UI | No supplier detail experience |
| Supplier Category | None | no page | no category mapping | 🔴 Blocked | Missing admin workflow |
| Supplier Status | None | no page | no block/unblock mapping | 🔴 Blocked | Missing controls workflow |
| Contacts & Addresses | None | no page | no contact/address mapping | 🔴 Blocked | Missing detail workflow |
| Financial Profile | None | no page | AP reports exist indirectly | ⚪ Missing UI | Data subsets exist, screen missing |
| Procurement Settings | None | no page | no price list/SKU/lead-time mapping | 🔴 Blocked | Missing procurement workflow |
| History & Performance | None | no page | supplier balances only, no performance flow | 🔴 Blocked | Missing 360/performance workflow |
| Supplier Reports & Exceptions | `/reports` → `ReportsPage` | supplier balance report exists | `get_supplier_balances()` verified | 🟡 Partial | No supplier operational exception screens |

---

## 6. Finance Coverage Gap

### Summary

| Area | Status | Evidence |
|---|---|---|
| Finance dashboards | 🟡 Partial | `FinancePage` covers overview; no dedicated sub-dashboards |
| Accounting setup | ⚪ Missing UI | no setup/admin pages |
| General ledger | ⚪ Missing UI | no JE or GL drilldown pages |
| Accounts receivable | 🟡 Partial | aging, receivables, and finance summaries available |
| Accounts payable | 🟡 Partial | payables and supplier balances available |
| Cash & bank | ⚪ Missing UI | only summary via dashboard endpoint |
| Period closing | ⚪ Missing UI | no close pages |
| Financial reports | 🟡 Partial | `FinancePage` and `ReportsPage` support read-only reports |
| Controls / audit / exceptions | ⚪ Missing UI | no dedicated audit/exception pages |

### Screen-by-screen mapping

| Target Screen / Area | Current Route / Page | Frontend Evidence | Backend/API Evidence | Status | Gap Note |
|---|---|---|---|---|---|
| Finance Overview Dashboard | `/finance` → `FinancePage` | P&L, cash flow, AR aging, AP summary | finance/report endpoints verified | 🟡 Partial | Strong overview, but matrix calls for richer dashboard composition |
| Receivables Dashboard | `/finance` and `/reports` | AR aging and receivable reports | `get_receivable_aging_summary`, `get_accounts_receivable` | 🟡 Partial | Metrics exist, dedicated dashboard absent |
| Payables Dashboard | `/finance` and `/reports` | AP summary and supplier balances | `get_accounts_payable`, `get_supplier_balances` | 🟡 Partial | Metrics exist, dedicated dashboard absent |
| Treasury / Cash Dashboard | `/finance` | cash flow summary only | `get_cash_flow_summary` verified | 🟡 Partial | No reconciliation/transfers/cheque workflow |
| Chart of Accounts | None | no page | no setup API mapping | 🔴 Blocked | Missing accounting setup UI/API evidence |
| Account Groups / Tree | None | no page | no setup API mapping | 🔴 Blocked | Missing setup workflow |
| Fiscal Years | None | no page | no setup API mapping | 🔴 Blocked | Missing setup workflow |
| Cost Centers | None | no page | no setup API mapping | 🔴 Blocked | Missing setup workflow |
| Profit Centers / Departments | None | no page | no setup API mapping | 🔴 Blocked | Missing setup workflow |
| Tax Configuration | None | no page | no setup API mapping | 🔴 Blocked | Missing setup workflow |
| Currency Setup | None | no page | no setup API mapping | 🔴 Blocked | Missing setup workflow |
| Journal Entry List | None | no page | no JE page mapping | 🔴 Blocked | Missing GL workflow |
| Journal Entry Detail / Edit | None | no page | generic CRUD exists but no JE implementation evidence | ⚪ Missing UI | Potential resource-based implementation path |
| Recurring Journal Entries | None | no page | no recurring JE mapping | 🔴 Blocked | Missing workflow support |
| Accrual / Adjustment Entries | None | no page | no accrual UI/API mapping | 🔴 Blocked | Missing workflow support |
| GL Voucher Drilldown | None | no page | no drilldown mapping | 🔴 Blocked | Missing workflow support |
| General Ledger Report | `/reports` → `ReportsPage` | report viewer exists, but no GL report mapped | ⚪ Missing UI | Generic reports page exists, GL report not wired |
| Accounts Receivable Screens | `/finance` and `/reports` | read-only AR reports | AR endpoints verified | 🟡 Partial | No allocation/write-off/reminder workflow |
| Accounts Payable Screens | `/finance` and `/reports` | read-only AP reports | AP endpoints verified | 🟡 Partial | No allocation/payment approval workflow |
| Cash & Bank Screens | None | no page | cash summary endpoint only | 🔴 Blocked | No import/reconciliation/transfer screens |
| Period Closing | None | no page | no close workflow mapping | 🔴 Blocked | Missing period close support |
| Financial Reports | `/finance` and `/reports` | read-only reports implemented | report endpoints verified | 🟡 Partial | Multiple dedicated finance report screens still absent |
| Controls, Audit & Exceptions | None | no page | no override/audit queue mapping | 🔴 Blocked | Missing finance controls UI |

---

## 7. Cross-Module Global Coverage Gap

| Target Screen / Area | Current Route / Page | Frontend Evidence | Backend/API Evidence | Status | Gap Note |
|---|---|---|---|---|---|
| Global Search | None | navbar search is placeholder per action audit | no search API mapping | 🔴 Blocked | UI affordance exists but no handler or backend |
| Notifications | None | notification bell placeholder in navbar | no notification API mapping | 🔴 Blocked | UX affordance exists, no workflow |
| Approvals | None | no dedicated queue page | no approval endpoints mapped | 🔴 Blocked | Common cross-module queue absent |
| Attachments / Document Manager | None | no document manager page | no attachment manager mapping | 🔴 Blocked | Missing cross-record file management UI |
| Activity Log / System Audit | None | no audit explorer page | no audit API mapping in frontend audits | 🔴 Blocked | Missing global traceability UI |
| Settings | `/settings` → `SettingsPage` | UI shell exists | no persistence backend | 🟡 Partial | Screen exists but action is broken |

---

## 8. Template Alignment Gap

The target matrix defines reusable screen templates, but the current frontend mostly consists of standalone, top-level list/report pages.

| Template | Current Evidence | Adoption Status | Gap |
|---|---|---|---|
| Dashboard Template | `DashboardPage`, parts of `FinancePage`, parts of `InventoryPage` | 🟡 Partial | Not standardized per module |
| Master List Template | `SalesPage`, `PurchasesPage`, `CustomersPage`, `SuppliersPage` | 🟡 Partial | Filters, bulk actions, preview drawers, status tabs incomplete |
| Master Detail / 360 Template | none | ⚪ Missing UI | No true detail/360 pages yet |
| Transaction Form Template | none | ⚪ Missing UI | No transaction create/edit forms yet |
| Approval Queue Template | none | ⚪ Missing UI | No queue-based screen pattern implemented |
| Report Template | `ReportsPage` | 🟡 Partial | Saved views/export/print consistency missing |
| Exception Log Template | none | ⚪ Missing UI | No exception log screens implemented |

---

## Recommended Build Order

### Priority 1 — convert list-only modules into usable workflows

1. Sales invoice detail / edit
2. Customer detail / 360
3. Supplier detail / 360
4. Purchase invoice detail / match
5. Settings persistence

### Priority 2 — establish transaction templates

1. Quotation list + detail
2. Sales order list + detail
3. Purchase order list + detail
4. Inventory item list + detail
5. Journal entry list + detail

### Priority 3 — operational control surfaces

1. Approvals queue
2. Outstanding / aging screens
3. Warehouse stock and stock movement screens
4. Dispatch / fulfillment queues
5. Audit and exception logs

### Priority 4 — specialized ERP workflows

1. Returns and inspections
2. RFQ sourcing flows
3. Cash/bank reconciliation
4. Period close
5. Pricing, territory, and assignment administration

---

## Implementation Notes

- The current repo is best described as a **top-level module shell plus reporting/list foundation**, not a full ERP screen implementation.
- Many missing screens can start with existing generic APIs such as `resourceApi.get/create/update`, but workflow-heavy screens will still need dedicated backend support.
- Inventory has the clearest immediate extension path because `get_warehouse_stock()` and `get_stock_movement()` already exist with no frontend consumer.
- Sales, purchases, and finance have the biggest UX gap between current shell coverage and the target component matrix.

---

## Cross-References

- `docs/frontend-component-matrix.md`
- `docs/audits/frontend-screen-inventory.md`
- `docs/audits/frontend-api-mapping.md`
- `docs/audits/frontend-backend-mapping.md`
- `docs/audits/backend-endpoints.md`
- `docs/audits/module-coverage-matrix.md`
- `docs/audits/workflow-coverage.md`

# Frontend Screen Delivery Plan

## Title
Traders — Screen Implementation Delivery Plan

## Purpose
Translate the target screen matrix and the coverage-gap audit into a practical execution plan for frontend delivery.

This document is meant to help the team decide:

- what to build first
- which screens can reuse the existing shell fastest
- which screens are blocked by missing backend behavior
- how to stage delivery by template, workflow, and dependency
- where frontend and backend ownership should split

## Generated From
- `docs/frontend-component-matrix.md`
- `docs/audits/frontend-screen-coverage-gap.md`
- `docs/audits/frontend-screen-inventory.md`
- `docs/audits/frontend-api-mapping.md`
- `docs/audits/frontend-backend-mapping.md`
- `docs/audits/backend-endpoints.md`
- `docs/audits/module-coverage-matrix.md`
- `docs/audits/workflow-coverage.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/ARCHITECTURE.md`
- `docs/architecture/service-layer-map.md`
- `docs/architecture/repository-architecture.md`

## Last Planning Basis
Execution sequencing derived from current frontend shell coverage, reusable Frappe resource APIs, and verified backend endpoint support — 2026-03-16

---

## Current Delivery Snapshot — 2026-03-16

This document began as a forward-looking plan. The current repo has now shipped a substantial portion of that plan, so the table below captures the actual implementation state.

### Phase-by-phase checklist with evidence

| Phase | Progress | Current Status | Evidence in repo |
|---|---:|---|---|
| Phase 0 — Current UI hardening | 90% | Mostly complete. High-visibility routed screens now have meaningful actions and stronger UX patterns. `SettingsPage` persistence remains the clearest carry-over gap. | `frontend/trader-ui/src/pages/CreateCustomerPage.tsx`, `CreateSupplierPage.tsx`, `SalesPage`/`PurchasesPage` adjacent create and detail routes in `src/App.tsx`, richer report screens such as `CustomerOutstandingPage.tsx` |
| Phase 1 — Foundation templates and first detail routes | 85% | Effectively complete in outcome. Shared list/detail/transaction patterns are established even if not formalized as abstract template components. Approval-specific template work is still mostly unrealized. | `frontend/trader-ui/src/pages/CustomerDetailPage.tsx`, `SupplierDetailPage.tsx`, `SalesOrderDetailPage.tsx`, `QuotationDetailPage.tsx`, `CreateSalesOrderPage.tsx`, `CreateJournalEntryPage.tsx` |
| Phase 2 — Fastest ROI screens using current APIs | 100% | Complete. All high-ROI read and detail surfaces called out in this phase are now shipped. | `SalesInvoiceDetailPage.tsx`, `PurchaseInvoiceDetailPage.tsx`, `CustomerDetailPage.tsx`, `SupplierDetailPage.tsx`, `InventoryItemDetailPage.tsx`, `WarehouseStockPage.tsx`, `StockMovementPage.tsx`, `CustomerOutstandingPage.tsx`, `CustomerAgingPage.tsx` |
| Phase 3 — Core transaction workflows | 90% | Largely complete. Quotations, sales orders, purchase orders, journals, payment entries, and receivable/payable action surfaces now support list → detail → create/submit flows. | `QuotationsPage.tsx`, `QuotationDetailPage.tsx`, `SalesOrdersPage.tsx`, `SalesOrderDetailPage.tsx`, `PurchaseOrdersPage.tsx`, `PurchaseOrderDetailPage.tsx`, `JournalEntriesPage.tsx`, `JournalEntryDetailPage.tsx`, `PaymentEntriesPage.tsx`, `PaymentEntryDetailPage.tsx`, `CreateSalesInvoicePage.tsx`, `CreatePurchaseInvoicePage.tsx`, `CreatePaymentEntryPage.tsx` |
| Phase 4 — Approval, queue, and controller surfaces | 45% | Partially complete. Workflow queue behavior, operational drill-ins, and queue-state continuity are shipped, but dedicated approval and exception management surfaces are still largely missing. | `DashboardPage.tsx`, `KPICard.tsx`, `QuotationsPage.tsx`, `SalesOrdersPage.tsx`, `PurchaseOrdersPage.tsx`, plus backend workflow enrichment in `apps/trader_app/trader_app/api/dashboard.py`, `sales.py`, `purchases.py` |
| Phase 5 — Purchasing and warehouse depth | 35% | Partial. Warehouse stock and stock movement are live, and purchase order/invoice workflows are strong, but requisitions, RFQs, receipts, inspections, and planning remain backend-blocked. | `WarehouseStockPage.tsx`, `StockMovementPage.tsx`, `CreatePurchaseOrderPage.tsx`, `PurchaseOrderDetailPage.tsx`, `CreatePurchaseInvoicePage.tsx`, `PurchaseInvoiceDetailPage.tsx` |
| Phase 6 — CRM, pricing, and policy administration | 20% | Early. Customer and supplier management are much stronger than originally audited, but lead/opportunity, pricing, assignment, and policy workflows remain unstarted or backend-blocked. | `CustomersPage` route family in `src/App.tsx`, `CreateCustomerPage.tsx`, `CustomerDetailPage.tsx`, `CreateSupplierPage.tsx`, `SupplierDetailPage.tsx` |
| Phase 7 — Finance operations and close | 35% | Partial. Journal entries, payment entries, outstanding/aging, and treasury-style visibility exist; chart/setup, reconciliation, and period-close surfaces remain outstanding. | `JournalEntriesPage.tsx`, `JournalEntryDetailPage.tsx`, `CreateJournalEntryPage.tsx`, `PaymentEntriesPage.tsx`, `CreatePaymentEntryPage.tsx`, `CustomerOutstandingPage.tsx`, `CustomerAgingPage.tsx` |

### Recent shipped maturity slices beyond the original baseline plan

The current frontend has also moved beyond raw screen coverage into workflow maturity work:

- dashboard workflow KPIs with drill-ins
- workflow-aware filtered queues
- clearable workflow filter banners
- truthful upstream and downstream traceability on details
- linked-document cards with payment / resume-draft shortcuts
- preserved queue context across list → detail → back navigation
- URL-backed queue state for workflow, page, status, and search
- report tab persistence and report-aware drill-in/back behavior
- CRM URL-backed state for customer and supplier list surfaces
- finance-origin controller preservation via explicit source query state
- shared navigation helper extraction for report/list/workflow context checks

Primary evidence:

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

### Navigation architecture note

Since the original planning pass, the frontend has converged on a practical navigation contract for operational continuity:

- list/controller/report state is preserved through an encoded `list` query parameter
- report state uses first-class query params such as `tab`, `receivableSearch`, and `payableSearch`
- CRM list pages preserve URL-backed `search`, `group`, and pagination state
- order controllers preserve workflow queue state through `workflow`
- finance controllers can pass explicit origin with `source=finance`

This is now implemented across CRM detail, invoice detail, payment create/detail, report drill-ins, and finance controller flows. The helper functions in `frontend/trader-ui/src/lib/utils.ts` now centralize the key report/list/workflow context checks to reduce drift.

---

## Planning Model

### Delivery status values

| Status | Meaning |
|---|---|
| Ready | Can begin with current repo capabilities |
| Ready with backend | Needs parallel backend work but scope is clear |
| Blocked | Requires missing backend/workflow design before frontend can proceed |
| Deferred | Valid screen, but lower return than current higher-priority work |

### Priority levels

| Priority | Meaning |
|---|---|
| P0 | Fix or complete broken/high-visibility current screens |
| P1 | Highest-value next workflow screens with strong dependency reuse |
| P2 | Important workflow expansion after core templates are in place |
| P3 | Specialized or downstream screens after foundations stabilize |

### Complexity scale

| Level | Meaning |
|---|---|
| S | Small — list/detail shell, mostly existing data |
| M | Medium — form + table + routing + state orchestration |
| L | Large — multi-panel workflow, linked records, approvals |
| XL | Very large — cross-module workflow, new APIs, or advanced UX |

### Ownership model

| Owner | Responsibility |
|---|---|
| FE | Frontend only or frontend-led implementation |
| FE+BE | Parallel frontend + backend collaboration required |
| BE-first | Backend design/support must land before frontend can start |

---

## Delivery Strategy

The fastest path is not to implement modules one-by-one from scratch.

The fastest path is to deliver in this order:

1. **Stabilize and complete existing pages** that already have routes and user expectations.
2. **Establish reusable screen templates** for list, detail, transaction form, and approval queue.
3. **Expand along workflows with proven backend support first** using `resourceApi` and existing whitelisted endpoints.
4. **Use inventory and finance read APIs as low-risk wins** to create richer operational screens.
5. **Only then move into blocked workflows** such as requisitions, RFQs, approvals, returns, pricing, and period close.

---

## Delivery Workstreams

### Workstream A — Stabilize current shell

Goal: convert placeholder pages into minimally usable screens.

- `SalesPage`
- `PurchasesPage`
- `CustomersPage`
- `SuppliersPage`
- `SettingsPage`
- `ReportsPage` export/save-view readiness

### Workstream B — Build reusable primitives and templates

Goal: create implementation leverage for the rest of the backlog.

- master list template
- master detail / 360 template
- transaction form template
- approval queue template
- common filter bars
- preview drawers
- attachments/comments/audit sections

### Workstream C — Deliver core master/detail workflows

Goal: unlock daily ERP navigation and entity management.

- customer 360
- supplier 360
- item list/detail
- sales invoice detail
- purchase invoice detail

### Workstream D — Deliver core transaction workflows

Goal: establish create/edit/submit patterns across major modules.

- quotations
- sales orders
- purchase orders
- journals
- payment entry surfaces

### Workstream E — Deliver operational and exception views

Goal: expose queues, warehouse operations, and controller screens.

- outstanding / aging
- warehouse stock
- stock movement
- dispatch queues
- approvals
- exceptions

### Workstream F — Deliver blocked specialist workflows

Goal: implement workflows that require significant backend support or design definition.

- leads and opportunities
- RFQs
- goods receipts and three-way match
- returns and inspections
- pricing / promotions
- territory / assignment
- cash & bank reconciliation
- period close

---

## Phase Plan

## Phase 0 — Current UI hardening

**Objective:** finish what users can already see before adding more routes.

**Current shipped state:** Mostly complete (~90%). The frontend has moved beyond simple hardening into working create/detail/action flows for customers, suppliers, sales, purchases, finance, and reports. `SettingsPage` persistence is still the most visible remaining gap from this phase.

### Scope

| Screen / Area | Priority | Template | Complexity | Owner | Delivery Status | Why now |
|---|---|---|---|---|---|---|
| `SettingsPage` persistence | P0 | Settings form | M | FE+BE | Ready with backend | Existing visible broken action |
| `SalesPage` filters/export/new action shell | P0 | Master List | S | FE | Ready | High-visibility page already in nav |
| `PurchasesPage` filters/export/new action shell | P0 | Master List | S | FE | Ready | High-visibility page already in nav |
| `CustomersPage` add/create navigation | P0 | Master List | S | FE | Ready | Existing button is placeholder |
| `SuppliersPage` add/create navigation | P0 | Master List | S | FE | Ready | Existing button is placeholder |
| `ReportsPage` export consistency | P0 | Report Template | S | FE | Ready | Existing useful page missing completion |

### Exit criteria

- no visible placeholder primary buttons on routed pages
- every current page has meaningful action handling or deliberate disabled states
- shared filter, empty-state, loading-state, and error-state patterns exist

**Current evidence:** `frontend/trader-ui/src/pages/CreateCustomerPage.tsx`, `CreateSupplierPage.tsx`, `CreateSalesInvoicePage.tsx`, `CreatePurchaseInvoicePage.tsx`, `CustomerOutstandingPage.tsx`

---

## Phase 1 — Foundation templates and first detail routes

**Objective:** establish the reusable screen architecture for the whole ERP UI.

**Current shipped state:** Substantially complete (~85%). Shared list/detail/transaction patterns are now consistently visible across customer, supplier, quotation, order, journal, payment, invoice, and inventory detail surfaces. Approval-specific queue template work remains mostly future state.

### Scope

| Deliverable | Priority | Template | Complexity | Owner | Delivery Status | Dependencies |
|---|---|---|---|---|---|---|
| Master List Template v1 | P1 | Master List | M | FE | Ready | current list pages |
| Master Detail / 360 Template v1 | P1 | 360 Template | M | FE | Ready | routing + shared detail layout |
| Transaction Form Template v1 | P1 | Transaction Form | L | FE | Ready | shared form/line-item primitives |
| Approval Queue Template v1 | P1 | Approval Queue | M | FE | Ready | warning panel + drawer patterns |
| Attachments / comments / audit sections | P1 | Shared panels | M | FE | Ready | shared tab/panel primitives |
| Quick preview drawer pattern | P1 | Shared drawer | S | FE | Ready | list template |

### Exit criteria

- list page scaffolding reusable by module
- detail pages share a common shell
- transaction forms support header + item grid + summary + tabs
- queue screens can render table + drawer + action pane

**Current evidence:** `frontend/trader-ui/src/pages/CustomerDetailPage.tsx`, `SupplierDetailPage.tsx`, `SalesOrderDetailPage.tsx`, `QuotationDetailPage.tsx`, `CreateSalesOrderPage.tsx`, `CreateJournalEntryPage.tsx`

---

## Phase 2 — Fastest ROI screens using current APIs

**Objective:** deliver the screens with the best value-to-dependency ratio.

**Current shipped state:** Complete (~100%). Every screen called out in this phase now has an implemented frontend route and screen surface in the repo.

### Scope

| Screen | Module | Priority | Template | Complexity | Owner | Delivery Status | Main backend basis |
|---|---|---|---|---|---|---|---|
| Sales Invoice Detail / Edit | Sales | P1 | Transaction Form | M | FE | Ready | generic resource API |
| Customer List upgraded | Customers | P1 | Master List | S | FE | Ready | generic resource API |
| Customer Detail / 360 View | Customers | P1 | 360 Template | M | FE | Ready | `resourceApi.get()` |
| Supplier List upgraded | Suppliers | P1 | Master List | S | FE | Ready | generic resource API |
| Supplier Detail / 360 View | Suppliers | P1 | 360 Template | M | FE | Ready | `resourceApi.get()` |
| Supplier Invoice Detail / Match | Purchases | P1 | Transaction Form | M | FE | Ready | generic resource API |
| Item List | Inventory | P1 | Master List | S | FE | Ready | generic resource API |
| Item Detail / Edit | Inventory | P1 | 360 Template | M | FE | Ready | generic resource API |
| Warehouse Stock View | Inventory | P1 | Master List / Detail hybrid | M | FE | Ready | `get_warehouse_stock()` exists |
| Stock Movement View | Inventory | P1 | Report/List | M | FE | Ready | `get_stock_movement()` exists |
| Customer Outstanding | Sales/Finance | P1 | Report/List | M | FE | Ready | AR reports already exist |
| Customer Aging | Sales/Finance | P1 | Report/List | M | FE | Ready | aging summary exists |

### Why these first

These screens already have one or more of the following:

- existing route-adjacent UI context
- generic CRUD support via Frappe resource endpoints
- existing backend read endpoints with no frontend consumer
- high user value with low workflow ambiguity

**Current evidence:** `frontend/trader-ui/src/pages/SalesInvoiceDetailPage.tsx`, `PurchaseInvoiceDetailPage.tsx`, `CustomerDetailPage.tsx`, `SupplierDetailPage.tsx`, `InventoryItemDetailPage.tsx`, `WarehouseStockPage.tsx`, `StockMovementPage.tsx`, `CustomerOutstandingPage.tsx`, `CustomerAgingPage.tsx`

---

## Phase 3 — Core transaction workflows

**Objective:** move from read-only ERP shell to working transaction management.

**Current shipped state:** Largely complete (~90%). Core commercial and finance transaction flows now support list/detail/create/submit patterns, contextual prefills, linked-document continuity, and action shortcuts. True ERP conversion semantics are still limited by backend constraints, but the frontend compensates with safe prefills and truthful traceability.

### Scope

| Screen | Module | Priority | Template | Complexity | Owner | Delivery Status | Dependencies |
|---|---|---|---|---|---|---|---|
| Quotation List | Sales | P1 | Master List | M | FE | Ready | list template + routing |
| Quotation Detail / Edit | Sales | P1 | Transaction Form | L | FE | Ready | transaction template + generic CRUD |
| Sales Order List | Sales | P1 | Master List | M | FE | Ready | list template |
| Sales Order Detail / Edit | Sales | P1 | Transaction Form | L | FE | Ready | transaction template + generic CRUD |
| Purchase Order List | Purchases | P1 | Master List | M | FE+BE | Ready with backend | route + doctype verification + workflow semantics |
| Purchase Order Detail / Edit | Purchases | P1 | Transaction Form | L | FE+BE | Ready with backend | CRUD + linked requisition/RFQ semantics |
| Journal Entry List | Finance | P2 | Master List | M | FE+BE | Ready with backend | accounting routing/data semantics |
| Journal Entry Detail / Edit | Finance | P2 | Transaction Form | L | FE+BE | Ready with backend | financial posting semantics |
| Customer Payment Entry | Sales/Finance | P2 | Transaction Form | L | FE+BE | Ready with backend | payment workflow endpoint support |
| Accounts Receivable screen set | Finance | P2 | 360 + Report + Form mix | L | FE+BE | Ready with backend | allocation/write-off flows |
| Accounts Payable screen set | Finance | P2 | 360 + Report + Form mix | L | FE+BE | Ready with backend | payment approval flows |

### Exit criteria

- at least one sales transaction workflow can move list → detail → action
- at least one purchase/finance transaction workflow follows the same pattern
- line-item grid interactions are reusable across modules

**Current evidence:** `frontend/trader-ui/src/pages/QuotationsPage.tsx`, `QuotationDetailPage.tsx`, `SalesOrdersPage.tsx`, `SalesOrderDetailPage.tsx`, `PurchaseOrdersPage.tsx`, `PurchaseOrderDetailPage.tsx`, `JournalEntriesPage.tsx`, `JournalEntryDetailPage.tsx`, `PaymentEntriesPage.tsx`, `PaymentEntryDetailPage.tsx`, `CreateSalesOrderPage.tsx`, `CreateSalesInvoicePage.tsx`, `CreatePurchaseOrderPage.tsx`, `CreatePurchaseInvoicePage.tsx`, `CreateJournalEntryPage.tsx`, `CreatePaymentEntryPage.tsx`

---

## Phase 4 — Approval, queue, and controller surfaces

**Objective:** give managers and operations users the screens that control exceptions and throughput.

**Current shipped state:** Partial (~45%). Operational queues and workflow maturity signals are in place, including dashboard KPI drill-ins, filtered workflow queues, and preserved return context. Explicit approval, credit-hold, and audit-explorer surfaces remain largely unimplemented.

### Scope

| Screen | Priority | Template | Complexity | Owner | Delivery Status | Notes |
|---|---|---|---|---|---|---|
| Approvals queue | P1 | Approval Queue | L | FE+BE | Ready with backend | should become shared cross-module surface |
| Sales Order Approval Queue | P2 | Approval Queue | M | FE+BE | Ready with backend | likely specialization of common queue |
| Quotation Approval Queue | P2 | Approval Queue | M | FE+BE | Ready with backend | same queue foundation |
| Pending Orders | P2 | Exception Log/List | M | FE+BE | Ready with backend | operational controller view |
| Ready for Dispatch | P2 | Exception Log/List | M | FE+BE | Ready with backend | warehouse operations queue |
| Orders Awaiting Invoice | P2 | Exception Log/List | M | FE+BE | Ready with backend | downstream billing queue |
| Credit Hold Queue | P2 | Approval/Exception hybrid | M | FE+BE | Ready with backend | risk controls |
| Sales Exception Log | P2 | Exception Log | M | FE+BE | Ready with backend | cross-link to source transactions |
| Finance Controls / Exceptions | P2 | Exception Log | M | FE+BE | Ready with backend | override + audit notes |
| Activity Log / System Audit | P2 | Audit Explorer | M | FE+BE | Ready with backend | useful shared admin screen |

**Current evidence:** `frontend/trader-ui/src/pages/DashboardPage.tsx`, `frontend/trader-ui/src/components/KPICard.tsx`, `frontend/trader-ui/src/pages/QuotationsPage.tsx`, `SalesOrdersPage.tsx`, `PurchaseOrdersPage.tsx`, plus backend queue-enrichment in `apps/trader_app/trader_app/api/dashboard.py`, `sales.py`, `purchases.py`

---

## Phase 5 — Purchasing and warehouse depth

**Objective:** unlock the workflows that make the system operationally credible.

**Current shipped state:** Partial (~35%). Warehouse stock and stock movement are now live, and purchase order/invoice flows are solid. Requisitions, RFQs, receipts, inspections, and planning remain blocked by missing backend workflow contracts.

### Scope

| Screen | Priority | Template | Complexity | Owner | Delivery Status | Notes |
|---|---|---|---|---|---|---|
| Purchase Requisition List | P2 | Master List | M | BE-first | Blocked | workflow not evidenced in audits |
| Purchase Requisition Detail / Edit | P2 | Transaction Form | L | BE-first | Blocked | backend design required |
| RFQ List | P2 | Master List | M | BE-first | Blocked | sourcing workflow absent |
| RFQ Detail | P2 | 360 / Transaction hybrid | L | BE-first | Blocked | sourcing workflow absent |
| Supplier Quotation Entry | P2 | Transaction Form | L | BE-first | Blocked | sourcing workflow absent |
| Supplier Quotation Comparison | P2 | Comparison view | XL | BE-first | Blocked | comparison data model required |
| Goods Receipt List | P2 | Master List | M | BE-first | Blocked | receiving flow absent |
| Goods Receipt Detail | P2 | Transaction Form | L | BE-first | Blocked | receiving + warehouse semantics |
| Quality Inspection | P3 | Checklist / Form | L | BE-first | Blocked | quality workflow absent |
| Rejected Goods | P3 | Exception / Transaction hybrid | L | BE-first | Blocked | dependent on inspection workflow |
| Dispatch Planning | P3 | Planning board | XL | BE-first | Blocked | sequencing/routing workflow absent |
| Delivery Tracking | P3 | Timeline / map | XL | BE-first | Blocked | tracking integration undefined |

**Current evidence:** `frontend/trader-ui/src/pages/WarehouseStockPage.tsx`, `StockMovementPage.tsx`, `CreatePurchaseOrderPage.tsx`, `PurchaseOrderDetailPage.tsx`, `CreatePurchaseInvoicePage.tsx`, `PurchaseInvoiceDetailPage.tsx`

---

## Phase 6 — CRM, pricing, and policy administration

**Objective:** add specialist workflows after core transactions and queues exist.

**Current shipped state:** Early (~20%). Customer and supplier management are now much stronger than the original plan baseline, but lead/opportunity, pricing, assignment, and policy management remain unstarted or backend-blocked.

### Scope

| Screen | Priority | Template | Complexity | Owner | Delivery Status | Notes |
|---|---|---|---|---|---|---|
| Lead List | P3 | Master List | M | BE-first | Blocked | no lead backend evidence |
| Lead Detail | P3 | 360 Template | L | BE-first | Blocked | no lead workflow support |
| Opportunity Pipeline | P3 | Kanban | XL | BE-first | Blocked | no opportunity workflow support |
| Price List | P3 | Master List / Form | M | BE-first | Blocked | pricing admin support absent |
| Pricing Rules | P3 | Rule Builder | L | BE-first | Blocked | pricing logic support absent |
| Discount Rules | P3 | Rule Builder | L | BE-first | Blocked | approval logic absent |
| Promotion Campaigns | P3 | Campaign setup | L | BE-first | Blocked | no campaign workflow |
| Salesperson List | P3 | Master List | M | BE-first | Blocked | no mapped backend support |
| Sales Targets | P3 | Planning grid | L | BE-first | Blocked | no target APIs |
| Territory Management | P3 | Tree + assignment | L | BE-first | Blocked | hierarchy support absent |
| Customer Assignment | P3 | Dual-list assignment | M | BE-first | Blocked | assignment workflow absent |

**Current evidence:** `frontend/trader-ui/src/pages/CreateCustomerPage.tsx`, `CustomerDetailPage.tsx`, `CreateSupplierPage.tsx`, `SupplierDetailPage.tsx`

---

## Phase 7 — Finance operations and close

**Objective:** complete the ERP-grade finance control plane.

**Current shipped state:** Partial (~35%). Journal entries, payment entries, customer outstanding, customer aging, and treasury-style visibility are live. Setup/configuration, reconciliation, and close workflows remain largely blocked.

### Scope

| Screen | Priority | Template | Complexity | Owner | Delivery Status | Notes |
|---|---|---|---|---|---|---|
| Chart of Accounts | P2 | Tree + detail | L | BE-first | Blocked | no setup API inventory |
| Fiscal Years | P2 | Master List / Form | M | BE-first | Blocked | no setup API inventory |
| Cost Centers | P2 | Master List / Tree | M | BE-first | Blocked | no setup API inventory |
| Tax Configuration | P2 | Rule setup | L | BE-first | Blocked | no setup API inventory |
| Currency Setup | P3 | Master List | M | BE-first | Blocked | no setup API inventory |
| Cash & Bank screens | P2 | Reconciliation split view | XL | BE-first | Blocked | summary exists, workflow absent |
| Treasury / Cash Dashboard | P2 | Dashboard Template | M | FE+BE | Ready with backend | can extend current cash flow support |
| Period Closing | P2 | Checklist / approval | XL | BE-first | Blocked | close workflow absent |
| GL Voucher Drilldown | P2 | Detail/report hybrid | M | FE+BE | Ready with backend | useful after GL list/report work |
| General Ledger Report | P2 | Report Template | M | FE+BE | Ready with backend | report viewer exists, GL route missing |

**Current evidence:** `frontend/trader-ui/src/pages/JournalEntriesPage.tsx`, `JournalEntryDetailPage.tsx`, `CreateJournalEntryPage.tsx`, `PaymentEntriesPage.tsx`, `PaymentEntryDetailPage.tsx`, `CreatePaymentEntryPage.tsx`, `CustomerOutstandingPage.tsx`, `CustomerAgingPage.tsx`

---

## Backlog Table — First 20 Screens to Build

This is the recommended ordered implementation queue.

| Order | Screen | Priority | Template | Complexity | Owner | Delivery Status | Reason |
|---|---:|---|---|---|---|---|---|
| 1 | `SettingsPage` persistence | P0 | Settings form | M | FE+BE | Ready with backend | existing visible broken action |
| 2 | Sales invoice list hardening | P0 | Master List | S | FE | Ready | current visible screen |
| 3 | Purchase invoice list hardening | P0 | Master List | S | FE | Ready | current visible screen |
| 4 | Customer list hardening | P0 | Master List | S | FE | Ready | current visible screen |
| 5 | Supplier list hardening | P0 | Master List | S | FE | Ready | current visible screen |
| 6 | Master List Template v1 | P1 | Master List | M | FE | Ready | leverage across many screens |
| 7 | Master Detail / 360 Template v1 | P1 | 360 Template | M | FE | Ready | unlocks detail screens |
| 8 | Transaction Form Template v1 | P1 | Transaction Form | L | FE | Ready | unlocks business transactions |
| 9 | Customer Detail / 360 View | P1 | 360 Template | M | FE | Ready | high-value CRM detail surface |
| 10 | Supplier Detail / 360 View | P1 | 360 Template | M | FE | Ready | high-value procurement detail surface |
| 11 | Item List | P1 | Master List | S | FE | Ready | core inventory navigation |
| 12 | Item Detail / Edit | P1 | 360 Template | M | FE | Ready | foundational master maintenance |
| 13 | Sales Invoice Detail / Edit | P1 | Transaction Form | M | FE | Ready | extends existing sales route naturally |
| 14 | Supplier Invoice Detail / Match | P1 | Transaction Form | M | FE | Ready | extends existing purchase route naturally |
| 15 | Warehouse Stock View | P1 | List/detail hybrid | M | FE | Ready | backend endpoint already exists |
| 16 | Stock Movement View | P1 | Report/List | M | FE | Ready | backend endpoint already exists |
| 17 | Customer Outstanding | P1 | Report/List | M | FE | Ready | strong business value, backed by reports |
| 18 | Customer Aging | P1 | Report/List | M | FE | Ready | strong business value, backed by reports |
| 19 | Quotation List | P1 | Master List | M | FE | Ready | next natural sales expansion |
| 20 | Quotation Detail / Edit | P1 | Transaction Form | L | FE | Ready | first full sales transaction form |

---

## Dependency Map

### Frontend-only dependency chain

1. Master List Template
2. 360 Template
3. Transaction Form Template
4. Preview drawer + summary cards + tabs
5. Shared attachment/comments/audit blocks
6. Module detail screens
7. Transaction screens

### Backend-assisted dependency chain

1. Settings persistence contract
2. Payment entry contracts
3. Approval queue contract
4. Warehouse/stock read model stabilization
5. Purchasing workflow entity contracts
6. CRM/lead/opportunity contracts
7. Finance control and closing contracts

### Strong unblocks already present

These existing backend capabilities should be consumed early:

- `get_warehouse_stock()`
- `get_stock_movement()`
- `get_accounts_receivable()`
- `get_accounts_payable()`
- `get_receivable_aging_summary()`
- generic `resourceApi.get/create/update`

---

## Suggested Team Split

### Frontend pod 1 — Shell and templates

- current page hardening
- list/detail/transaction shared components
- route structure expansion
- shared table/filter/drawer patterns

### Frontend pod 2 — Business workflows

- customer/supplier/item detail flows
- sales invoice and purchase invoice detail flows
- quotation and sales order flows
- report-style operational screens

### Backend pod

- settings persistence
- workflow-specific read/write endpoints where generic CRUD is weak
- approvals contracts
- warehouse operational APIs
- requisition/RFQ/receipt/returns flows
- finance controls and close flows

---

## Risks and sequencing cautions

| Risk | Impact | Mitigation |
|---|---|---|
| Building specialized screens before shared templates | duplicated UI and higher maintenance | finish template phase first |
| Assuming generic CRUD is enough for complex ERP workflows | shallow screens with poor usability | add workflow-specific endpoints where summary/approval logic is needed |
| Deferring settings persistence too long | visible credibility issue | keep as P0 |
| Starting blocked workflows too early | frontend churn and rework | require backend contract before UI implementation |
| Building too many list screens before detail/form surfaces | low product value | pair each list expansion with at least one detail or action screen |

---

## Definition of Done for a Screen

A target screen should count as delivered only when:

- route exists and is accessible from intended navigation
- loading, empty, error, and success states are implemented
- screen uses the expected template pattern consistently
- primary user actions are functional, not placeholders
- API reads/writes are wired to real backend behavior
- basic validation exists for forms and item grids
- audit/attachment/comment panels are added where the target matrix requires them
- screen is reflected in the inventory and gap audit docs

---

## Cross-References

- `docs/frontend-component-matrix.md`
- `docs/audits/frontend-screen-inventory.md`
- `docs/audits/frontend-screen-coverage-gap.md`
- `docs/audits/frontend-api-mapping.md`
- `docs/audits/frontend-backend-mapping.md`
- `docs/audits/backend-endpoints.md`
- `docs/audits/workflow-coverage.md`
- `docs/IMPLEMENTATION_PLAN.md`

# Architecture Findings

## Title
Traders — Architecture Audit Findings and Risk Register

## Purpose
Central register of all architectural issues, gaps, risks, and their resolution status.

## Generated From
Full architecture audit reconciliation of all layers.

## Last Audit Basis
Complete audit — 2026-03-16

---

## Current Critical Issues

No current critical issues are confirmed from the shipped repo state.

## Current High Issues

| ID | Finding | Module | Description | Status |
|---|---|---|---|---|
| FIND-01 | Runtime validation still pending | Demo / Validation | Seed engine and dashboard/report flows exist, but the validation checklist counts and business outputs are not proven by repo inspection alone. | 🔴 Open |

## Current Medium Issues

| ID | Finding | Module | Description | Status |
|---|---|---|---|---|
| FIND-02 | Specialist sales workflows remain exception-thin | Sales | Core quotation → order → dispatch → invoice → return → payment flows are now materially covered, but richer fulfillment exception handling and return exception controls remain incomplete. | ⚠️ Open |
| FIND-03 | Specialist purchase workflows remain exception-thin | Purchases | Core requisition → RFQ → order → receipt → invoice → payment flows are now materially covered, but richer receiving exception handling and quote comparison/selection depth remain incomplete. | ⚠️ Open |
| FIND-04 | Delivery operations remain thin beyond draft dispatch | Inventory | Purchase receipts and sales dispatch drafts now exist, but richer shipment confirmation, exception handling, and execution tracing remain thin. | ⚠️ Open |
| FIND-05 | Operations controller is not exception-complete | Operations | `/operations` now includes approval-focused queues, but richer exception ownership and escalation handling are still absent. | ⚠️ Open |

## Current Low Issues

| ID | Finding | Module | Description | Status |
|---|---|---|---|---|
| FIND-08 | `_get_default_company` duplication | Backend | Default-company helper logic remains duplicated across backend API modules and could be consolidated. | 🔵 Open |
| FIND-09 | Commented-out code in `hooks.py` | Backend | Several inactive configuration sections remain and make architectural intent harder to scan. | 🔵 Open |
| FIND-10 | Reports export/admin polish is lighter than core drill-ins | Reports | Reporting surfaces are operational, but export breadth and admin controls remain lighter than list/detail workflows. | 🔵 Open |
| FIND-11 | Generic CRUD helpers underused | Frontend | Some generic resource helpers remain less used now that domain-specific APIs power most shipped screens. | 🔵 Open |

## Recently Resolved Issues

| ID | Finding | Resolution |
|---|---|---|
| RES-00 | No role-based UI visibility | `authStore`, `Sidebar`, route guards in `App.tsx`, and `permissions.ts` now load Trader roles and gate visible navigation plus routed surfaces by capability. |
| RES-01 | Settings page had no backend persistence | `frontend/trader-ui/src/pages/SettingsPage.tsx` now loads, validates, resets, and saves through `settingsApi`, backed by `apps/trader_app/trader_app/api/settings.py`. |
| RES-02 | Create actions were non-functional across core modules | Create routes and forms now exist for sales invoices, sales orders, purchase invoices, purchase orders, customers, suppliers, journals, and payments. |
| RES-03 | Sales and purchase queue flows were read-only | Queue pages now support row-level drill-ins, create actions, workflow filters, and downstream navigation continuity. |
| RES-04 | Filter/export actions were placeholder-only on core controllers | Sales, purchases, and operations now expose URL-backed filtering/search plus visible CSV export actions. |
| RES-05 | Customer/supplier drill-ins broke upstream workflow context | Preserved `list` context now carries through controller, queue, detail, invoice, and payment flows, including operations-origin back navigation. |
| RES-06 | Global search was non-functional | `Navbar.tsx` now exposes a capability-aware cross-module search suggestion surface that routes into current modules and workflows. |
| RES-07 | Notification bell was decorative | `Navbar.tsx` now opens a workflow notification panel with role-aware follow-up links into approvals and finance views. |
| RES-08 | Operations lacked approval-focused visibility | `OperationsPage.tsx` now includes approval-focused queue cards and `approvalOnly` filtering. |
| RES-09 | Purchase receipt depth was absent | `CreatePurchaseReceiptPage.tsx` and `PurchaseOrderDetailPage.tsx` now create draft `Material Receipt` stock entries through the existing inventory API before billing. |
| RES-10 | Sales dispatch / delivery depth was absent | `CreateSalesDispatchPage.tsx`, `SalesOrderDetailPage.tsx`, and `SalesOrdersPage.tsx` now create draft `Material Issue` stock entries from sales orders through the existing inventory API. |
| RES-11 | Sales return depth was absent | `CreateSalesReturnPage.tsx`, `SalesPage.tsx`, `SalesInvoiceDetailPage.tsx`, and the sales API now create draft return invoices linked by `return_against` for credit-note style reversal flows. |
| RES-12 | Purchase RFQ / requisition depth was absent | `PurchaseRequisitionsPage.tsx`, `CreatePurchaseRequisitionPage.tsx`, `SupplierQuotationsPage.tsx`, `CreateSupplierQuotationPage.tsx`, and new purchase APIs now cover requisition and RFQ draft workflows ahead of purchase orders. |
| RES-13 | Operations approval queues lacked deeper routing | `OperationsPage.tsx` now routes approval / exception cards into concrete sales and procurement review queues, including requisitions and return-review follow-up paths. |

## Needs Manual Verification

| ID | Item | Reason |
|---|---|---|
| MV-01 | DashboardPage `getSalesByItemGroup()` call | Code exists but may be conditional — verify at runtime |
| MV-02 | Frappe DocType permissions | Role-based access via Frappe resource API depends on server-side config — cannot verify from code scan alone |
| MV-03 | CSRF token handling | Cookie parsing implementation — verify in deployed environment |

## Release Blockers

Based on the audit policy, the following are release-blocking:

| Finding | Reason | Waivable? |
|---|---|---|
| FIND-01 (Runtime validation still pending) | Demo/readiness claims remain weaker until seeded data volumes and business outputs are verified in a live environment. | Yes, for development-only or internal preview deployments |

## Summary Statistics

| Severity | Count |
|---|---|
| 🔴 Critical | 0 |
| 🔴 High | 1 |
| ⚠️ Medium | 4 |
| 🔵 Low | 3 |
| **Total** | **8** |
| Needs Manual Verification | 3 |
| Release Blockers | 1 |

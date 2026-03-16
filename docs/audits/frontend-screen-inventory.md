# Frontend Screen Inventory

## Title
Traders — Current Frontend Coverage and Target Screen Component Matrix

## Purpose
Provide a single implementation-grade reference for:

- the routes and screens currently implemented in `frontend/trader-ui`
- the full target ERP UI sitemap by module
- the component building blocks expected on each planned screen

This document is intended for frontend implementation, architecture review, coverage auditing, and AI-assisted scaffolding.

## Generated From
- `frontend/trader-ui/src/App.tsx`
- `frontend/trader-ui/src/pages/*.tsx`
- `frontend/trader-ui/src/layouts/*.tsx`
- product UI sitemap and component matrix supplied on 2026-03-16

## Last Audit Basis
Current route/page scan plus implementation-target component definition — 2026-03-16

---

## How to Read This Document

This inventory has two layers:

1. **Current frontend coverage** — what exists today in the React application.
2. **Target screen component matrix** — the implementation-grade screen map the product should grow into.

Format used in the target matrix:

**Module → Submenu → Screen → Components**

Each target screen is broken into practical UI building blocks such as page header, action bar, KPI cards, filter bar, tabs, data table / grid, form sections, summary panel, side drawer, timeline, attachments, comments, approval panel, and audit trail.

---

## Current Route Inventory

| # | Path | Component | Guard | Layout | Status |
|---|---|---|---|---|---|
| 1 | `/login` | `LoginPage` | None | None | ✅ Active |
| 2 | `/` | `DashboardPage` | `ProtectedRoute` | `DashboardLayout` | ✅ Active |
| 3 | `sales` | `SalesPage` | `ProtectedRoute` | `DashboardLayout` | ✅ Active |
| 4 | `purchases` | `PurchasesPage` | `ProtectedRoute` | `DashboardLayout` | ✅ Active |
| 5 | `inventory` | `InventoryPage` | `ProtectedRoute` | `DashboardLayout` | ✅ Active |
| 6 | `customers` | `CustomersPage` | `ProtectedRoute` | `DashboardLayout` | ✅ Active |
| 7 | `suppliers` | `SuppliersPage` | `ProtectedRoute` | `DashboardLayout` | ✅ Active |
| 8 | `finance` | `FinancePage` | `ProtectedRoute` | `DashboardLayout` | ✅ Active |
| 9 | `reports` | `ReportsPage` | `ProtectedRoute` | `DashboardLayout` | ✅ Active |
| 10 | `settings` | `SettingsPage` | `ProtectedRoute` | `DashboardLayout` | ✅ Active |
| 11 | `*` | `Navigate` redirect to `/` | None | None | ✅ Active |

## Current Screen Details

### `LoginPage` (`/login`)
- **Purpose:** User authentication.
- **Layout:** Standalone.
- **Guard:** None.
- **Actions:** Login form submit, show/hide password.
- **API Calls:** `authApi.login()`, `authApi.getLoggedUser()`.
- **Status:** ✅ Fully functional.

### `DashboardPage` (`/`)
- **Purpose:** Business overview with KPIs, charts, and recent activity.
- **Layout:** `DashboardLayout`.
- **Guard:** `ProtectedRoute`.
- **Actions:** View-only.
- **API Calls:** `dashboardApi.getKPIs()`, `dashboardApi.getSalesTrend()`, `dashboardApi.getTopCustomers()`, `dashboardApi.getRecentOrders()`.
- **Status:** ✅ Fully functional.

### `SalesPage` (`/sales`)
- **Purpose:** Sales invoice list with pagination.
- **Layout:** `DashboardLayout`.
- **Guard:** `ProtectedRoute`.
- **Actions:** View list, paginate. Buttons: New Invoice ⚠️, Filter ⚠️, Export ⚠️.
- **API Calls:** `resourceApi.list({ doctype: 'Sales Invoice' })`.
- **Status:** ⚠️ Read-only — action buttons non-functional.

### `PurchasesPage` (`/purchases`)
- **Purpose:** Purchase invoice list with pagination.
- **Layout:** `DashboardLayout`.
- **Guard:** `ProtectedRoute`.
- **Actions:** View list, paginate. Buttons: New Purchase ⚠️, Filter ⚠️, Export ⚠️.
- **API Calls:** `resourceApi.list({ doctype: 'Purchase Invoice' })`.
- **Status:** ⚠️ Read-only — action buttons non-functional.

### `InventoryPage` (`/inventory`)
- **Purpose:** Stock summary and low-stock alerts.
- **Layout:** `DashboardLayout`.
- **Guard:** `ProtectedRoute`.
- **Actions:** View stock, switch tabs, search items.
- **API Calls:** `inventoryApi.getStockSummary()`, `inventoryApi.getLowStockItems()`.
- **Status:** ✅ Functional read-only screen.

### `CustomersPage` (`/customers`)
- **Purpose:** Customer list as card grid.
- **Layout:** `DashboardLayout`.
- **Guard:** `ProtectedRoute`.
- **Actions:** View list, search, paginate. Button: Add Customer ⚠️.
- **API Calls:** `resourceApi.list({ doctype: 'Customer' })`.
- **Status:** ⚠️ Read-only — Add Customer button non-functional.

### `SuppliersPage` (`/suppliers`)
- **Purpose:** Supplier list as table.
- **Layout:** `DashboardLayout`.
- **Guard:** `ProtectedRoute`.
- **Actions:** View list, search, paginate. Button: Add Supplier ⚠️.
- **API Calls:** `resourceApi.list({ doctype: 'Supplier' })`.
- **Status:** ⚠️ Read-only — Add Supplier button non-functional.

### `FinancePage` (`/finance`)
- **Purpose:** Financial overview with P&L, cash flow, and aging analysis.
- **Layout:** `DashboardLayout`.
- **Guard:** `ProtectedRoute`.
- **Actions:** View-only.
- **API Calls:** `reportsApi.getProfitAndLoss()`, `dashboardApi.getCashFlowSummary()`, `reportsApi.getReceivableAgingSummary()`, `reportsApi.getAccountsPayable()`.
- **Status:** ✅ Fully functional read-only screen.

### `ReportsPage` (`/reports`)
- **Purpose:** Multi-report viewer with report selector.
- **Layout:** `DashboardLayout`.
- **Guard:** `ProtectedRoute`.
- **Actions:** Switch reports, view data. Button: Export ⚠️.
- **API Calls:** `reportsApi.getAccountsReceivable()`, `reportsApi.getAccountsPayable()`, `reportsApi.getMonthlySalesReport()`, `reportsApi.getSupplierBalances()`.
- **Status:** ✅ Functional — export not implemented.

### `SettingsPage` (`/settings`)
- **Purpose:** System configuration forms.
- **Layout:** `DashboardLayout`.
- **Guard:** `ProtectedRoute`.
- **Actions:** Edit form fields, switch sections, Save Changes ⚠️.
- **API Calls:** None.
- **Status:** ⚠️ UI-only — Save button non-functional.

---

## Current Coverage Summary

| Module Area | Current UI Coverage | Gap |
|---|---|---|
| Authentication | Implemented | No major gap in current basic flow |
| Dashboard | Implemented | Dedicated module dashboards still missing |
| Sales | Partial | Mostly list-only; transaction workflows missing |
| Purchases | Partial | Mostly list-only; requisition/PO/GRN flow missing |
| Inventory | Partial | Read-only operational summary; master/transaction screens missing |
| Customers | Partial | 360, financial profile, settings, history screens missing |
| Suppliers | Partial | 360, procurement, quality, financial detail screens missing |
| Finance | Partial | Setup, GL, AR/AP transaction screens, audit controls missing |
| Reports | Partial | Export, saved views, drilldown consistency still missing |
| Settings | Partial | Persistence and admin workflows missing |

---

## Target Screen Component Matrix

This section is the implementation target for the complete ERP UI sitemap.

### Reference source
The detailed cross-module matrix is maintained in `docs/frontend-component-matrix.md`.

### Target coverage summary

| Module | Scope |
|---|---|
| Sales | Dashboards, leads, quotations, orders, dispatch, invoicing, returns, pricing, territory, controls |
| Purchases | Dashboards, requisitions, RFQs, POs, receipts, invoices, returns, payments, exceptions |
| Inventory | Dashboards, item master, warehouses, stock transactions, batch/serial, count, valuation, exceptions |
| Customers | Dashboards, master, contacts, financials, sales settings, history, exceptions |
| Suppliers | Dashboards, master, contacts, financials, procurement settings, performance, exceptions |
| Finance | Dashboards, accounting setup, GL, AR, AP, cash/bank, period close, reports, audit controls |
| Cross-module | Search, notifications, approvals, attachments, audit log, settings |

### Standard reusable templates

- `Dashboard Template`
- `Master List Template`
- `Master Detail / 360 Template`
- `Transaction Form Template`
- `Approval Queue Template`
- `Report Template`
- `Exception Log Template`

Use `docs/frontend-component-matrix.md` as the implementation-grade source for screen-by-screen component composition.

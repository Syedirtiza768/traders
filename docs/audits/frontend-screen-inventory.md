# Frontend Screen Inventory

## Title
Traders — Complete Frontend Screen Inventory

## Purpose
Every screen, route, layout, user actions, and current status in the Traders frontend application.

## Generated From
- `frontend/trader-ui/src/App.tsx`
- `frontend/trader-ui/src/pages/*.tsx`
- `frontend/trader-ui/src/layouts/*.tsx`

## Last Audit Basis
All route definitions and page components — 2026-03-21

---

## Route Inventory

| # | Path | Component | Guard | Layout | Status |
|---|---|---|---|---|---|
| 1 | `/login` | LoginPage | None | None | ✅ Active |
| 2 | `/` | DashboardPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 3 | `sales` | SalesPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 4 | `sales/new` | CreateSalesInvoicePage | ProtectedRoute | DashboardLayout | ✅ Active |
| 5 | `sales/returns/new` | CreateSalesReturnPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 6 | `sales/dispatches/new` | CreateSalesDispatchPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 7 | `sales/orders` | SalesOrdersPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 8 | `sales/orders/new` | CreateSalesOrderPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 9 | `sales/orders/:orderId` | SalesOrderDetailPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 10 | `sales/quotations` | QuotationsPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 11 | `sales/quotations/new` | CreateQuotationPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 12 | `sales/quotations/:quotationId` | QuotationDetailPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 13 | `sales/:invoiceId` | SalesInvoiceDetailPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 14 | `purchases` | PurchasesPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 15 | `purchases/new` | CreatePurchaseInvoicePage | ProtectedRoute | DashboardLayout | ✅ Active |
| 16 | `purchases/returns/new` | CreatePurchaseReturnPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 17 | `purchases/receipts/new` | CreatePurchaseReceiptPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 18 | `purchases/orders` | PurchaseOrdersPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 19 | `purchases/orders/new` | CreatePurchaseOrderPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 20 | `purchases/orders/:orderId` | PurchaseOrderDetailPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 21 | `purchases/requisitions` | PurchaseRequisitionsPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 22 | `purchases/requisitions/new` | CreatePurchaseRequisitionPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 23 | `purchases/rfqs` | SupplierQuotationsPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 24 | `purchases/rfqs/new` | CreateSupplierQuotationPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 25 | `purchases/rfqs/:quotationId` | SupplierQuotationDetailPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 26 | `purchases/:invoiceId` | PurchaseInvoiceDetailPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 27 | `inventory` | InventoryPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 28 | `customers` | CustomersPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 29 | `suppliers` | SuppliersPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 30 | `finance` | FinancePage | ProtectedRoute | DashboardLayout | ✅ Active |
| 31 | `reports` | ReportsPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 32 | `settings` | SettingsPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 33 | `*` | Navigate (redirect to /) | None | None | ✅ Active |
| 34 | `/sales` | SalesPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 35 | `/purchases` | PurchasesPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 36 | `/inventory` | InventoryPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 37 | `/customers` | CustomersPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 38 | `/suppliers` | SuppliersPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 39 | `/finance` | FinancePage | ProtectedRoute | DashboardLayout | ✅ Active |
| 40 | `/reports` | ReportsPage | ProtectedRoute | DashboardLayout | ✅ Active |
| 41 | `/settings` | SettingsPage | ProtectedRoute | DashboardLayout | ✅ Active |

## Screen Details

### LoginPage (`/login`)
- **Purpose:** User authentication
- **Layout:** Standalone (no DashboardLayout)
- **Guard:** None (public)
- **Actions:** Login form submit, show/hide password
- **API Calls:** `authApi.login()`, `authApi.getLoggedUser()`
- **Status:** ✅ Fully functional

### DashboardPage (`/`)
- **Purpose:** Business overview with KPIs, charts, and recent activity
- **Layout:** DashboardLayout (Navbar + Sidebar)
- **Guard:** ProtectedRoute
- **Actions:** View-only (no mutations)
- **API Calls:** `dashboardApi.getKPIs()`, `dashboardApi.getSalesTrend()`, `dashboardApi.getTopCustomers()`, `dashboardApi.getRecentOrders()`
- **Status:** ✅ Fully functional

### SalesPage (`/sales`)
- **Purpose:** Sales invoice list with pagination
- **Layout:** DashboardLayout
- **Guard:** ProtectedRoute
- **Actions:** View list, paginate. Buttons: New Invoice ⚠️, Filter ⚠️, Export ⚠️
- **API Calls:** `resourceApi.list({ doctype: 'Sales Invoice' })`
- **Status:** ⚠️ Read-only — action buttons non-functional

### PurchasesPage (`/purchases`)
- **Purpose:** Purchase invoice list with pagination
- **Layout:** DashboardLayout
- **Guard:** ProtectedRoute
- **Actions:** View list, paginate. Buttons: New Purchase ⚠️, Filter ⚠️, Export ⚠️
- **API Calls:** `resourceApi.list({ doctype: 'Purchase Invoice' })`
- **Status:** ⚠️ Read-only — action buttons non-functional

### InventoryPage (`/inventory`)
- **Purpose:** Stock summary and low-stock alerts
- **Layout:** DashboardLayout
- **Guard:** ProtectedRoute
- **Actions:** View stock, switch tabs (All/Low), search items
- **API Calls:** `inventoryApi.getStockSummary()`, `inventoryApi.getLowStockItems()`
- **Status:** ✅ Functional (read-only by design)

### CustomersPage (`/customers`)
- **Purpose:** Customer list as card grid
- **Layout:** DashboardLayout
- **Guard:** ProtectedRoute
- **Actions:** View list, search, paginate. Button: Add Customer ⚠️
- **API Calls:** `resourceApi.list({ doctype: 'Customer' })`
- **Status:** ⚠️ Read-only — Add Customer button non-functional

### SuppliersPage (`/suppliers`)
- **Purpose:** Supplier list as table
- **Layout:** DashboardLayout
- **Guard:** ProtectedRoute
- **Actions:** View list, search, paginate. Button: Add Supplier ⚠️
- **API Calls:** `resourceApi.list({ doctype: 'Supplier' })`
- **Status:** ⚠️ Read-only — Add Supplier button non-functional

### FinancePage (`/finance`)
- **Purpose:** Financial overview with P&L, cash flow, aging analysis
- **Layout:** DashboardLayout
- **Guard:** ProtectedRoute
- **Actions:** View-only
- **API Calls:** `reportsApi.getProfitAndLoss()`, `dashboardApi.getCashFlowSummary()`, `reportsApi.getReceivableAgingSummary()`, `reportsApi.getAccountsPayable()`
- **Status:** ✅ Fully functional (read-only)

### ReportsPage (`/reports`)
- **Purpose:** Multi-report viewer with report selector
- **Layout:** DashboardLayout
- **Guard:** ProtectedRoute
- **Actions:** Switch reports, view data. Button: Export ⚠️
- **API Calls:** `reportsApi.getAccountsReceivable()`, `reportsApi.getAccountsPayable()`, `reportsApi.getMonthlySalesReport()`, `reportsApi.getSupplierBalances()`
- **Status:** ✅ Functional (export not implemented)

### SettingsPage (`/settings`)
- **Purpose:** System configuration forms
- **Layout:** DashboardLayout
- **Guard:** ProtectedRoute
- **Actions:** Edit form fields, switch sections, Save Changes ⚠️
- **API Calls:** ❌ None — no backend persistence
- **Status:** ⚠️ UI-only — Save button non-functional

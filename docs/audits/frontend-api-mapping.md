# Frontend API Mapping

## Title
Traders — Frontend API Call Inventory

## Purpose
All frontend API calls, their originating screens, HTTP methods, and target endpoints.

## Generated From
- `frontend/trader-ui/src/lib/api.ts`
- `frontend/trader-ui/src/pages/*.tsx`
- `frontend/trader-ui/src/stores/authStore.ts`

## Last Audit Basis
Full scan of all API namespaces and page-level call sites — 2026-03-16

---

## API Namespaces

### `authApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `login` | POST | `/method/login` | usr: string, pwd: string |
| `logout` | POST | `/method/logout` | — |
| `getLoggedUser` | GET | `/method/frappe.auth.get_logged_user` | — |

### `dashboardApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getKPIs` | GET | `/method/trader_app.api.dashboard.get_dashboard_kpis` | — |
| `getSalesTrend` | GET | `/method/trader_app.api.dashboard.get_sales_trend` | — |
| `getTopCustomers` | GET | `/method/trader_app.api.dashboard.get_top_customers?limit={param}` | limit = 10 |
| `getRecentOrders` | GET | `/method/trader_app.api.dashboard.get_recent_orders?limit={param}` | limit = 20 |
| `getSalesByItemGroup` | GET | `/method/trader_app.api.dashboard.get_sales_by_item_group` | — |
| `getCashFlowSummary` | GET | `/method/trader_app.api.dashboard.get_cash_flow_summary` | — |

### `resourceApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `list` | GET | `/resource/{param}?{param}` | { doctype, fields, filters, orderBy, limit = 20, offset = 0 }: ListParams |
| `get` | GET | `/resource/{param}/{param}` | doctype: string, name: string |
| `create` | POST | `/resource/{param}` | doctype: string, data: Record<string, any> |
| `update` | PUT | `/resource/{param}/{param}` | doctype: string, name: string, data: Record<string, any> |
| `delete` | DELETE | `/resource/{param}/{param}` | doctype: string, name: string |
| `count` | GET | `/method/frappe.client.get_count?doctype={param}&{param}` | doctype: string, filters?: Record<string, any>[] |

### `inventoryApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getStockSummary` | GET | `/method/trader_app.api.inventory.get_stock_summary{param}` | warehouse?: string |
| `getLowStockItems` | GET | `/method/trader_app.api.inventory.get_low_stock_items?limit={param}` | limit = 50 |
| `getWarehouseStock` | GET | `/method/trader_app.api.inventory.get_warehouse_stock?warehouse={param}` | warehouse: string |

### `reportsApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getAccountsReceivable` | GET | `/method/trader_app.api.reports.get_accounts_receivable?limit={param}` | limit = 50 |
| `getAccountsPayable` | GET | `/method/trader_app.api.reports.get_accounts_payable?limit={param}` | limit = 50 |
| `getProfitAndLoss` | GET | `/method/trader_app.api.reports.get_profit_and_loss?{param}` | fromDate?: string, toDate?: string |
| `getReceivableAgingSummary` | GET | `/method/trader_app.api.reports.get_receivable_aging_summary` | — |
| `getMonthlySalesReport` | GET | `/method/trader_app.api.reports.get_monthly_sales_report{param}` | year?: number |
| `getSupplierBalances` | GET | `/method/trader_app.api.reports.get_supplier_balances?limit={param}` | limit = 50 |

## Page → API Usage Map

| Page | Imported APIs | API Calls Made |
|---|---|---|
| LoginPage | authApi (via authStore) | `authApi.login()`, `authApi.getLoggedUser()` |
| DashboardPage | dashboardApi | `getKPIs()`, `getSalesTrend()`, `getTopCustomers()`, `getRecentOrders()` |
| SalesPage | resourceApi | `resourceApi.list({ doctype: 'Sales Invoice' })` |
| PurchasesPage | resourceApi | `resourceApi.list({ doctype: 'Purchase Invoice' })` |
| InventoryPage | inventoryApi | `getStockSummary()`, `getLowStockItems()` |
| CustomersPage | resourceApi | `resourceApi.list({ doctype: 'Customer' })` |
| SuppliersPage | resourceApi | `resourceApi.list({ doctype: 'Supplier' })` |
| FinancePage | reportsApi, dashboardApi | `getProfitAndLoss()`, `getCashFlowSummary()`, `getReceivableAgingSummary()`, `getAccountsPayable()` |
| ReportsPage | reportsApi | `getAccountsReceivable()`, `getAccountsPayable()`, `getMonthlySalesReport()`, `getSupplierBalances()` |
| SettingsPage | ❌ None | ❌ No API calls |

## API Methods Without Page Consumers

| Namespace | Method | Endpoint | Status |
|---|---|---|---|
| dashboardApi | `getSalesByItemGroup()` | `get_sales_by_item_group` | ⚠️ Defined but DashboardPage may not call it |
| inventoryApi | `getWarehouseStock()` | `get_warehouse_stock` | ⚠️ Not called from any page |
| resourceApi | `create()` | `POST /api/resource/{doctype}` | ⚠️ Defined but no page calls it |
| resourceApi | `update()` | `PUT /api/resource/{doctype}/{name}` | ⚠️ Defined but no page calls it |
| resourceApi | `delete()` | `DELETE /api/resource/{doctype}/{name}` | ⚠️ Defined but no page calls it |
| resourceApi | `count()` | `GET frappe.client.get_count` | ⚠️ Defined but no page calls it |

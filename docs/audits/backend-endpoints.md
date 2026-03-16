# Backend Endpoints

## Title
Traders — Backend Endpoint Inventory

## Purpose
All backend API routes, their handlers, parameters, accessed entities, and frontend reachability.

## Generated From
- `apps/trader_app/trader_app/api/dashboard.py`
- `apps/trader_app/trader_app/api/inventory.py`
- `apps/trader_app/trader_app/api/reports.py`

## Last Audit Basis
All `@frappe.whitelist()` decorated functions — 2026-03-16

---

## Custom Whitelisted Endpoints

| # | Function | Module | API URL | Parameters | Entities | Frontend Consumer |
|---|---|---|---|---|---|---|
| 1 | `get_dashboard_kpis` | dashboard | `/api/method/trader_app.api.dashboard.get_dashboard_kpis` | none | — | DashboardPage → dashboardApi.getKPIs() |
| 2 | `get_sales_trend` | dashboard | `/api/method/trader_app.api.dashboard.get_sales_trend` | none | Sales Invoice | DashboardPage → dashboardApi.getSalesTrend() |
| 3 | `get_top_customers` | dashboard | `/api/method/trader_app.api.dashboard.get_top_customers` | limit=10 | Sales Invoice | DashboardPage → dashboardApi.getTopCustomers() |
| 4 | `get_recent_orders` | dashboard | `/api/method/trader_app.api.dashboard.get_recent_orders` | limit=20 | Sales Order | DashboardPage → dashboardApi.getRecentOrders() |
| 5 | `get_sales_by_item_group` | dashboard | `/api/method/trader_app.api.dashboard.get_sales_by_item_group` | none | Sales Invoice Item, Sales Invoice | DashboardPage → dashboardApi.getSalesByItemGroup() |
| 6 | `get_cash_flow_summary` | dashboard | `/api/method/trader_app.api.dashboard.get_cash_flow_summary` | none | Payment Entry | DashboardPage, FinancePage → dashboardApi.getCashFlowSummary() |
| 7 | `get_stock_summary` | inventory | `/api/method/trader_app.api.inventory.get_stock_summary` | warehouse=None | Bin, Item, Warehouse | InventoryPage → inventoryApi.getStockSummary() |
| 8 | `get_low_stock_items` | inventory | `/api/method/trader_app.api.inventory.get_low_stock_items` | limit=50 | Bin, Item, Warehouse, Item Reorder | InventoryPage → inventoryApi.getLowStockItems() |
| 9 | `get_warehouse_stock` | inventory | `/api/method/trader_app.api.inventory.get_warehouse_stock` | warehouse | Bin, Item | ⚠️ No frontend consumer |
| 10 | `get_stock_movement` | inventory | `/api/method/trader_app.api.inventory.get_stock_movement` | item_code=None, warehouse=None, from_date=None, to_date=None | Stock Ledger Entry, Item | ⚠️ No frontend consumer |
| 11 | `get_accounts_receivable` | reports | `/api/method/trader_app.api.reports.get_accounts_receivable` | limit=50 | Sales Invoice | ReportsPage → reportsApi.getAccountsReceivable() |
| 12 | `get_accounts_payable` | reports | `/api/method/trader_app.api.reports.get_accounts_payable` | limit=50 | Purchase Invoice | ReportsPage, FinancePage → reportsApi.getAccountsPayable() |
| 13 | `get_profit_and_loss` | reports | `/api/method/trader_app.api.reports.get_profit_and_loss` | from_date=None, to_date=None | GL Entry, Account | FinancePage → reportsApi.getProfitAndLoss() |
| 14 | `get_receivable_aging_summary` | reports | `/api/method/trader_app.api.reports.get_receivable_aging_summary` | none | Sales Invoice | FinancePage → reportsApi.getReceivableAgingSummary() |
| 15 | `get_monthly_sales_report` | reports | `/api/method/trader_app.api.reports.get_monthly_sales_report` | year=None | Sales Invoice | ReportsPage → reportsApi.getMonthlySalesReport() |
| 16 | `get_supplier_balances` | reports | `/api/method/trader_app.api.reports.get_supplier_balances` | limit=50 | Purchase Invoice | ReportsPage → reportsApi.getSupplierBalances() |

## Frappe Built-in Endpoints Used

| # | Endpoint Pattern | Method | Usage |
|---|---|---|---|
| 1 | `POST /api/method/login` | POST | Authentication |
| 2 | `POST /api/method/logout` | POST | Session termination |
| 3 | `GET /api/method/frappe.auth.get_logged_user` | GET | Session validation |
| 4 | `GET /api/resource/{doctype}` | GET | List documents (Sales Invoice, Purchase Invoice, Customer, Supplier) |
| 5 | `GET /api/resource/{doctype}/{name}` | GET | Get single document |
| 6 | `POST /api/resource/{doctype}` | POST | Create document (⚠️ defined but unused) |
| 7 | `PUT /api/resource/{doctype}/{name}` | PUT | Update document (⚠️ defined but unused) |
| 8 | `DELETE /api/resource/{doctype}/{name}` | DELETE | Delete document (⚠️ defined but unused) |
| 9 | `GET /api/method/frappe.client.get_count` | GET | Count documents (⚠️ defined but unused) |

## Endpoint Summary

| Category | Count |
|---|---|
| Custom whitelisted endpoints | 16 |
| With frontend consumer | 14 |
| Without frontend consumer (orphan) | 2 |
| Frappe built-in endpoints used | 4 (active) + 5 (defined, unused) |

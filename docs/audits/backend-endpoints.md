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
| 1 | `get_customers` | customers | `/api/method/trader_app.api.customers.get_customers` | page=1, page_size=20, search=None, customer_group=None | Customer, Sales Invoice | 🔍 Unknown |
| 2 | `get_customer_detail` | customers | `/api/method/trader_app.api.customers.get_customer_detail` | name | Sales Invoice | 🔍 Unknown |
| 3 | `get_customer_groups` | customers | `/api/method/trader_app.api.customers.get_customer_groups` | none | — | 🔍 Unknown |
| 4 | `get_customer_transactions` | customers | `/api/method/trader_app.api.customers.get_customer_transactions` | customer, company=None, page=1, page_size=20 | Sales Invoice | 🔍 Unknown |
| 5 | `create_customer` | customers | `/api/method/trader_app.api.customers.create_customer` | customer_name, customer_group=None, territory=None, mobile_no=None, email_id=None | — | 🔍 Unknown |
| 6 | `disable_customer` | customers | `/api/method/trader_app.api.customers.disable_customer` | name | — | 🔍 Unknown |
| 7 | `enable_customer` | customers | `/api/method/trader_app.api.customers.enable_customer` | name | — | 🔍 Unknown |
| 8 | `get_kpis` | dashboard | `/api/method/trader_app.api.dashboard.get_kpis` | company=None | Sales Invoice, Purchase Invoice, Bin, Warehouse, Quotation, Sales Order, Purchase Order | 🔍 Unknown |
| 9 | `get_sales_trend` | dashboard | `/api/method/trader_app.api.dashboard.get_sales_trend` | company=None, months=12 | Sales Invoice | DashboardPage → dashboardApi.getSalesTrend() |
| 10 | `get_top_customers` | dashboard | `/api/method/trader_app.api.dashboard.get_top_customers` | company=None, limit=8 | Sales Invoice | DashboardPage → dashboardApi.getTopCustomers() |
| 11 | `get_recent_orders` | dashboard | `/api/method/trader_app.api.dashboard.get_recent_orders` | company=None, limit=10 | Sales Invoice | DashboardPage → dashboardApi.getRecentOrders() |
| 12 | `get_cash_flow_summary` | dashboard | `/api/method/trader_app.api.dashboard.get_cash_flow_summary` | company=None, months=12 | Payment Entry | DashboardPage, FinancePage → dashboardApi.getCashFlowSummary() |
| 13 | `get_inventory_summary` | dashboard | `/api/method/trader_app.api.dashboard.get_inventory_summary` | company=None | Warehouse, Bin | 🔍 Unknown |
| 14 | `get_payment_entry_detail` | finance | `/api/method/trader_app.api.finance.get_payment_entry_detail` | name | — | 🔍 Unknown |
| 15 | `get_payment_entry_setup` | finance | `/api/method/trader_app.api.finance.get_payment_entry_setup` | company=None | — | 🔍 Unknown |
| 16 | `submit_payment_entry` | finance | `/api/method/trader_app.api.finance.submit_payment_entry` | name | — | 🔍 Unknown |
| 17 | `get_journal_entry_detail` | finance | `/api/method/trader_app.api.finance.get_journal_entry_detail` | name | — | 🔍 Unknown |
| 18 | `get_accounts` | finance | `/api/method/trader_app.api.finance.get_accounts` | company=None, search=None, limit=100 | Account | 🔍 Unknown |
| 19 | `submit_journal_entry` | finance | `/api/method/trader_app.api.finance.submit_journal_entry` | name | — | 🔍 Unknown |
| 20 | `cancel_payment_entry` | finance | `/api/method/trader_app.api.finance.cancel_payment_entry` | name | — | 🔍 Unknown |
| 21 | `cancel_journal_entry` | finance | `/api/method/trader_app.api.finance.cancel_journal_entry` | name | — | 🔍 Unknown |
| 22 | `get_outstanding_summary` | finance | `/api/method/trader_app.api.finance.get_outstanding_summary` | company=None | Sales Invoice, Purchase Invoice | 🔍 Unknown |
| 23 | `get_items` | inventory | `/api/method/trader_app.api.inventory.get_items` | item_group=None, page=1, page_size=20, search=None | Item, Item Price | 🔍 Unknown |
| 24 | `get_warehouses` | inventory | `/api/method/trader_app.api.inventory.get_warehouses` | company=None | Warehouse, Bin | 🔍 Unknown |
| 25 | `get_inventory_summary` | inventory | `/api/method/trader_app.api.inventory.get_inventory_summary` | company=None | Bin, Warehouse, Item | 🔍 Unknown |
| 26 | `get_low_stock_items` | inventory | `/api/method/trader_app.api.inventory.get_low_stock_items` | company=None, threshold=10, page=1, page_size=20 | Bin, Warehouse, Item | InventoryPage → inventoryApi.getLowStockItems() |
| 27 | `get_item_groups` | inventory | `/api/method/trader_app.api.inventory.get_item_groups` | none | — | 🔍 Unknown |
| 28 | `get_item_detail` | inventory | `/api/method/trader_app.api.inventory.get_item_detail` | item_code | Bin, Warehouse | 🔍 Unknown |
| 29 | `create_stock_entry` | inventory | `/api/method/trader_app.api.inventory.create_stock_entry` | purpose, items, company=None, posting_date=None | — | 🔍 Unknown |
| 30 | `get_purchase_invoice_detail` | purchases | `/api/method/trader_app.api.purchases.get_purchase_invoice_detail` | name | — | 🔍 Unknown |
| 31 | `get_material_request_detail` | purchases | `/api/method/trader_app.api.purchases.get_material_request_detail` | name | — | 🔍 Unknown |
| 32 | `get_supplier_quotation_detail` | purchases | `/api/method/trader_app.api.purchases.get_supplier_quotation_detail` | name | — | 🔍 Unknown |
| 33 | `get_purchase_order_detail` | purchases | `/api/method/trader_app.api.purchases.get_purchase_order_detail` | name | — | 🔍 Unknown |
| 34 | `create_purchase_order_from_supplier_quotation` | purchases | `/api/method/trader_app.api.purchases.create_purchase_order_from_supplier_quotation` | name, company=None, transaction_date=None, schedule_date=None | — | 🔍 Unknown |
| 35 | `create_material_request` | purchases | `/api/method/trader_app.api.purchases.create_material_request` | items, company=None, transaction_date=None, schedule_date=None, title=None | — | 🔍 Unknown |
| 36 | `submit_purchase_invoice` | purchases | `/api/method/trader_app.api.purchases.submit_purchase_invoice` | name | — | 🔍 Unknown |
| 37 | `submit_purchase_order` | purchases | `/api/method/trader_app.api.purchases.submit_purchase_order` | name | — | 🔍 Unknown |
| 38 | `submit_material_request` | purchases | `/api/method/trader_app.api.purchases.submit_material_request` | name | — | 🔍 Unknown |
| 39 | `submit_supplier_quotation` | purchases | `/api/method/trader_app.api.purchases.submit_supplier_quotation` | name | — | 🔍 Unknown |
| 40 | `cancel_purchase_invoice` | purchases | `/api/method/trader_app.api.purchases.cancel_purchase_invoice` | name | — | 🔍 Unknown |
| 41 | `cancel_purchase_order` | purchases | `/api/method/trader_app.api.purchases.cancel_purchase_order` | name | — | 🔍 Unknown |
| 42 | `get_purchase_summary` | purchases | `/api/method/trader_app.api.purchases.get_purchase_summary` | company=None | Purchase Invoice | 🔍 Unknown |
| 43 | `get_customer_ledger` | reports | `/api/method/trader_app.api.reports.get_customer_ledger` | customer, company=None, from_date=None, to_date=None | GL Entry | 🔍 Unknown |
| 44 | `get_supplier_ledger` | reports | `/api/method/trader_app.api.reports.get_supplier_ledger` | supplier, company=None, from_date=None, to_date=None | GL Entry | 🔍 Unknown |
| 45 | `get_receivable_aging` | reports | `/api/method/trader_app.api.reports.get_receivable_aging` | company=None | Sales Invoice | 🔍 Unknown |
| 46 | `get_receivable_aging_detail` | reports | `/api/method/trader_app.api.reports.get_receivable_aging_detail` | company=None, page=1, page_size=20 | Sales Invoice | 🔍 Unknown |
| 47 | `get_payable_aging` | reports | `/api/method/trader_app.api.reports.get_payable_aging` | company=None | Purchase Invoice | 🔍 Unknown |
| 48 | `get_profit_and_loss` | reports | `/api/method/trader_app.api.reports.get_profit_and_loss` | company=None, from_date=None, to_date=None | — | FinancePage → reportsApi.getProfitAndLoss() |
| 49 | `get_accounts_payable` | reports | `/api/method/trader_app.api.reports.get_accounts_payable` | company=None | — | ReportsPage, FinancePage → reportsApi.getAccountsPayable() |
| 50 | `get_sales_invoice_detail` | sales | `/api/method/trader_app.api.sales.get_sales_invoice_detail` | name | — | 🔍 Unknown |
| 51 | `get_sales_order_detail` | sales | `/api/method/trader_app.api.sales.get_sales_order_detail` | name | — | 🔍 Unknown |
| 52 | `get_quotation_detail` | sales | `/api/method/trader_app.api.sales.get_quotation_detail` | name | — | 🔍 Unknown |
| 53 | `submit_sales_invoice` | sales | `/api/method/trader_app.api.sales.submit_sales_invoice` | name | — | 🔍 Unknown |
| 54 | `submit_sales_order` | sales | `/api/method/trader_app.api.sales.submit_sales_order` | name | — | 🔍 Unknown |
| 55 | `cancel_sales_invoice` | sales | `/api/method/trader_app.api.sales.cancel_sales_invoice` | name | — | 🔍 Unknown |
| 56 | `cancel_sales_order` | sales | `/api/method/trader_app.api.sales.cancel_sales_order` | name | — | 🔍 Unknown |
| 57 | `submit_quotation` | sales | `/api/method/trader_app.api.sales.submit_quotation` | name | — | 🔍 Unknown |
| 58 | `get_sales_summary` | sales | `/api/method/trader_app.api.sales.get_sales_summary` | company=None | Sales Invoice | 🔍 Unknown |
| 59 | `get_settings` | settings | `/api/method/trader_app.api.settings.get_settings` | none | — | 🔍 Unknown |
| 60 | `save_settings` | settings | `/api/method/trader_app.api.settings.save_settings` | data=None | — | 🔍 Unknown |
| 61 | `get_suppliers` | suppliers | `/api/method/trader_app.api.suppliers.get_suppliers` | page=1, page_size=20, search=None, supplier_group=None | Supplier, Purchase Invoice | 🔍 Unknown |
| 62 | `get_supplier_detail` | suppliers | `/api/method/trader_app.api.suppliers.get_supplier_detail` | name | Purchase Invoice | 🔍 Unknown |
| 63 | `get_supplier_groups` | suppliers | `/api/method/trader_app.api.suppliers.get_supplier_groups` | none | — | 🔍 Unknown |
| 64 | `get_supplier_transactions` | suppliers | `/api/method/trader_app.api.suppliers.get_supplier_transactions` | supplier, company=None, page=1, page_size=20 | Purchase Invoice | 🔍 Unknown |
| 65 | `create_supplier` | suppliers | `/api/method/trader_app.api.suppliers.create_supplier` | supplier_name, supplier_group=None, country=None, mobile_no=None, email_id=None | — | 🔍 Unknown |
| 66 | `disable_supplier` | suppliers | `/api/method/trader_app.api.suppliers.disable_supplier` | name | — | 🔍 Unknown |
| 67 | `enable_supplier` | suppliers | `/api/method/trader_app.api.suppliers.enable_supplier` | name | — | 🔍 Unknown |

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
| Custom whitelisted endpoints | 67 |
| With frontend consumer | 67 |
| Without frontend consumer (orphan) | 0 |
| Frappe built-in endpoints used | 4 (active) + 5 (defined, unused) |

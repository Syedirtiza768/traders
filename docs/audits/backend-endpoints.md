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
All `@frappe.whitelist()` decorated functions — 2026-07-03

---

## Custom Whitelisted Endpoints

| # | Function | Module | API URL | Parameters | Entities | Frontend Consumer |
|---|---|---|---|---|---|---|
| 1 | `get_users` | admin | `/api/method/trader_app.api.admin.get_users` | search=None, page=1, page_size=20 | User, Has Role | 🔍 Unknown |
| 2 | `get_user_detail` | admin | `/api/method/trader_app.api.admin.get_user_detail` | user | — | 🔍 Unknown |
| 3 | `create_user` | admin | `/api/method/trader_app.api.admin.create_user` | data=None | — | 🔍 Unknown |
| 4 | `update_user` | admin | `/api/method/trader_app.api.admin.update_user` | data=None | — | 🔍 Unknown |
| 5 | `set_user_enabled` | admin | `/api/method/trader_app.api.admin.set_user_enabled` | user, enabled=1 | — | 🔍 Unknown |
| 6 | `get_all_roles` | admin | `/api/method/trader_app.api.admin.get_all_roles` | none | Role | 🔍 Unknown |
| 7 | `get_role_users` | admin | `/api/method/trader_app.api.admin.get_role_users` | role | Has Role, User | 🔍 Unknown |
| 8 | `assign_role_to_user` | admin | `/api/method/trader_app.api.admin.assign_role_to_user` | user, role | — | 🔍 Unknown |
| 9 | `remove_role_from_user` | admin | `/api/method/trader_app.api.admin.remove_role_from_user` | user, role | — | 🔍 Unknown |
| 10 | `get_company_settings` | admin | `/api/method/trader_app.api.admin.get_company_settings` | company=None | — | 🔍 Unknown |
| 11 | `save_company_settings` | admin | `/api/method/trader_app.api.admin.save_company_settings` | data=None | — | 🔍 Unknown |
| 12 | `get_fiscal_years` | admin | `/api/method/trader_app.api.admin.get_fiscal_years` | none | — | 🔍 Unknown |
| 13 | `create_fiscal_year` | admin | `/api/method/trader_app.api.admin.create_fiscal_year` | data=None | — | 🔍 Unknown |
| 14 | `set_active_fiscal_year` | admin | `/api/method/trader_app.api.admin.set_active_fiscal_year` | name | — | 🔍 Unknown |
| 15 | `get_warehouses` | admin | `/api/method/trader_app.api.admin.get_warehouses` | company=None | Warehouse | 🔍 Unknown |
| 16 | `create_warehouse` | admin | `/api/method/trader_app.api.admin.create_warehouse` | data=None | — | 🔍 Unknown |
| 17 | `update_warehouse` | admin | `/api/method/trader_app.api.admin.update_warehouse` | data=None | — | 🔍 Unknown |
| 18 | `get_accounting_settings` | admin | `/api/method/trader_app.api.admin.get_accounting_settings` | none | — | 🔍 Unknown |
| 19 | `save_accounting_settings` | admin | `/api/method/trader_app.api.admin.save_accounting_settings` | data=None | — | 🔍 Unknown |
| 20 | `get_item_bundles` | bundling | `/api/method/trader_app.api.bundling.get_item_bundles` | search=None, page=1, page_size=50 | Item Bundle, Item Bundle Detail | 🔍 Unknown |
| 21 | `get_item_bundle_detail` | bundling | `/api/method/trader_app.api.bundling.get_item_bundle_detail` | name | — | 🔍 Unknown |
| 22 | `create_item_bundle` | bundling | `/api/method/trader_app.api.bundling.create_item_bundle` | bundle_name, description, items | — | 🔍 Unknown |
| 23 | `update_item_bundle` | bundling | `/api/method/trader_app.api.bundling.update_item_bundle` | name, bundle_name=None, description=None, items=None | — | 🔍 Unknown |
| 24 | `delete_item_bundle` | bundling | `/api/method/trader_app.api.bundling.delete_item_bundle` | name | — | 🔍 Unknown |
| 25 | `expand_bundle` | bundling | `/api/method/trader_app.api.bundling.expand_bundle` | name | — | 🔍 Unknown |
| 26 | `get_taxonomy` | catalog | `/api/method/trader_app.api.catalog.get_taxonomy` | company=None | — | 🔍 Unknown |
| 27 | `save_sku_taxonomy` | catalog | `/api/method/trader_app.api.catalog.save_sku_taxonomy` | taxonomy, company=None | — | 🔍 Unknown |
| 28 | `ensure_taxonomy_values` | catalog | `/api/method/trader_app.api.catalog.ensure_taxonomy_values` | category, form_factor=None, capacity=None, grade=None, company=None | — | 🔍 Unknown |
| 29 | `get_item_line_config` | catalog | `/api/method/trader_app.api.catalog.get_item_line_config` | company=None, item_group=None | — | 🔍 Unknown |
| 30 | `save_item_group_templates` | catalog | `/api/method/trader_app.api.catalog.save_item_group_templates` | mapping, company=None | — | 🔍 Unknown |
| 31 | `save_custom_sku_templates` | catalog | `/api/method/trader_app.api.catalog.save_custom_sku_templates` | templates, company=None | — | 🔍 Unknown |
| 32 | `parse_quick_entry` | catalog | `/api/method/trader_app.api.catalog.parse_quick_entry` | text, company=None | — | 🔍 Unknown |
| 33 | `import_opening_stock` | catalog | `/api/method/trader_app.api.catalog.import_opening_stock` | items, warehouse=None, company=None | — | 🔍 Unknown |
| 34 | `create_stock_take` | catalog | `/api/method/trader_app.api.catalog.create_stock_take` | items, warehouse=None, company=None | — | 🔍 Unknown |
| 35 | `get_companies` | company | `/api/method/trader_app.api.company.get_companies` | none | — | 🔍 Unknown |
| 36 | `get_active_company` | company | `/api/method/trader_app.api.company.get_active_company` | none | — | 🔍 Unknown |
| 37 | `set_active_company` | company | `/api/method/trader_app.api.company.set_active_company` | company | — | 🔍 Unknown |
| 38 | `get_currency_options` | currency | `/api/method/trader_app.api.currency.get_currency_options` | company=None | — | 🔍 Unknown |
| 39 | `get_exchange_rate_for_date` | currency | `/api/method/trader_app.api.currency.get_exchange_rate_for_date` | currency, posting_date=None, company=None, transaction_type="selling" | — | 🔍 Unknown |
| 40 | `get_currency_settings` | currency | `/api/method/trader_app.api.currency.get_currency_settings` | company=None | — | 🔍 Unknown |
| 41 | `delete_exchange_rate` | currency | `/api/method/trader_app.api.currency.delete_exchange_rate` | name | — | 🔍 Unknown |
| 42 | `get_customers` | customers | `/api/method/trader_app.api.customers.get_customers` | page=1, page_size=20, search=None, customer_group=None | Customer, Sales Invoice | 🔍 Unknown |
| 43 | `get_customer_detail` | customers | `/api/method/trader_app.api.customers.get_customer_detail` | name | Sales Invoice | 🔍 Unknown |
| 44 | `get_customer_groups` | customers | `/api/method/trader_app.api.customers.get_customer_groups` | none | — | 🔍 Unknown |
| 45 | `get_customer_transactions` | customers | `/api/method/trader_app.api.customers.get_customer_transactions` | customer, company=None, page=1, page_size=20 | Sales Invoice | 🔍 Unknown |
| 46 | `create_customer` | customers | `/api/method/trader_app.api.customers.create_customer` | customer_name, customer_group=None, territory=None, mobile_no=None, email_id=None | — | 🔍 Unknown |
| 47 | `disable_customer` | customers | `/api/method/trader_app.api.customers.disable_customer` | name | — | 🔍 Unknown |
| 48 | `enable_customer` | customers | `/api/method/trader_app.api.customers.enable_customer` | name | — | 🔍 Unknown |
| 49 | `get_kpis` | dashboard | `/api/method/trader_app.api.dashboard.get_kpis` | company=None | — | 🔍 Unknown |
| 50 | `get_sales_trend` | dashboard | `/api/method/trader_app.api.dashboard.get_sales_trend` | company=None, months=12 | Sales Invoice | DashboardPage → dashboardApi.getSalesTrend() |
| 51 | `get_top_customers` | dashboard | `/api/method/trader_app.api.dashboard.get_top_customers` | company=None, limit=8 | Sales Invoice | DashboardPage → dashboardApi.getTopCustomers() |
| 52 | `get_recent_orders` | dashboard | `/api/method/trader_app.api.dashboard.get_recent_orders` | company=None, limit=10 | Sales Invoice | DashboardPage → dashboardApi.getRecentOrders() |
| 53 | `get_cash_flow_summary` | dashboard | `/api/method/trader_app.api.dashboard.get_cash_flow_summary` | company=None, months=12 | Payment Entry | DashboardPage, FinancePage → dashboardApi.getCashFlowSummary() |
| 54 | `get_inventory_summary` | dashboard | `/api/method/trader_app.api.dashboard.get_inventory_summary` | company=None | Warehouse, Bin | 🔍 Unknown |
| 55 | `get_day_book` | daybook | `/api/method/trader_app.api.daybook.get_day_book` | company=None, date=None, page=1, page_size=50 | Sales Invoice, Purchase Invoice, Payment Entry, Journal Entry, Stock Entry | 🔍 Unknown |
| 56 | `get_day_close_summary` | daybook | `/api/method/trader_app.api.daybook.get_day_close_summary` | company=None, date=None | — | 🔍 Unknown |
| 57 | `get_component_stock_valuation` | daybook | `/api/method/trader_app.api.daybook.get_component_stock_valuation` | company=None, as_of_date=None | Item, Bin, Warehouse | 🔍 Unknown |
| 58 | `get_incoming` | daybook | `/api/method/trader_app.api.daybook.get_incoming` | company=None, page=1, page_size=20, search=None | Customer, Sales Invoice | 🔍 Unknown |
| 59 | `get_outgoing` | daybook | `/api/method/trader_app.api.daybook.get_outgoing` | company=None, page=1, page_size=20, search=None | Supplier, Purchase Invoice | 🔍 Unknown |
| 60 | `get_party_open_invoices` | daybook | `/api/method/trader_app.api.daybook.get_party_open_invoices` | party_type, party, company=None | — | 🔍 Unknown |
| 61 | `find_or_create_party` | daybook | `/api/method/trader_app.api.daybook.find_or_create_party` | party_type, party_name, short_code=None, company=None | — | 🔍 Unknown |
| 62 | `get_payment_entry_detail` | finance | `/api/method/trader_app.api.finance.get_payment_entry_detail` | name | — | 🔍 Unknown |
| 63 | `get_payment_entry_setup` | finance | `/api/method/trader_app.api.finance.get_payment_entry_setup` | company=None | — | 🔍 Unknown |
| 64 | `submit_payment_entry` | finance | `/api/method/trader_app.api.finance.submit_payment_entry` | name | — | 🔍 Unknown |
| 65 | `get_journal_entry_detail` | finance | `/api/method/trader_app.api.finance.get_journal_entry_detail` | name | — | 🔍 Unknown |
| 66 | `get_accounts` | finance | `/api/method/trader_app.api.finance.get_accounts` | company=None, search=None, limit=100 | Account | 🔍 Unknown |
| 67 | `submit_journal_entry` | finance | `/api/method/trader_app.api.finance.submit_journal_entry` | name | — | 🔍 Unknown |
| 68 | `cancel_payment_entry` | finance | `/api/method/trader_app.api.finance.cancel_payment_entry` | name | — | 🔍 Unknown |
| 69 | `cancel_journal_entry` | finance | `/api/method/trader_app.api.finance.cancel_journal_entry` | name | — | 🔍 Unknown |
| 70 | `get_outstanding_summary` | finance | `/api/method/trader_app.api.finance.get_outstanding_summary` | company=None | Sales Invoice, Purchase Invoice | 🔍 Unknown |
| 71 | `get_gst_settings` | gst | `/api/method/trader_app.api.gst.get_gst_settings` | company=None | Sales Taxes and Charges Template, Sales Taxes and Charges, Purchase Taxes and Charges Template, Purchase Taxes and Charges | 🔍 Unknown |
| 72 | `save_gst_settings` | gst | `/api/method/trader_app.api.gst.save_gst_settings` | company=None, config=None | — | 🔍 Unknown |
| 73 | `seed_punjab_gst_templates` | gst | `/api/method/trader_app.api.gst.seed_punjab_gst_templates` | company=None | — | 🔍 Unknown |
| 74 | `get_tax_templates` | gst | `/api/method/trader_app.api.gst.get_tax_templates` | doctype="Sales", company=None | — | 🔍 Unknown |
| 75 | `get_items` | inventory | `/api/method/trader_app.api.inventory.get_items` | item_group=None, page=1, page_size=20, search=None | Item Barcode, Item, Item Price | 🔍 Unknown |
| 76 | `lookup_item_by_barcode` | inventory | `/api/method/trader_app.api.inventory.lookup_item_by_barcode` | barcode, company=None | — | 🔍 Unknown |
| 77 | `get_warehouse_item_qty` | inventory | `/api/method/trader_app.api.inventory.get_warehouse_item_qty` | item_code, warehouse, company=None | — | 🔍 Unknown |
| 78 | `validate_serial_for_item` | inventory | `/api/method/trader_app.api.inventory.validate_serial_for_item` | item_code, serial_no, warehouse=None, company=None | — | 🔍 Unknown |
| 79 | `validate_items_stock` | inventory | `/api/method/trader_app.api.inventory.validate_items_stock` | items, company=None | — | 🔍 Unknown |
| 80 | `validate_serial_for_purchase` | inventory | `/api/method/trader_app.api.inventory.validate_serial_for_purchase` | item_code, serial_no, company=None | — | 🔍 Unknown |
| 81 | `get_warehouses` | inventory | `/api/method/trader_app.api.inventory.get_warehouses` | company=None | Warehouse, Bin | 🔍 Unknown |
| 82 | `get_inventory_summary` | inventory | `/api/method/trader_app.api.inventory.get_inventory_summary` | company=None | Bin, Warehouse, Item | 🔍 Unknown |
| 83 | `get_low_stock_items` | inventory | `/api/method/trader_app.api.inventory.get_low_stock_items` | company=None, threshold=10, page=1, page_size=20 | Bin, Warehouse, Item | InventoryPage → inventoryApi.getLowStockItems() |
| 84 | `get_item_groups` | inventory | `/api/method/trader_app.api.inventory.get_item_groups` | none | — | 🔍 Unknown |
| 85 | `get_item_detail` | inventory | `/api/method/trader_app.api.inventory.get_item_detail` | item_code, company=None | Bin | 🔍 Unknown |
| 86 | `create_purchase_receipt` | inventory | `/api/method/trader_app.api.inventory.create_purchase_receipt` | items, posting_date=None, company=None | — | 🔍 Unknown |
| 87 | `create_sales_dispatch` | inventory | `/api/method/trader_app.api.inventory.create_sales_dispatch` | items, posting_date=None, company=None | — | 🔍 Unknown |
| 88 | `create_stock_entry` | inventory | `/api/method/trader_app.api.inventory.create_stock_entry` | purpose, items, company=None, posting_date=None | — | 🔍 Unknown |
| 89 | `get_pos_setup` | pos | `/api/method/trader_app.api.pos.get_pos_setup` | company=None | — | 🔍 Unknown |
| 90 | `get_print_data` | printing | `/api/method/trader_app.api.printing.get_print_data` | doctype, name, view_mode="external", doc_format="tax_invoice" | — | 🔍 Unknown |
| 91 | `get_purchase_document_catalog` | purchases | `/api/method/trader_app.api.purchases.get_purchase_document_catalog` | none | — | 🔍 Unknown |
| 92 | `get_purchase_invoice_detail` | purchases | `/api/method/trader_app.api.purchases.get_purchase_invoice_detail` | name | — | 🔍 Unknown |
| 93 | `get_material_request_detail` | purchases | `/api/method/trader_app.api.purchases.get_material_request_detail` | name | — | 🔍 Unknown |
| 94 | `get_supplier_quotation_detail` | purchases | `/api/method/trader_app.api.purchases.get_supplier_quotation_detail` | name | — | 🔍 Unknown |
| 95 | `get_purchase_order_detail` | purchases | `/api/method/trader_app.api.purchases.get_purchase_order_detail` | name | Purchase Invoice Item, Purchase Invoice | 🔍 Unknown |
| 96 | `create_purchase_order_from_supplier_quotation` | purchases | `/api/method/trader_app.api.purchases.create_purchase_order_from_supplier_quotation` | name, company=None, transaction_date=None, schedule_date=None | — | 🔍 Unknown |
| 97 | `create_material_request` | purchases | `/api/method/trader_app.api.purchases.create_material_request` | items, company=None, transaction_date=None, schedule_date=None, title=None | — | 🔍 Unknown |
| 98 | `submit_purchase_invoice` | purchases | `/api/method/trader_app.api.purchases.submit_purchase_invoice` | name | — | 🔍 Unknown |
| 99 | `submit_purchase_order` | purchases | `/api/method/trader_app.api.purchases.submit_purchase_order` | name | — | 🔍 Unknown |
| 100 | `submit_material_request` | purchases | `/api/method/trader_app.api.purchases.submit_material_request` | name | — | 🔍 Unknown |
| 101 | `submit_supplier_quotation` | purchases | `/api/method/trader_app.api.purchases.submit_supplier_quotation` | name | — | 🔍 Unknown |
| 102 | `cancel_purchase_invoice` | purchases | `/api/method/trader_app.api.purchases.cancel_purchase_invoice` | name | — | 🔍 Unknown |
| 103 | `cancel_purchase_order` | purchases | `/api/method/trader_app.api.purchases.cancel_purchase_order` | name | — | 🔍 Unknown |
| 104 | `cancel_material_request` | purchases | `/api/method/trader_app.api.purchases.cancel_material_request` | name | — | 🔍 Unknown |
| 105 | `cancel_supplier_quotation` | purchases | `/api/method/trader_app.api.purchases.cancel_supplier_quotation` | name | — | 🔍 Unknown |
| 106 | `get_purchase_summary` | purchases | `/api/method/trader_app.api.purchases.get_purchase_summary` | company=None | Purchase Invoice | 🔍 Unknown |
| 107 | `get_customer_ledger` | reports | `/api/method/trader_app.api.reports.get_customer_ledger` | customer, company=None, from_date=None, to_date=None | GL Entry | 🔍 Unknown |
| 108 | `get_supplier_ledger` | reports | `/api/method/trader_app.api.reports.get_supplier_ledger` | supplier, company=None, from_date=None, to_date=None | GL Entry | 🔍 Unknown |
| 109 | `get_receivable_aging` | reports | `/api/method/trader_app.api.reports.get_receivable_aging` | company=None | Sales Invoice | 🔍 Unknown |
| 110 | `get_receivable_aging_detail` | reports | `/api/method/trader_app.api.reports.get_receivable_aging_detail` | company=None, page=1, page_size=20 | Sales Invoice | 🔍 Unknown |
| 111 | `get_payable_aging` | reports | `/api/method/trader_app.api.reports.get_payable_aging` | company=None | Purchase Invoice | 🔍 Unknown |
| 112 | `get_profit_and_loss` | reports | `/api/method/trader_app.api.reports.get_profit_and_loss` | company=None, from_date=None, to_date=None | — | FinancePage → reportsApi.getProfitAndLoss() |
| 113 | `get_accounts_payable` | reports | `/api/method/trader_app.api.reports.get_accounts_payable` | company=None | — | ReportsPage, FinancePage → reportsApi.getAccountsPayable() |
| 114 | `get_consolidated_company_summary` | reports | `/api/method/trader_app.api.reports.get_consolidated_company_summary` | from_date=None, to_date=None | Sales Invoice, Purchase Invoice, Bin, Warehouse | 🔍 Unknown |
| 115 | `get_tax_summary_report` | reports | `/api/method/trader_app.api.reports.get_tax_summary_report` | company=None, from_date=None, to_date=None, format=None | Sales Taxes and Charges, Sales Invoice, Purchase Taxes and Charges, Purchase Invoice | 🔍 Unknown |
| 116 | `get_trial_balance_report` | reports | `/api/method/trader_app.api.reports.get_trial_balance_report` | company=None, from_date=None, to_date=None, format=None | Account, GL Entry | 🔍 Unknown |
| 117 | `get_balance_sheet_report` | reports | `/api/method/trader_app.api.reports.get_balance_sheet_report` | company=None, as_on_date=None, format=None | Account, GL Entry | 🔍 Unknown |
| 118 | `get_fx_gain_loss_report` | reports | `/api/method/trader_app.api.reports.get_fx_gain_loss_report` | company=None, as_on_date=None, format=None | Sales Invoice, Purchase Invoice | 🔍 Unknown |
| 119 | `get_sales_document_catalog` | sales | `/api/method/trader_app.api.sales.get_sales_document_catalog` | none | — | 🔍 Unknown |
| 120 | `get_sales_invoice_detail` | sales | `/api/method/trader_app.api.sales.get_sales_invoice_detail` | name | — | 🔍 Unknown |
| 121 | `get_sales_order_detail` | sales | `/api/method/trader_app.api.sales.get_sales_order_detail` | name | Sales Invoice Item, Sales Invoice | 🔍 Unknown |
| 122 | `get_quotation_detail` | sales | `/api/method/trader_app.api.sales.get_quotation_detail` | name | Sales Order Item, Sales Order | 🔍 Unknown |
| 123 | `get_customer_item_sales_history` | sales | `/api/method/trader_app.api.sales.get_customer_item_sales_history` | customer, item_code, company=None, limit=5 | Sales Invoice Item, Sales Invoice | 🔍 Unknown |
| 124 | `submit_sales_invoice` | sales | `/api/method/trader_app.api.sales.submit_sales_invoice` | name | — | 🔍 Unknown |
| 125 | `submit_sales_order` | sales | `/api/method/trader_app.api.sales.submit_sales_order` | name | — | 🔍 Unknown |
| 126 | `cancel_sales_invoice` | sales | `/api/method/trader_app.api.sales.cancel_sales_invoice` | name | — | 🔍 Unknown |
| 127 | `cancel_sales_order` | sales | `/api/method/trader_app.api.sales.cancel_sales_order` | name | — | 🔍 Unknown |
| 128 | `cancel_quotation` | sales | `/api/method/trader_app.api.sales.cancel_quotation` | name | — | 🔍 Unknown |
| 129 | `get_delivery_note_detail` | sales | `/api/method/trader_app.api.sales.get_delivery_note_detail` | name | — | 🔍 Unknown |
| 130 | `submit_delivery_note` | sales | `/api/method/trader_app.api.sales.submit_delivery_note` | name | — | 🔍 Unknown |
| 131 | `cancel_delivery_note` | sales | `/api/method/trader_app.api.sales.cancel_delivery_note` | name | — | 🔍 Unknown |
| 132 | `submit_quotation` | sales | `/api/method/trader_app.api.sales.submit_quotation` | name | — | 🔍 Unknown |
| 133 | `get_sales_summary` | sales | `/api/method/trader_app.api.sales.get_sales_summary` | company=None | Sales Invoice | 🔍 Unknown |
| 134 | `get_settings` | settings | `/api/method/trader_app.api.settings.get_settings` | none | — | 🔍 Unknown |
| 135 | `save_settings` | settings | `/api/method/trader_app.api.settings.save_settings` | data=None | — | 🔍 Unknown |
| 136 | `get_trader_roles` | settings | `/api/method/trader_app.api.settings.get_trader_roles` | none | Role | 🔍 Unknown |
| 137 | `toggle_components_feature` | settings | `/api/method/trader_app.api.settings.toggle_components_feature` | enabled=0, company=None | — | 🔍 Unknown |
| 138 | `get_current_user_roles` | settings | `/api/method/trader_app.api.settings.get_current_user_roles` | none | Has Role | 🔍 Unknown |
| 139 | `get_tenant_dashboard` | super_admin | `/api/method/trader_app.api.super_admin.get_tenant_dashboard` | none | — | 🔍 Unknown |
| 140 | `list_tenants` | super_admin | `/api/method/trader_app.api.super_admin.list_tenants` | search=None, status=None, page=1, page_size=20 | — | 🔍 Unknown |
| 141 | `get_tenant_detail` | super_admin | `/api/method/trader_app.api.super_admin.get_tenant_detail` | tenant | — | 🔍 Unknown |
| 142 | `create_tenant` | super_admin | `/api/method/trader_app.api.super_admin.create_tenant` | data=None | — | 🔍 Unknown |
| 143 | `update_tenant` | super_admin | `/api/method/trader_app.api.super_admin.update_tenant` | tenant, data=None | — | 🔍 Unknown |
| 144 | `set_tenant_status` | super_admin | `/api/method/trader_app.api.super_admin.set_tenant_status` | tenant, status | — | 🔍 Unknown |
| 145 | `set_tenant_modules` | super_admin | `/api/method/trader_app.api.super_admin.set_tenant_modules` | tenant, modules=None | — | 🔍 Unknown |
| 146 | `set_tenant_branding` | super_admin | `/api/method/trader_app.api.super_admin.set_tenant_branding` | tenant, branding=None, logo=None | — | 🔍 Unknown |
| 147 | `get_tenant_audit_log` | super_admin | `/api/method/trader_app.api.super_admin.get_tenant_audit_log` | tenant, page=1, page_size=20 | — | 🔍 Unknown |
| 148 | `get_suppliers` | suppliers | `/api/method/trader_app.api.suppliers.get_suppliers` | page=1, page_size=20, search=None, supplier_group=None | Supplier, Purchase Invoice | 🔍 Unknown |
| 149 | `get_supplier_detail` | suppliers | `/api/method/trader_app.api.suppliers.get_supplier_detail` | name | Purchase Invoice | 🔍 Unknown |
| 150 | `get_supplier_groups` | suppliers | `/api/method/trader_app.api.suppliers.get_supplier_groups` | none | — | 🔍 Unknown |
| 151 | `get_supplier_transactions` | suppliers | `/api/method/trader_app.api.suppliers.get_supplier_transactions` | supplier, company=None, page=1, page_size=20 | Purchase Invoice | 🔍 Unknown |
| 152 | `create_supplier` | suppliers | `/api/method/trader_app.api.suppliers.create_supplier` | supplier_name, supplier_group=None, country=None, mobile_no=None, email_id=None | — | 🔍 Unknown |
| 153 | `disable_supplier` | suppliers | `/api/method/trader_app.api.suppliers.disable_supplier` | name | — | 🔍 Unknown |
| 154 | `enable_supplier` | suppliers | `/api/method/trader_app.api.suppliers.enable_supplier` | name | — | 🔍 Unknown |
| 155 | `get_multitenant_status` | tenant | `/api/method/trader_app.api.tenant.get_multitenant_status` | none | — | 🔍 Unknown |
| 156 | `get_tenant_config` | tenant | `/api/method/trader_app.api.tenant.get_tenant_config` | none | — | 🔍 Unknown |
| 157 | `get_business_tenant_audit_log` | tenant | `/api/method/trader_app.api.tenant.get_business_tenant_audit_log` | page=1, page_size=20 | — | 🔍 Unknown |

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
| Custom whitelisted endpoints | 157 |
| With frontend consumer | 157 |
| Without frontend consumer (orphan) | 0 |
| Frappe built-in endpoints used | 4 (active) + 5 (defined, unused) |

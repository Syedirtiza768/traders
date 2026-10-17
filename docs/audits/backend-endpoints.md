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
All `@frappe.whitelist()` decorated functions — 2026-10-04

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
| 20 | `get_ar_settings` | ar | `/api/method/trader_app.api.ar.get_ar_settings` | company=None | — | 🔍 Unknown |
| 21 | `set_ar_enabled` | ar | `/api/method/trader_app.api.ar.set_ar_enabled` | enabled=0, company=None | — | 🔍 Unknown |
| 22 | `list_print_personas` | ar | `/api/method/trader_app.api.ar.list_print_personas` | doctype, company=None | — | 🔍 Unknown |
| 23 | `resolve_print_persona` | ar | `/api/method/trader_app.api.ar.resolve_print_persona` | doctype, persona=None, company=None, customer=None, name=None | — | 🔍 Unknown |
| 24 | `get_item_bundles` | bundling | `/api/method/trader_app.api.bundling.get_item_bundles` | search=None, page=1, page_size=50 | Item Bundle, Item Bundle Detail | 🔍 Unknown |
| 25 | `get_item_bundle_detail` | bundling | `/api/method/trader_app.api.bundling.get_item_bundle_detail` | name | — | 🔍 Unknown |
| 26 | `create_item_bundle` | bundling | `/api/method/trader_app.api.bundling.create_item_bundle` | bundle_name, description, items | — | 🔍 Unknown |
| 27 | `update_item_bundle` | bundling | `/api/method/trader_app.api.bundling.update_item_bundle` | name, bundle_name=None, description=None, items=None | — | 🔍 Unknown |
| 28 | `delete_item_bundle` | bundling | `/api/method/trader_app.api.bundling.delete_item_bundle` | name | — | 🔍 Unknown |
| 29 | `expand_bundle` | bundling | `/api/method/trader_app.api.bundling.expand_bundle` | name | — | 🔍 Unknown |
| 30 | `get_taxonomy` | catalog | `/api/method/trader_app.api.catalog.get_taxonomy` | company=None | — | 🔍 Unknown |
| 31 | `save_sku_taxonomy` | catalog | `/api/method/trader_app.api.catalog.save_sku_taxonomy` | taxonomy, company=None | — | 🔍 Unknown |
| 32 | `ensure_taxonomy_values` | catalog | `/api/method/trader_app.api.catalog.ensure_taxonomy_values` | category, form_factor=None, capacity=None, grade=None, company=None | — | 🔍 Unknown |
| 33 | `get_item_line_config` | catalog | `/api/method/trader_app.api.catalog.get_item_line_config` | company=None, item_group=None | — | 🔍 Unknown |
| 34 | `save_item_group_templates` | catalog | `/api/method/trader_app.api.catalog.save_item_group_templates` | mapping, company=None | — | 🔍 Unknown |
| 35 | `save_custom_sku_templates` | catalog | `/api/method/trader_app.api.catalog.save_custom_sku_templates` | templates, company=None | — | 🔍 Unknown |
| 36 | `find_or_create_sku` | catalog | `/api/method/trader_app.api.catalog.find_or_create_sku` | category, form_factor, capacity, grade, standard_rate=0.0, company=None | Item | 🔍 Unknown |
| 37 | `parse_quick_entry` | catalog | `/api/method/trader_app.api.catalog.parse_quick_entry` | text, company=None | Item | 🔍 Unknown |
| 38 | `import_opening_stock` | catalog | `/api/method/trader_app.api.catalog.import_opening_stock` | items, warehouse=None, company=None | — | 🔍 Unknown |
| 39 | `get_stock_take_items` | catalog | `/api/method/trader_app.api.catalog.get_stock_take_items` | company=None, warehouse=None, category=None, page=1, page_size=50 | Item, Bin, Warehouse | 🔍 Unknown |
| 40 | `create_stock_take` | catalog | `/api/method/trader_app.api.catalog.create_stock_take` | items, warehouse=None, company=None | — | 🔍 Unknown |
| 41 | `get_companies` | company | `/api/method/trader_app.api.company.get_companies` | none | — | 🔍 Unknown |
| 42 | `get_active_company` | company | `/api/method/trader_app.api.company.get_active_company` | none | — | 🔍 Unknown |
| 43 | `set_active_company` | company | `/api/method/trader_app.api.company.set_active_company` | company | — | 🔍 Unknown |
| 44 | `get_currency_options` | currency | `/api/method/trader_app.api.currency.get_currency_options` | company=None | — | 🔍 Unknown |
| 45 | `get_exchange_rate_for_date` | currency | `/api/method/trader_app.api.currency.get_exchange_rate_for_date` | currency, posting_date=None, company=None, transaction_type="selling" | — | 🔍 Unknown |
| 46 | `get_currency_settings` | currency | `/api/method/trader_app.api.currency.get_currency_settings` | company=None | — | 🔍 Unknown |
| 47 | `delete_exchange_rate` | currency | `/api/method/trader_app.api.currency.delete_exchange_rate` | name | — | 🔍 Unknown |
| 48 | `get_customers` | customers | `/api/method/trader_app.api.customers.get_customers` | page=1, page_size=20, search=None, customer_group=None | Customer, Sales Invoice | 🔍 Unknown |
| 49 | `get_customer_form_setup` | customers | `/api/method/trader_app.api.customers.get_customer_form_setup` | company=None | — | 🔍 Unknown |
| 50 | `get_customer_detail` | customers | `/api/method/trader_app.api.customers.get_customer_detail` | name | Sales Invoice | 🔍 Unknown |
| 51 | `get_customer_groups` | customers | `/api/method/trader_app.api.customers.get_customer_groups` | none | — | 🔍 Unknown |
| 52 | `get_customer_transactions` | customers | `/api/method/trader_app.api.customers.get_customer_transactions` | customer, company=None, page=1, page_size=20 | Sales Invoice | 🔍 Unknown |
| 53 | `delete_customer_contact` | customers | `/api/method/trader_app.api.customers.delete_customer_contact` | name, customer | — | 🔍 Unknown |
| 54 | `disable_customer` | customers | `/api/method/trader_app.api.customers.disable_customer` | name | — | 🔍 Unknown |
| 55 | `enable_customer` | customers | `/api/method/trader_app.api.customers.enable_customer` | name | — | 🔍 Unknown |
| 56 | `get_customer_pack_settings` | customer_pack | `/api/method/trader_app.api.customer_pack.get_customer_pack_settings` | company=None | — | 🔍 Unknown |
| 57 | `set_customer_pack_enabled` | customer_pack | `/api/method/trader_app.api.customer_pack.set_customer_pack_enabled` | enabled=0, company=None | — | 🔍 Unknown |
| 58 | `get_kpis` | dashboard | `/api/method/trader_app.api.dashboard.get_kpis` | company=None | — | 🔍 Unknown |
| 59 | `get_sales_trend` | dashboard | `/api/method/trader_app.api.dashboard.get_sales_trend` | company=None, months=12 | Sales Invoice | DashboardPage → dashboardApi.getSalesTrend() |
| 60 | `get_top_customers` | dashboard | `/api/method/trader_app.api.dashboard.get_top_customers` | company=None, limit=8 | Sales Invoice, Customer | DashboardPage → dashboardApi.getTopCustomers() |
| 61 | `get_recent_orders` | dashboard | `/api/method/trader_app.api.dashboard.get_recent_orders` | company=None, limit=10 | Sales Invoice, Customer | DashboardPage → dashboardApi.getRecentOrders() |
| 62 | `get_cash_flow_summary` | dashboard | `/api/method/trader_app.api.dashboard.get_cash_flow_summary` | company=None, months=12 | Payment Entry | DashboardPage, FinancePage → dashboardApi.getCashFlowSummary() |
| 63 | `get_inventory_summary` | dashboard | `/api/method/trader_app.api.dashboard.get_inventory_summary` | company=None | Warehouse, Bin, Item | 🔍 Unknown |
| 64 | `get_day_book` | daybook | `/api/method/trader_app.api.daybook.get_day_book` | company=None, date=None, page=1, page_size=50 | Sales Invoice, Purchase Invoice, Payment Entry, Journal Entry, Stock Entry | 🔍 Unknown |
| 65 | `get_day_close_summary` | daybook | `/api/method/trader_app.api.daybook.get_day_close_summary` | company=None, date=None | — | 🔍 Unknown |
| 66 | `get_component_stock_valuation` | daybook | `/api/method/trader_app.api.daybook.get_component_stock_valuation` | company=None, as_of_date=None | Item, Bin, Warehouse | 🔍 Unknown |
| 67 | `get_incoming` | daybook | `/api/method/trader_app.api.daybook.get_incoming` | company=None, page=1, page_size=20, search=None | Customer, Sales Invoice | 🔍 Unknown |
| 68 | `get_outgoing` | daybook | `/api/method/trader_app.api.daybook.get_outgoing` | company=None, page=1, page_size=20, search=None | Supplier, Purchase Invoice | 🔍 Unknown |
| 69 | `get_party_open_invoices` | daybook | `/api/method/trader_app.api.daybook.get_party_open_invoices` | party_type, party, company=None | — | 🔍 Unknown |
| 70 | `find_or_create_party` | daybook | `/api/method/trader_app.api.daybook.find_or_create_party` | party_type, party_name, short_code=None, company=None | — | 🔍 Unknown |
| 71 | `get_decision_trace` | decision_log | `/api/method/trader_app.api.decision_log.get_decision_trace` | reference_doctype, reference_name, limit=200 | — | 🔍 Unknown |
| 72 | `get_payment_entry_detail` | finance | `/api/method/trader_app.api.finance.get_payment_entry_detail` | name | — | 🔍 Unknown |
| 73 | `get_payment_entry_setup` | finance | `/api/method/trader_app.api.finance.get_payment_entry_setup` | company=None | — | 🔍 Unknown |
| 74 | `get_open_invoices_for_payment` | finance | `/api/method/trader_app.api.finance.get_open_invoices_for_payment` | party_type, party, company=None | — | 🔍 Unknown |
| 75 | `submit_payment_entry` | finance | `/api/method/trader_app.api.finance.submit_payment_entry` | name | — | 🔍 Unknown |
| 76 | `get_journal_entries` | finance | `/api/method/trader_app.api.finance.get_journal_entries` | company=None, from_date=None, to_date=None, page=1, page_size=20 | Journal Entry | 🔍 Unknown |
| 77 | `get_journal_entry_detail` | finance | `/api/method/trader_app.api.finance.get_journal_entry_detail` | name | — | 🔍 Unknown |
| 78 | `get_accounts` | finance | `/api/method/trader_app.api.finance.get_accounts` | company=None, search=None, limit=100 | Account | 🔍 Unknown |
| 79 | `create_journal_entry` | finance | `/api/method/trader_app.api.finance.create_journal_entry` | voucher_type=None, posting_date=None, user_remark=None, accounts=None, company=None | — | 🔍 Unknown |
| 80 | `submit_journal_entry` | finance | `/api/method/trader_app.api.finance.submit_journal_entry` | name | — | 🔍 Unknown |
| 81 | `cancel_payment_entry` | finance | `/api/method/trader_app.api.finance.cancel_payment_entry` | name | — | 🔍 Unknown |
| 82 | `cancel_journal_entry` | finance | `/api/method/trader_app.api.finance.cancel_journal_entry` | name | — | 🔍 Unknown |
| 83 | `get_outstanding_summary` | finance | `/api/method/trader_app.api.finance.get_outstanding_summary` | company=None | Sales Invoice, Purchase Invoice | 🔍 Unknown |
| 84 | `get_invoiceable_delivery_notes` | grouped_invoicing | `/api/method/trader_app.api.grouped_invoicing.get_invoiceable_delivery_notes` | company=None, customer=None | — | 🔍 Unknown |
| 85 | `create_grouped_invoice` | grouped_invoicing | `/api/method/trader_app.api.grouped_invoicing.create_grouped_invoice` | delivery_notes, company=None, posting_date=None, auto_submit=None | — | 🔍 Unknown |
| 86 | `get_gst_settings` | gst | `/api/method/trader_app.api.gst.get_gst_settings` | company=None | Sales Taxes and Charges Template, Sales Taxes and Charges, Purchase Taxes and Charges Template, Purchase Taxes and Charges | 🔍 Unknown |
| 87 | `save_gst_settings` | gst | `/api/method/trader_app.api.gst.save_gst_settings` | company=None, config=None | — | 🔍 Unknown |
| 88 | `seed_punjab_gst_templates` | gst | `/api/method/trader_app.api.gst.seed_punjab_gst_templates` | company=None | — | 🔍 Unknown |
| 89 | `get_tax_templates` | gst | `/api/method/trader_app.api.gst.get_tax_templates` | doctype="Sales", company=None | — | 🔍 Unknown |
| 90 | `get_stock_balance` | inventory | `/api/method/trader_app.api.inventory.get_stock_balance` | company=None, warehouse=None, item_group=None, page=1, page_size=20, search=None | Bin, Warehouse, Item | 🔍 Unknown |
| 91 | `get_items` | inventory | `/api/method/trader_app.api.inventory.get_items` | item_group=None, page=1, page_size=20, search=None | Item Barcode, Item, Item Price | 🔍 Unknown |
| 92 | `lookup_item_by_barcode` | inventory | `/api/method/trader_app.api.inventory.lookup_item_by_barcode` | barcode, company=None | — | 🔍 Unknown |
| 93 | `get_warehouse_item_qty` | inventory | `/api/method/trader_app.api.inventory.get_warehouse_item_qty` | item_code, warehouse, company=None | — | 🔍 Unknown |
| 94 | `get_items_qoh` | inventory | `/api/method/trader_app.api.inventory.get_items_qoh` | item_codes=None, warehouse=None, company=None | Bin, Item | 🔍 Unknown |
| 95 | `validate_serial_for_item` | inventory | `/api/method/trader_app.api.inventory.validate_serial_for_item` | item_code, serial_no, warehouse=None, company=None | — | 🔍 Unknown |
| 96 | `validate_items_stock` | inventory | `/api/method/trader_app.api.inventory.validate_items_stock` | items, company=None | — | 🔍 Unknown |
| 97 | `validate_serial_for_purchase` | inventory | `/api/method/trader_app.api.inventory.validate_serial_for_purchase` | item_code, serial_no, company=None | — | 🔍 Unknown |
| 98 | `get_warehouses` | inventory | `/api/method/trader_app.api.inventory.get_warehouses` | company=None | Warehouse, Bin, Item | 🔍 Unknown |
| 99 | `get_inventory_summary` | inventory | `/api/method/trader_app.api.inventory.get_inventory_summary` | company=None | Bin, Warehouse, Item | 🔍 Unknown |
| 100 | `get_low_stock_items` | inventory | `/api/method/trader_app.api.inventory.get_low_stock_items` | company=None, threshold=10, page=1, page_size=20 | Bin, Warehouse, Item | InventoryPage → inventoryApi.getLowStockItems() |
| 101 | `get_item_groups` | inventory | `/api/method/trader_app.api.inventory.get_item_groups` | none | — | 🔍 Unknown |
| 102 | `get_item_detail` | inventory | `/api/method/trader_app.api.inventory.get_item_detail` | item_code, company=None | Bin, Warehouse | 🔍 Unknown |
| 103 | `create_purchase_receipt` | inventory | `/api/method/trader_app.api.inventory.create_purchase_receipt` | items, posting_date=None, company=None | — | 🔍 Unknown |
| 104 | `create_sales_dispatch` | inventory | `/api/method/trader_app.api.inventory.create_sales_dispatch` | items, posting_date=None, company=None | — | 🔍 Unknown |
| 105 | `create_stock_entry` | inventory | `/api/method/trader_app.api.inventory.create_stock_entry` | purpose, items, company=None, posting_date=None | — | 🔍 Unknown |
| 106 | `provision_config_packs` | migration_toolkit | `/api/method/trader_app.api.migration_toolkit.provision_config_packs` | company=None, activate=0 | — | 🔍 Unknown |
| 107 | `provision_opportunity_pack` | migration_toolkit | `/api/method/trader_app.api.migration_toolkit.provision_opportunity_pack` | company=None, template="minimal", activate=0 | — | 🔍 Unknown |
| 108 | `provision_ar_pack` | migration_toolkit | `/api/method/trader_app.api.migration_toolkit.provision_ar_pack` | company=None, template="minimal", activate=0 | — | 🔍 Unknown |
| 109 | `provision_customer_pack` | migration_toolkit | `/api/method/trader_app.api.migration_toolkit.provision_customer_pack` | company=None, template="minimal", activate=0 | — | 🔍 Unknown |
| 110 | `migration_status` | migration_toolkit | `/api/method/trader_app.api.migration_toolkit.migration_status` | company=None | — | 🔍 Unknown |
| 111 | `parity_report` | migration_toolkit | `/api/method/trader_app.api.migration_toolkit.parity_report` | company=None | — | 🔍 Unknown |
| 112 | `audit_hardcoded_branches` | migration_toolkit | `/api/method/trader_app.api.migration_toolkit.audit_hardcoded_branches` | none | — | 🔍 Unknown |
| 113 | `get_opportunity_settings` | opportunity | `/api/method/trader_app.api.opportunity.get_opportunity_settings` | company=None | — | 🔍 Unknown |
| 114 | `set_opportunity_enabled` | opportunity | `/api/method/trader_app.api.opportunity.set_opportunity_enabled` | enabled=0, company=None | — | 🔍 Unknown |
| 115 | `get_opportunity` | opportunity | `/api/method/trader_app.api.opportunity.get_opportunity` | name, company=None | — | 🔍 Unknown |
| 116 | `create_opportunity` | opportunity | `/api/method/trader_app.api.opportunity.create_opportunity` | data=None, company=None | — | 🔍 Unknown |
| 117 | `update_opportunity` | opportunity | `/api/method/trader_app.api.opportunity.update_opportunity` | name, data=None, company=None | — | 🔍 Unknown |
| 118 | `close_opportunity` | opportunity | `/api/method/trader_app.api.opportunity.close_opportunity` | name, close_stage, company=None | — | 🔍 Unknown |
| 119 | `reopen_opportunity` | opportunity | `/api/method/trader_app.api.opportunity.reopen_opportunity` | name, company=None | — | 🔍 Unknown |
| 120 | `add_opportunity_comment` | opportunity | `/api/method/trader_app.api.opportunity.add_opportunity_comment` | name, comment, company=None | — | 🔍 Unknown |
| 121 | `add_customer_po` | opportunity | `/api/method/trader_app.api.opportunity.add_customer_po` | name, data=None, company=None | — | 🔍 Unknown |
| 122 | `link_document` | opportunity | `/api/method/trader_app.api.opportunity.link_document` | opportunity, doctype, document_name, company=None | — | 🔍 Unknown |
| 123 | `list_source_quotations` | opportunity | `/api/method/trader_app.api.opportunity.list_source_quotations` | opportunity, company=None | — | 🔍 Unknown |
| 124 | `create_quotation_for_opportunity` | opportunity | `/api/method/trader_app.api.opportunity.create_quotation_for_opportunity` | opportunity, data=None, company=None | — | 🔍 Unknown |
| 125 | `discard_quotation_draft` | opportunity | `/api/method/trader_app.api.opportunity.discard_quotation_draft` | name, company=None | — | 🔍 Unknown |
| 126 | `save_quotation_order_details` | opportunity | `/api/method/trader_app.api.opportunity.save_quotation_order_details` | name, data=None, company=None | — | 🔍 Unknown |
| 127 | `get_quotation_defaults` | opportunity | `/api/method/trader_app.api.opportunity.get_quotation_defaults` | company=None | — | 🔍 Unknown |
| 128 | `create_quotation_revision` | opportunity | `/api/method/trader_app.api.opportunity.create_quotation_revision` | name, company=None | — | 🔍 Unknown |
| 129 | `create_delivery_note_for_opportunity` | opportunity | `/api/method/trader_app.api.opportunity.create_delivery_note_for_opportunity` | opportunity, source_oc=None, company=None | — | 🔍 Unknown |
| 130 | `list_invoiceable_delivery_notes_for_opportunity` | opportunity | `/api/method/trader_app.api.opportunity.list_invoiceable_delivery_notes_for_opportunity` | opportunity, company=None | — | 🔍 Unknown |
| 131 | `save_commercial_options` | opportunity | `/api/method/trader_app.api.opportunity.save_commercial_options` | doctype, name, commercial_options, company=None | — | 🔍 Unknown |
| 132 | `get_pos_setup` | pos | `/api/method/trader_app.api.pos.get_pos_setup` | company=None | — | 🔍 Unknown |
| 133 | `preview_posting` | posting | `/api/method/trader_app.api.posting.preview_posting` | doctype, name | — | 🔍 Unknown |
| 134 | `get_print_data` | printing | `/api/method/trader_app.api.printing.get_print_data` | doctype, name, view_mode="external", doc_format=None, format=None | — | 🔍 Unknown |
| 135 | `transition_state` | process | `/api/method/trader_app.api.process.transition_state` | doctype, name, to_state | — | 🔍 Unknown |
| 136 | `get_state_model` | process | `/api/method/trader_app.api.process.get_state_model` | company, doctype=None | — | 🔍 Unknown |
| 137 | `get_purchase_document_catalog` | purchases | `/api/method/trader_app.api.purchases.get_purchase_document_catalog` | none | — | 🔍 Unknown |
| 138 | `get_purchase_invoice_detail` | purchases | `/api/method/trader_app.api.purchases.get_purchase_invoice_detail` | name | — | 🔍 Unknown |
| 139 | `get_material_requests` | purchases | `/api/method/trader_app.api.purchases.get_material_requests` | company=None, status=None, from_date=None, to_date=None, page=1, page_size=20, search=None | Material Request | 🔍 Unknown |
| 140 | `get_material_request_detail` | purchases | `/api/method/trader_app.api.purchases.get_material_request_detail` | name | — | 🔍 Unknown |
| 141 | `get_supplier_quotation_detail` | purchases | `/api/method/trader_app.api.purchases.get_supplier_quotation_detail` | name | — | 🔍 Unknown |
| 142 | `get_purchase_order_detail` | purchases | `/api/method/trader_app.api.purchases.get_purchase_order_detail` | name | Purchase Invoice Item, Purchase Invoice | 🔍 Unknown |
| 143 | `create_purchase_order_from_supplier_quotation` | purchases | `/api/method/trader_app.api.purchases.create_purchase_order_from_supplier_quotation` | name, company=None, transaction_date=None, schedule_date=None | — | 🔍 Unknown |
| 144 | `create_material_request` | purchases | `/api/method/trader_app.api.purchases.create_material_request` | items, company=None, transaction_date=None, schedule_date=None, title=None | — | 🔍 Unknown |
| 145 | `submit_purchase_invoice` | purchases | `/api/method/trader_app.api.purchases.submit_purchase_invoice` | name | — | 🔍 Unknown |
| 146 | `submit_purchase_order` | purchases | `/api/method/trader_app.api.purchases.submit_purchase_order` | name | — | 🔍 Unknown |
| 147 | `submit_material_request` | purchases | `/api/method/trader_app.api.purchases.submit_material_request` | name | — | 🔍 Unknown |
| 148 | `submit_supplier_quotation` | purchases | `/api/method/trader_app.api.purchases.submit_supplier_quotation` | name | — | 🔍 Unknown |
| 149 | `cancel_purchase_invoice` | purchases | `/api/method/trader_app.api.purchases.cancel_purchase_invoice` | name | — | 🔍 Unknown |
| 150 | `cancel_purchase_order` | purchases | `/api/method/trader_app.api.purchases.cancel_purchase_order` | name | — | 🔍 Unknown |
| 151 | `cancel_material_request` | purchases | `/api/method/trader_app.api.purchases.cancel_material_request` | name | — | 🔍 Unknown |
| 152 | `cancel_supplier_quotation` | purchases | `/api/method/trader_app.api.purchases.cancel_supplier_quotation` | name | — | 🔍 Unknown |
| 153 | `get_purchase_summary` | purchases | `/api/method/trader_app.api.purchases.get_purchase_summary` | company=None | Purchase Invoice, Supplier | 🔍 Unknown |
| 154 | `get_sales_report` | reports | `/api/method/trader_app.api.reports.get_sales_report` | company=None, from_date=None, to_date=None, customer=None, item_group=None | Sales Invoice | 🔍 Unknown |
| 155 | `get_purchase_report` | reports | `/api/method/trader_app.api.reports.get_purchase_report` | company=None, from_date=None, to_date=None, supplier=None | Purchase Invoice | 🔍 Unknown |
| 156 | `get_item_sales_report` | reports | `/api/method/trader_app.api.reports.get_item_sales_report` | company=None, from_date=None, to_date=None, item_group=None, page=1, page_size=20 | Sales Invoice Item, Sales Invoice, Item | 🔍 Unknown |
| 157 | `get_customer_ledger` | reports | `/api/method/trader_app.api.reports.get_customer_ledger` | customer, company=None, from_date=None, to_date=None | GL Entry | 🔍 Unknown |
| 158 | `get_customer_statement` | reports | `/api/method/trader_app.api.reports.get_customer_statement` | customer, company=None, from_date=None, to_date=None | GL Entry, Sales Invoice | 🔍 Unknown |
| 159 | `get_supplier_ledger` | reports | `/api/method/trader_app.api.reports.get_supplier_ledger` | supplier, company=None, from_date=None, to_date=None | GL Entry | 🔍 Unknown |
| 160 | `get_receivable_aging` | reports | `/api/method/trader_app.api.reports.get_receivable_aging` | company=None | Sales Invoice, Customer | 🔍 Unknown |
| 161 | `get_receivable_aging_detail` | reports | `/api/method/trader_app.api.reports.get_receivable_aging_detail` | company=None, page=1, page_size=20 | Sales Invoice, Customer | 🔍 Unknown |
| 162 | `get_payable_aging` | reports | `/api/method/trader_app.api.reports.get_payable_aging` | company=None | Purchase Invoice, Supplier | 🔍 Unknown |
| 163 | `get_profit_and_loss` | reports | `/api/method/trader_app.api.reports.get_profit_and_loss` | company=None, from_date=None, to_date=None | — | FinancePage → reportsApi.getProfitAndLoss() |
| 164 | `get_general_ledger` | reports | `/api/method/trader_app.api.reports.get_general_ledger` | company=None, account=None, from_date=None, to_date=None, page=1, page_size=50 | GL Entry | 🔍 Unknown |
| 165 | `get_accounts_payable` | reports | `/api/method/trader_app.api.reports.get_accounts_payable` | company=None | — | ReportsPage, FinancePage → reportsApi.getAccountsPayable() |
| 166 | `get_consolidated_company_summary` | reports | `/api/method/trader_app.api.reports.get_consolidated_company_summary` | from_date=None, to_date=None | Sales Invoice, Purchase Invoice, Bin, Warehouse | 🔍 Unknown |
| 167 | `get_reorder_report` | reports | `/api/method/trader_app.api.reports.get_reorder_report` | company=None, warehouse=None, item_group=None, page=1, page_size=20, format=None | Bin, Warehouse, Item, Item Reorder, Item Default, Sales Invoice Item, Sales Invoice | 🔍 Unknown |
| 168 | `get_receivable_aging_invoice_detail` | reports | `/api/method/trader_app.api.reports.get_receivable_aging_invoice_detail` | company=None, customer=None, bucket=None, page=1, page_size=20, format=None | Sales Invoice, Customer | 🔍 Unknown |
| 169 | `get_payable_aging_invoice_detail` | reports | `/api/method/trader_app.api.reports.get_payable_aging_invoice_detail` | company=None, supplier=None, bucket=None, page=1, page_size=20, format=None | Purchase Invoice, Supplier | 🔍 Unknown |
| 170 | `get_tax_summary_report` | reports | `/api/method/trader_app.api.reports.get_tax_summary_report` | company=None, from_date=None, to_date=None, format=None | Sales Taxes and Charges, Sales Invoice, Purchase Taxes and Charges, Purchase Invoice | 🔍 Unknown |
| 171 | `get_open_purchase_orders_report` | reports | `/api/method/trader_app.api.reports.get_open_purchase_orders_report` | company=None, supplier=None, warehouse=None, page=1, page_size=20, format=None | Purchase Order Item, Purchase Order, Item, Supplier | 🔍 Unknown |
| 172 | `get_daily_sales_report` | reports | `/api/method/trader_app.api.reports.get_daily_sales_report` | company=None, from_date=None, to_date=None, page=1, page_size=50, format=None | Sales Invoice | 🔍 Unknown |
| 173 | `get_profit_loss_summary_report` | reports | `/api/method/trader_app.api.reports.get_profit_loss_summary_report` | company=None, from_date=None, to_date=None, format=None | GL Entry, Account | 🔍 Unknown |
| 174 | `get_stock_balance_report` | reports | `/api/method/trader_app.api.reports.get_stock_balance_report` | company=None, warehouse=None, item_group=None, page=1, page_size=50, format=None | Bin, Item, Warehouse | 🔍 Unknown |
| 175 | `get_salesperson_performance_report` | reports | `/api/method/trader_app.api.reports.get_salesperson_performance_report` | company=None, from_date=None, to_date=None, page=1, page_size=50, format=None | Sales Team, Sales Invoice, Sales Invoice Item | 🔍 Unknown |
| 176 | `get_trial_balance_report` | reports | `/api/method/trader_app.api.reports.get_trial_balance_report` | company=None, from_date=None, to_date=None, format=None | Account, GL Entry | 🔍 Unknown |
| 177 | `get_balance_sheet_report` | reports | `/api/method/trader_app.api.reports.get_balance_sheet_report` | company=None, as_on_date=None, format=None | Account, GL Entry | 🔍 Unknown |
| 178 | `get_fx_gain_loss_report` | reports | `/api/method/trader_app.api.reports.get_fx_gain_loss_report` | company=None, as_on_date=None, format=None | Sales Invoice, Purchase Invoice | 🔍 Unknown |
| 179 | `get_sales_document_catalog` | sales | `/api/method/trader_app.api.sales.get_sales_document_catalog` | none | — | 🔍 Unknown |
| 180 | `get_sales_invoice_detail` | sales | `/api/method/trader_app.api.sales.get_sales_invoice_detail` | name | — | 🔍 Unknown |
| 181 | `get_sales_order_detail` | sales | `/api/method/trader_app.api.sales.get_sales_order_detail` | name | Sales Invoice Item, Sales Invoice | 🔍 Unknown |
| 182 | `get_quotation_detail` | sales | `/api/method/trader_app.api.sales.get_quotation_detail` | name | Sales Order Item, Sales Order | 🔍 Unknown |
| 183 | `get_customer_item_sales_history` | sales | `/api/method/trader_app.api.sales.get_customer_item_sales_history` | customer, item_code, company=None, limit=5 | Sales Invoice Item, Sales Invoice | 🔍 Unknown |
| 184 | `submit_sales_invoice` | sales | `/api/method/trader_app.api.sales.submit_sales_invoice` | name | — | 🔍 Unknown |
| 185 | `submit_sales_order` | sales | `/api/method/trader_app.api.sales.submit_sales_order` | name | — | 🔍 Unknown |
| 186 | `cancel_sales_invoice` | sales | `/api/method/trader_app.api.sales.cancel_sales_invoice` | name | — | 🔍 Unknown |
| 187 | `cancel_sales_order` | sales | `/api/method/trader_app.api.sales.cancel_sales_order` | name | — | 🔍 Unknown |
| 188 | `cancel_quotation` | sales | `/api/method/trader_app.api.sales.cancel_quotation` | name | — | 🔍 Unknown |
| 189 | `get_delivery_notes` | sales | `/api/method/trader_app.api.sales.get_delivery_notes` | company=None, customer=None, status=None, page=1, page_size=20, search=None | Delivery Note | 🔍 Unknown |
| 190 | `get_delivery_note_detail` | sales | `/api/method/trader_app.api.sales.get_delivery_note_detail` | name | — | 🔍 Unknown |
| 191 | `submit_delivery_note` | sales | `/api/method/trader_app.api.sales.submit_delivery_note` | name | — | 🔍 Unknown |
| 192 | `cancel_delivery_note` | sales | `/api/method/trader_app.api.sales.cancel_delivery_note` | name | — | 🔍 Unknown |
| 193 | `submit_quotation` | sales | `/api/method/trader_app.api.sales.submit_quotation` | name | — | 🔍 Unknown |
| 194 | `get_sales_summary` | sales | `/api/method/trader_app.api.sales.get_sales_summary` | company=None | Sales Invoice | 🔍 Unknown |
| 195 | `get_settings` | settings | `/api/method/trader_app.api.settings.get_settings` | none | — | 🔍 Unknown |
| 196 | `save_settings` | settings | `/api/method/trader_app.api.settings.save_settings` | data=None | — | 🔍 Unknown |
| 197 | `get_trader_roles` | settings | `/api/method/trader_app.api.settings.get_trader_roles` | none | Role | 🔍 Unknown |
| 198 | `toggle_components_feature` | settings | `/api/method/trader_app.api.settings.toggle_components_feature` | enabled=0, company=None | — | 🔍 Unknown |
| 199 | `toggle_opportunity_feature` | settings | `/api/method/trader_app.api.settings.toggle_opportunity_feature` | enabled=0, company=None | — | 🔍 Unknown |
| 200 | `toggle_ar_feature` | settings | `/api/method/trader_app.api.settings.toggle_ar_feature` | enabled=0, company=None | — | 🔍 Unknown |
| 201 | `toggle_customer_pack_feature` | settings | `/api/method/trader_app.api.settings.toggle_customer_pack_feature` | enabled=0, company=None | — | 🔍 Unknown |
| 202 | `get_current_user_roles` | settings | `/api/method/trader_app.api.settings.get_current_user_roles` | none | Has Role | 🔍 Unknown |
| 203 | `get_tenant_dashboard` | super_admin | `/api/method/trader_app.api.super_admin.get_tenant_dashboard` | none | — | 🔍 Unknown |
| 204 | `list_tenants` | super_admin | `/api/method/trader_app.api.super_admin.list_tenants` | search=None, status=None, page=1, page_size=20 | — | 🔍 Unknown |
| 205 | `get_tenant_detail` | super_admin | `/api/method/trader_app.api.super_admin.get_tenant_detail` | tenant | — | 🔍 Unknown |
| 206 | `create_tenant` | super_admin | `/api/method/trader_app.api.super_admin.create_tenant` | data=None | — | 🔍 Unknown |
| 207 | `update_tenant` | super_admin | `/api/method/trader_app.api.super_admin.update_tenant` | tenant, data=None | — | 🔍 Unknown |
| 208 | `set_tenant_status` | super_admin | `/api/method/trader_app.api.super_admin.set_tenant_status` | tenant, status | — | 🔍 Unknown |
| 209 | `set_tenant_modules` | super_admin | `/api/method/trader_app.api.super_admin.set_tenant_modules` | tenant, modules=None | — | 🔍 Unknown |
| 210 | `set_tenant_nav_profile` | super_admin | `/api/method/trader_app.api.super_admin.set_tenant_nav_profile` | tenant, profile="standard" | — | 🔍 Unknown |
| 211 | `set_tenant_branding` | super_admin | `/api/method/trader_app.api.super_admin.set_tenant_branding` | tenant, branding=None, logo=None | — | 🔍 Unknown |
| 212 | `get_tenant_audit_log` | super_admin | `/api/method/trader_app.api.super_admin.get_tenant_audit_log` | tenant, page=1, page_size=20 | — | 🔍 Unknown |
| 213 | `get_suppliers` | suppliers | `/api/method/trader_app.api.suppliers.get_suppliers` | page=1, page_size=20, search=None, supplier_group=None | Supplier, Purchase Invoice | 🔍 Unknown |
| 214 | `get_supplier_detail` | suppliers | `/api/method/trader_app.api.suppliers.get_supplier_detail` | name | Purchase Invoice | 🔍 Unknown |
| 215 | `get_supplier_groups` | suppliers | `/api/method/trader_app.api.suppliers.get_supplier_groups` | none | — | 🔍 Unknown |
| 216 | `get_supplier_transactions` | suppliers | `/api/method/trader_app.api.suppliers.get_supplier_transactions` | supplier, company=None, page=1, page_size=20 | Purchase Invoice | 🔍 Unknown |
| 217 | `disable_supplier` | suppliers | `/api/method/trader_app.api.suppliers.disable_supplier` | name | — | 🔍 Unknown |
| 218 | `enable_supplier` | suppliers | `/api/method/trader_app.api.suppliers.enable_supplier` | name | — | 🔍 Unknown |
| 219 | `preview_tax` | tax_policy | `/api/method/trader_app.api.tax_policy.preview_tax` | company, posting_date=None, customer=None, is_service=0 | — | 🔍 Unknown |
| 220 | `get_document_template` | templates | `/api/method/trader_app.api.templates.get_document_template` | target_doctype, company=None, customer=None, persona=None | — | 🔍 Unknown |
| 221 | `get_multitenant_status` | tenant | `/api/method/trader_app.api.tenant.get_multitenant_status` | none | — | 🔍 Unknown |
| 222 | `get_tenant_config` | tenant | `/api/method/trader_app.api.tenant.get_tenant_config` | none | — | 🔍 Unknown |
| 223 | `get_business_tenant_audit_log` | tenant | `/api/method/trader_app.api.tenant.get_business_tenant_audit_log` | page=1, page_size=20 | — | 🔍 Unknown |
| 224 | `get_trading_entities` | trading_entity | `/api/method/trader_app.api.trading_entity.get_trading_entities` | company=None, include_inactive=0 | — | 🔍 Unknown |
| 225 | `get_trading_entity` | trading_entity | `/api/method/trader_app.api.trading_entity.get_trading_entity` | name | — | 🔍 Unknown |
| 226 | `create_trading_entity` | trading_entity | `/api/method/trader_app.api.trading_entity.create_trading_entity` | data=None | — | 🔍 Unknown |
| 227 | `update_trading_entity` | trading_entity | `/api/method/trader_app.api.trading_entity.update_trading_entity` | data=None | — | 🔍 Unknown |
| 228 | `seed_default_trading_entity` | trading_entity | `/api/method/trader_app.api.trading_entity.seed_default_trading_entity` | company=None | — | 🔍 Unknown |

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
| Custom whitelisted endpoints | 228 |
| With frontend consumer | 228 |
| Without frontend consumer (orphan) | 0 |
| Frappe built-in endpoints used | 4 (active) + 5 (defined, unused) |

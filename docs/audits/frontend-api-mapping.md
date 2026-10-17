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
Full scan of all API namespaces and page-level call sites — 2026-10-04

---

## API Namespaces

### `companyApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getCompanies` | GET | `trader_app.api.company.get_companies` | — |
| `getActive` | GET | `trader_app.api.company.get_active_company` | — |
| `setActive` | POST | `trader_app.api.company.set_active_company` | company: string |

### `tenantApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getStatus` | GET | `trader_app.api.tenant.get_multitenant_status` | — |
| `getConfig` | GET | `trader_app.api.tenant.get_tenant_config` | — |
| `getBusinessAuditLog` | GET | `trader_app.api.tenant.get_business_tenant_audit_log` | params?: { page?: number; page_size?: number } |

### `superAdminApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getDashboard` | GET | `trader_app.api.super_admin.get_tenant_dashboard` | — |
| `listTenants` | GET | `trader_app.api.super_admin.list_tenants` | params?: { search?: string; status?: string; page?: number; page_size?: number } |
| `getTenant` | GET | `trader_app.api.super_admin.get_tenant_detail` | tenant: string |
| `createTenant` | POST | `trader_app.api.super_admin.create_tenant` | data: Record<string, unknown> |
| `updateTenant` | POST | `trader_app.api.super_admin.update_tenant` | tenant: string, data: Record<string, unknown> |
| `setTenantStatus` | POST | `trader_app.api.super_admin.set_tenant_status` | tenant: string, status: string |
| `setTenantModules` | POST | `trader_app.api.super_admin.set_tenant_modules` | tenant: string, modules: string[] |
| `setTenantBranding` | POST | `trader_app.api.super_admin.set_tenant_branding` | tenant: string, branding: Record<string, unknown>, logo?: string |
| `setTenantNavProfile` | POST | `trader_app.api.super_admin.set_tenant_nav_profile` | tenant: string, profile: 'standard' | 'components_daybook' |
| `getTenantAuditLog` | GET | `trader_app.api.super_admin.get_tenant_audit_log` | tenant: string, params?: { page?: number; page_size?: number } |

### `authApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `login` | POST | `/api/method/login` | usr: string, pwd: string |
| `logout` | GET | `/api/method/logout` | — |
| `getLoggedUser` | GET | `/api/method/frappe.auth.get_logged_user` | — |
| `getRoles` | GET | `trader_app.api.settings.get_current_user_roles` | — |

### `dashboardApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getKPIs` | GET | `trader_app.api.dashboard.get_kpis` | company?: string |
| `getSalesTrend` | GET | `trader_app.api.dashboard.get_sales_trend` | company?: string, months?: number |
| `getTopCustomers` | GET | `trader_app.api.dashboard.get_top_customers` | limit?: number, company?: string |
| `getRecentOrders` | GET | `trader_app.api.dashboard.get_recent_orders` | limit?: number, company?: string |
| `getCashFlowSummary` | GET | `trader_app.api.dashboard.get_cash_flow_summary` | company?: string, months?: number |
| `getInventorySummary` | GET | `trader_app.api.dashboard.get_inventory_summary` | company?: string |

### `salesApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getDocumentCatalog` | GET | `trader_app.api.sales.get_sales_document_catalog` | — |
| `getInvoices` | GET | `trader_app.api.sales.get_sales_invoices` | params?: Record<string, any> |
| `getInvoiceDetail` | GET | `trader_app.api.sales.get_sales_invoice_detail` | name: string |
| `getOrders` | GET | `trader_app.api.sales.get_sales_orders` | params?: Record<string, any> |
| `getOrderDetail` | GET | `trader_app.api.sales.get_sales_order_detail` | name: string |
| `getQuotations` | GET | `trader_app.api.sales.get_quotations` | params?: Record<string, any> |
| `getQuotationDetail` | GET | `trader_app.api.sales.get_quotation_detail` | name: string |
| `getCustomerItemSalesHistory` | GET | `trader_app.api.sales.get_customer_item_sales_history` | params: { customer: string; item_code: string; company?: string; limit?: number } |
| `createInvoice` | POST | `trader_app.api.sales.create_sales_invoice` | data: Record<string, any> |
| `createOrder` | POST | `trader_app.api.sales.create_sales_order` | data: Record<string, any> |
| `createQuotation` | POST | `trader_app.api.sales.create_quotation` | data: Record<string, any> |
| `submitInvoice` | POST | `trader_app.api.sales.submit_sales_invoice` | name: string |
| `submitOrder` | POST | `trader_app.api.sales.submit_sales_order` | name: string |
| `submitQuotation` | POST | `trader_app.api.sales.submit_quotation` | name: string |
| `cancelInvoice` | POST | `trader_app.api.sales.cancel_sales_invoice` | name: string |
| `cancelOrder` | POST | `trader_app.api.sales.cancel_sales_order` | name: string |
| `cancelQuotation` | POST | `trader_app.api.sales.cancel_quotation` | name: string |
| `createReturnInvoice` | POST | `trader_app.api.sales.create_sales_invoice` | data: Record<string, any> |
| `getDeliveryNotes` | GET | `trader_app.api.sales.get_delivery_notes` | params?: Record<string, any> |
| `getDeliveryNoteDetail` | GET | `trader_app.api.sales.get_delivery_note_detail` | name: string |
| `createDeliveryNote` | POST | `trader_app.api.sales.create_delivery_note` | data: Record<string, any> |
| `submitDeliveryNote` | POST | `trader_app.api.sales.submit_delivery_note` | name: string |
| `cancelDeliveryNote` | POST | `trader_app.api.sales.cancel_delivery_note` | name: string |
| `createInvoiceFromChallan` | POST | `trader_app.api.grouped_invoicing.create_grouped_invoice` | name: string |
| `getInvoiceableDeliveryNotes` | GET | `trader_app.api.grouped_invoicing.get_invoiceable_delivery_notes` | customer?: string |
| `createGroupedInvoice` | POST | `trader_app.api.grouped_invoicing.create_grouped_invoice` | deliveryNotes: string[], postingDate?: string, autoSubmit?: boolean |
| `getSummary` | GET | `trader_app.api.sales.get_sales_summary` | company?: string |

### `opportunityApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getSettings` | GET | `trader_app.api.opportunity.get_opportunity_settings` | company?: string |
| `list` | GET | `trader_app.api.opportunity.list_opportunities` | params?: Record<string, any> |
| `get` | GET | `trader_app.api.opportunity.get_opportunity` | name: string, company?: string |
| `create` | POST | `trader_app.api.opportunity.create_opportunity` | data: Record<string, any> |
| `update` | POST | `trader_app.api.opportunity.update_opportunity` | name: string, data: Record<string, any> |
| `close` | POST | `trader_app.api.opportunity.close_opportunity` | name: string, close_stage: string |
| `reopen` | POST | `trader_app.api.opportunity.reopen_opportunity` | name: string |
| `addComment` | POST | `trader_app.api.opportunity.add_opportunity_comment` | name: string, comment: string |
| `addCustomerPo` | POST | `trader_app.api.opportunity.add_customer_po` | name: string, data: Record<string, any> |
| `linkDocument` | POST | `trader_app.api.opportunity.link_document` | opportunity: string, doctype: string, document_name: string |
| `listSourceQuotations` | GET | `trader_app.api.opportunity.list_source_quotations` | opportunity: string |
| `createQuotation` | POST | `trader_app.api.opportunity.create_quotation_for_opportunity` | opportunity: string, data?: Record<string, any> |
| `getQuotationDefaults` | GET | `trader_app.api.opportunity.get_quotation_defaults` | company?: string |
| `getClauseRateSnapshot` | GET | `trader_app.api.commercial_totals.get_clause_rate_snapshot` | as_of?: string, company?: string |
| `getCustomerCreditCheck` | GET | `trader_app.api.commercial_totals.get_customer_credit_check` | customer: string, quote_amount?: number, company?: string |
| `discardQuotationDraft` | POST | `trader_app.api.opportunity.discard_quotation_draft` | name: string |
| `saveQuotationOrderDetails` | POST | `trader_app.api.opportunity.save_quotation_order_details` | name: string, data: Record<string, any> |
| `createQuotationRevision` | POST | `trader_app.api.opportunity.create_quotation_revision` | name: string |
| `createOrderConfirmation` | POST | `trader_app.api.opportunity.create_order_confirmation` | params: {
    opportunity: string;
    source_quotation?: string;
    customer_po_no?: string;
  } |
| `createDeliveryNote` | POST | `trader_app.api.opportunity.create_delivery_note_for_opportunity` | opportunity: string, source_oc?: string |
| `listInvoiceableDeliveryNotes` | GET | `trader_app.api.opportunity.list_invoiceable_delivery_notes_for_opportunity` | opportunity: string |
| `createInvoice` | POST | `trader_app.api.opportunity.create_invoice_for_opportunity` | params: {
    opportunity: string;
    delivery_notes?: string[];
    posting_date?: string;
    auto_submit?: 0 | 1;
  } |
| `saveCommercialOptions` | POST | `trader_app.api.opportunity.save_commercial_options` | doctype: string, name: string, commercial_options: unknown |
| `toggleFeature` | POST | `trader_app.api.settings.toggle_opportunity_feature` | enabled: boolean, company?: string |

### `arApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getSettings` | GET | `trader_app.api.ar.get_ar_settings` | company?: string |
| `listPrintPersonas` | GET | `trader_app.api.ar.list_print_personas` | doctype: string, company?: string |
| `resolvePrintPersona` | GET | `trader_app.api.ar.resolve_print_persona` | params: {
    doctype: string;
    persona?: string;
    company?: string;
    customer?: string;
    name?: string;
  } |
| `toggleFeature` | POST | `trader_app.api.settings.toggle_ar_feature` | enabled: boolean, company?: string |

### `purchasesApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getDocumentCatalog` | GET | `trader_app.api.purchases.get_purchase_document_catalog` | — |
| `getInvoices` | GET | `trader_app.api.purchases.get_purchase_invoices` | params?: Record<string, any> |
| `getInvoiceDetail` | GET | `trader_app.api.purchases.get_purchase_invoice_detail` | name: string |
| `getOrders` | GET | `trader_app.api.purchases.get_purchase_orders` | params?: Record<string, any> |
| `getOrderDetail` | GET | `trader_app.api.purchases.get_purchase_order_detail` | name: string |
| `getRequisitions` | GET | `trader_app.api.purchases.get_material_requests` | params?: Record<string, any> |
| `getRequisitionDetail` | GET | `trader_app.api.purchases.get_material_request_detail` | name: string |
| `submitRequisition` | POST | `trader_app.api.purchases.submit_material_request` | name: string |
| `getRfqs` | GET | `trader_app.api.purchases.get_supplier_quotations` | params?: Record<string, any> |
| `getRfqDetail` | GET | `trader_app.api.purchases.get_supplier_quotation_detail` | name: string |
| `createInvoice` | POST | `trader_app.api.purchases.create_purchase_invoice` | data: Record<string, any> |
| `createOrder` | POST | `trader_app.api.purchases.create_purchase_order` | data: Record<string, any> |
| `createRequisition` | POST | `trader_app.api.purchases.create_material_request` | data: Record<string, any> |
| `createRfq` | POST | `trader_app.api.purchases.create_supplier_quotation` | data: Record<string, any> |
| `createOrderFromRfq` | POST | `trader_app.api.purchases.create_purchase_order_from_supplier_quotation` | name: string |
| `submitInvoice` | POST | `trader_app.api.purchases.submit_purchase_invoice` | name: string |
| `submitOrder` | POST | `trader_app.api.purchases.submit_purchase_order` | name: string |
| `submitRfq` | POST | `trader_app.api.purchases.submit_supplier_quotation` | name: string |
| `cancelInvoice` | POST | `trader_app.api.purchases.cancel_purchase_invoice` | name: string |
| `cancelOrder` | POST | `trader_app.api.purchases.cancel_purchase_order` | name: string |
| `cancelMaterialRequest` | POST | `trader_app.api.purchases.cancel_material_request` | name: string |
| `cancelSupplierQuotation` | POST | `trader_app.api.purchases.cancel_supplier_quotation` | name: string |
| `createReturnInvoice` | POST | `trader_app.api.purchases.create_purchase_invoice` | data: Record<string, any> |
| `getSummary` | GET | `trader_app.api.purchases.get_purchase_summary` | company?: string |

### `inventoryApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getStockBalance` | GET | `trader_app.api.inventory.get_stock_balance` | params?: Record<string, any> |
| `getStockLedger` | GET | `trader_app.api.inventory.get_stock_ledger` | params?: Record<string, any> |
| `getItems` | GET | `trader_app.api.inventory.get_items` | params?: Record<string, any> |
| `getItemDetail` | GET | `trader_app.api.inventory.get_item_detail` | itemCode: string |
| `getWarehouses` | GET | `trader_app.api.inventory.get_warehouses` | company?: string |
| `getWarehouseItemQty` | GET | `trader_app.api.inventory.get_warehouse_item_qty` | item_code: string, warehouse: string, company?: string |
| `getItemsQoh` | GET | `trader_app.api.inventory.get_items_qoh` | item_codes: string[], warehouse: string, company?: string |
| `validateSerialForItem` | GET | `trader_app.api.inventory.validate_serial_for_item` | params: { item_code: string; serial_no: string; warehouse?: string; company?: string } |
| `validateItemsStock` | POST | `trader_app.api.inventory.validate_items_stock` | items: { item_code: string; warehouse: string; qty: number }[] |
| `validateSerialForPurchase` | GET | `trader_app.api.inventory.validate_serial_for_purchase` | params: { item_code: string; serial_no: string; company?: string } |
| `lookupByBarcode` | GET | `trader_app.api.inventory.lookup_item_by_barcode` | barcode: string, company?: string |
| `getSummary` | GET | `trader_app.api.inventory.get_inventory_summary` | company?: string |
| `getLowStockItems` | GET | `trader_app.api.inventory.get_low_stock_items` | params?: Record<string, any> |
| `getItemGroups` | GET | `trader_app.api.inventory.get_item_groups` | — |
| `createItem` | POST | `trader_app.api.inventory.create_item` | data: Record<string, any> |
| `createStockEntry` | POST | `trader_app.api.inventory.create_stock_entry` | data: Record<string, any> |
| `createPurchaseReceipt` | POST | `trader_app.api.inventory.create_purchase_receipt` | data: Record<string, any> |
| `createSalesDispatch` | POST | `trader_app.api.inventory.create_sales_dispatch` | data: Record<string, any> |

### `customersApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getList` | GET | `trader_app.api.customers.get_customers` | params?: Record<string, any> |
| `getDetail` | GET | `trader_app.api.customers.get_customer_detail` | name: string |
| `getGroups` | GET | `trader_app.api.customers.get_customer_groups` | — |
| `getFormSetup` | GET | `trader_app.api.customers.get_customer_form_setup` | company?: string |
| `getTransactions` | GET | `trader_app.api.customers.get_customer_transactions` | customer: string, params?: Record<string, any> |
| `create` | POST | `trader_app.api.customers.create_customer` | data: Record<string, any> |
| `update` | POST | `trader_app.api.customers.update_customer` | data: Record<string, any> |
| `addContact` | POST | `trader_app.api.customers.add_customer_contact` | data: Record<string, any> |
| `deleteContact` | POST | `trader_app.api.customers.delete_customer_contact` | name: string, customer: string |
| `enable` | POST | `trader_app.api.customers.enable_customer` | name: string |
| `disable` | POST | `trader_app.api.customers.disable_customer` | name: string |

### `customerPackApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getSettings` | GET | `trader_app.api.customer_pack.get_customer_pack_settings` | company?: string |
| `toggleFeature` | POST | `trader_app.api.settings.toggle_customer_pack_feature` | enabled: boolean, company?: string |

### `suppliersApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getList` | GET | `trader_app.api.suppliers.get_suppliers` | params?: Record<string, any> |
| `getDetail` | GET | `trader_app.api.suppliers.get_supplier_detail` | name: string |
| `getGroups` | GET | `trader_app.api.suppliers.get_supplier_groups` | — |
| `getTransactions` | GET | `trader_app.api.suppliers.get_supplier_transactions` | supplier: string, params?: Record<string, any> |
| `create` | POST | `trader_app.api.suppliers.create_supplier` | data: Record<string, any> |
| `update` | POST | `trader_app.api.suppliers.update_supplier` | data: Record<string, any> |
| `enable` | POST | `trader_app.api.suppliers.enable_supplier` | name: string |
| `disable` | POST | `trader_app.api.suppliers.disable_supplier` | name: string |
| `getPaymentEntries` | GET | `trader_app.api.finance.get_payment_entries` | params?: Record<string, any> |
| `getPaymentEntryDetail` | GET | `trader_app.api.finance.get_payment_entry_detail` | name: string |
| `getPaymentEntrySetup` | GET | `trader_app.api.finance.get_payment_entry_setup` | company?: string |
| `createPaymentEntry` | POST | `trader_app.api.finance.create_payment_entry` | data: Record<string, any> |
| `getOpenInvoicesForPayment` | GET | `trader_app.api.finance.get_open_invoices_for_payment` | party_type: string, party: string, company?: string |
| `recordInvoicePayment` | POST | `trader_app.api.finance.record_invoice_payment` | data: Record<string, any> |
| `submitPaymentEntry` | POST | `trader_app.api.finance.submit_payment_entry` | name: string |
| `cancelPaymentEntry` | POST | `trader_app.api.finance.cancel_payment_entry` | name: string |
| `getJournalEntries` | GET | `trader_app.api.finance.get_journal_entries` | params?: Record<string, any> |
| `getJournalEntryDetail` | GET | `trader_app.api.finance.get_journal_entry_detail` | name: string |
| `getAccounts` | GET | `trader_app.api.finance.get_accounts` | params?: Record<string, any> |
| `createJournalEntry` | POST | `trader_app.api.finance.create_journal_entry` | data: Record<string, any> |
| `submitJournalEntry` | POST | `trader_app.api.finance.submit_journal_entry` | name: string |
| `cancelJournalEntry` | POST | `trader_app.api.finance.cancel_journal_entry` | name: string |
| `getOutstandingSummary` | GET | `trader_app.api.finance.get_outstanding_summary` | company?: string |

### `reportsApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getSalesReport` | GET | `trader_app.api.reports.get_sales_report` | params?: Record<string, any> |
| `getPurchaseReport` | GET | `trader_app.api.reports.get_purchase_report` | params?: Record<string, any> |
| `getItemSalesReport` | GET | `trader_app.api.reports.get_item_sales_report` | params?: Record<string, any> |
| `getCustomerLedger` | GET | `trader_app.api.reports.get_customer_ledger` | customer: string, params?: Record<string, any> |
| `getCustomerStatement` | GET | `trader_app.api.reports.get_customer_statement` | customer: string, params?: Record<string, any> |
| `getSupplierLedger` | GET | `trader_app.api.reports.get_supplier_ledger` | supplier: string, params?: Record<string, any> |
| `getReceivableAgingSummary` | GET | `trader_app.api.reports.get_receivable_aging` | — |
| `getReceivableAgingDetail` | GET | `trader_app.api.reports.get_receivable_aging_detail` | params?: Record<string, any> |
| `getAccountsPayable` | GET | `trader_app.api.reports.get_accounts_payable` | — |
| `getProfitAndLoss` | GET | `trader_app.api.reports.get_profit_and_loss` | params?: Record<string, any> |
| `getGeneralLedger` | GET | `trader_app.api.reports.get_general_ledger` | params?: Record<string, any> |
| `getSalesPerformanceReport` | GET | `trader_app.api.reports.get_sales_performance_report` | params?: Record<string, any> |
| `getCustomerProfitabilityReport` | GET | `trader_app.api.reports.get_customer_profitability_report` | params?: Record<string, any> |
| `getStockAgingReport` | GET | `trader_app.api.reports.get_stock_aging_report` | params?: Record<string, any> |
| `getInventoryMovementReport` | GET | `trader_app.api.reports.get_inventory_movement_report` | params?: Record<string, any> |
| `getReorderReport` | GET | `trader_app.api.reports.get_reorder_report` | params?: Record<string, any> |
| `getSupplierScorecardReport` | GET | `trader_app.api.reports.get_supplier_scorecard_report` | params?: Record<string, any> |
| `getPurchasePriceVarianceReport` | GET | `trader_app.api.reports.get_purchase_price_variance_report` | params?: Record<string, any> |
| `getReceivableAgingInvoiceDetail` | GET | `trader_app.api.reports.get_receivable_aging_invoice_detail` | params?: Record<string, any> |
| `getPayableAgingInvoiceDetail` | GET | `trader_app.api.reports.get_payable_aging_invoice_detail` | params?: Record<string, any> |
| `getTaxSummaryReport` | GET | `trader_app.api.reports.get_tax_summary_report` | params?: Record<string, any> |
| `getOpenPurchaseOrdersReport` | GET | `trader_app.api.reports.get_open_purchase_orders_report` | params?: Record<string, any> |
| `getCollectionEfficiencyReport` | GET | `trader_app.api.reports.get_collection_efficiency_report` | params?: Record<string, any> |
| `getDailySalesReport` | GET | `trader_app.api.reports.get_daily_sales_report` | params?: Record<string, any> |
| `getSalesReturnReport` | GET | `trader_app.api.reports.get_sales_return_report` | params?: Record<string, any> |
| `getPurchaseReturnReport` | GET | `trader_app.api.reports.get_purchase_return_report` | params?: Record<string, any> |
| `getCashflowReport` | GET | `trader_app.api.reports.get_cashflow_report` | params?: Record<string, any> |
| `getProfitLossSummaryReport` | GET | `trader_app.api.reports.get_profit_loss_summary_report` | params?: Record<string, any> |
| `getStockBalanceReport` | GET | `trader_app.api.reports.get_stock_balance_report` | params?: Record<string, any> |
| `getSalespersonPerformanceReport` | GET | `trader_app.api.reports.get_salesperson_performance_report` | params?: Record<string, any> |
| `getItemPurchaseReport` | GET | `trader_app.api.reports.get_item_purchase_report` | params?: Record<string, any> |
| `getConsolidatedCompanySummary` | GET | `trader_app.api.reports.get_consolidated_company_summary` | params?: Record<string, any> |
| `getTrialBalanceReport` | GET | `trader_app.api.reports.get_trial_balance_report` | params?: Record<string, any> |
| `getBalanceSheetReport` | GET | `trader_app.api.reports.get_balance_sheet_report` | params?: Record<string, any> |
| `getSerialTraceReport` | GET | `trader_app.api.reports.get_serial_trace_report` | params?: Record<string, any> |
| `getFxGainLossReport` | GET | `trader_app.api.reports.get_fx_gain_loss_report` | params?: Record<string, any> |

### `auditApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getLog` | GET | `trader_app.api.audit.get_audit_log` | params?: Record<string, any> |

### `currencyApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getOptions` | GET | `trader_app.api.currency.get_currency_options` | company?: string |
| `getExchangeRate` | GET | `trader_app.api.currency.get_exchange_rate_for_date` | currency: string, posting_date?: string, transaction_type: 'selling' | 'buying' = 'selling' |
| `getSettings` | GET | `trader_app.api.currency.get_currency_settings` | company?: string |
| `saveSettings` | POST | `trader_app.api.currency.save_currency_settings` | data: {
    base_currency?: string;
    multi_currency_enabled?: boolean | number;
    enabled_currencies?: string[];
    company?: string;
  } |
| `saveExchangeRate` | POST | `trader_app.api.currency.save_exchange_rate` | data: {
    from_currency: string;
    exchange_rate: number;
    to_currency?: string;
    date?: string;
    for_selling?: boolean | number;
    for_buying?: boolean | number;
    company?: string;
  } |
| `deleteExchangeRate` | POST | `trader_app.api.currency.delete_exchange_rate` | name: string |

### `posApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getSetup` | GET | `trader_app.api.pos.get_pos_setup` | company?: string |
| `createSale` | POST | `trader_app.api.pos.create_pos_sale` | data: Record<string, any> |

### `settingsApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `get` | GET | `trader_app.api.settings.get_settings` | — |
| `save` | POST | `trader_app.api.settings.save_settings` | data: Record<string, any> |
| `getRoles` | GET | `trader_app.api.settings.get_current_user_roles` | — |
| `getTraderRoles` | GET | `trader_app.api.settings.get_trader_roles` | — |

### `gstApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getSettings` | GET | `trader_app.api.gst.get_gst_settings` | — |
| `saveSettings` | POST | `trader_app.api.gst.save_gst_settings` | data: Record<string, any> |
| `seedTemplates` | POST | `trader_app.api.gst.seed_punjab_gst_templates` | company: string |
| `getTaxTemplates` | GET | `trader_app.api.gst.get_tax_templates` | doctype_filter?: string |

### `bundlingApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getBundles` | GET | `trader_app.api.bundling.get_item_bundles` | params?: Record<string, any> |
| `getBundleDetail` | GET | `trader_app.api.bundling.get_item_bundle_detail` | name: string |
| `createBundle` | POST | `trader_app.api.bundling.create_item_bundle` | data: Record<string, any> |
| `updateBundle` | POST | `trader_app.api.bundling.update_item_bundle` | data: Record<string, any> |
| `deleteBundle` | POST | `trader_app.api.bundling.delete_item_bundle` | name: string |
| `expandBundle` | POST | `trader_app.api.bundling.expand_bundle` | name: string |

### `printApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getPrintData` | GET | `trader_app.api.printing.get_print_data` | doctype: string, name: string, viewMode?: string, format?: string |

### `catalogApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getTaxonomy` | GET | `trader_app.api.catalog.get_taxonomy` | company?: string |
| `getItems` | GET | `trader_app.api.catalog.get_catalog_items` | params?: Record<string, any> |
| `findOrCreateSku` | POST | `trader_app.api.catalog.find_or_create_sku` | data: {
    category: string;
    form_factor: string;
    capacity: string;
    grade: string;
    standard_rate?: number;
    company?: string;
  } |
| `resolveItem` | POST | `trader_app.api.catalog.resolve_item` | data: {
    item_code?: string;
    barcode?: string;
    template?: string;
    category?: string;
    form_factor?: string;
    capacity?: string;
    grade?: string;
    item_name?: string;
    item_group?: string;
    stock_uom?: string;
    standard_rate?: number;
    has_serial_no?: number;
    company?: string;
  } |
| `ensureTaxonomyValues` | POST | `trader_app.api.catalog.ensure_taxonomy_values` | data: {
    category: string;
    form_factor?: string;
    capacity?: string;
    grade?: string;
    company?: string;
  } |
| `saveSkuTaxonomy` | POST | `trader_app.api.catalog.save_sku_taxonomy` | taxonomy: Record<string, unknown>, company?: string |
| `getItemLineConfig` | GET | `trader_app.api.catalog.get_item_line_config` | params?: { company?: string; item_group?: string } |
| `saveItemGroupTemplates` | POST | `trader_app.api.catalog.save_item_group_templates` | mapping: Record<string, unknown>, company?: string |
| `saveCustomSkuTemplates` | POST | `trader_app.api.catalog.save_custom_sku_templates` | templates: Record<string, unknown>, company?: string |
| `parseQuickEntry` | POST | `trader_app.api.catalog.parse_quick_entry` | text: string, company?: string |
| `importOpeningStock` | POST | `trader_app.api.catalog.import_opening_stock` | data: {
    items: { item_code: string; qty: number; rate: number; warehouse: string }[];
    warehouse: string;
    company?: string;
  } |
| `getStockTakeItems` | GET | `trader_app.api.catalog.get_stock_take_items` | params?: Record<string, any> |
| `createStockTake` | POST | `trader_app.api.catalog.create_stock_take` | data: {
    items: { item_code: string; counted_qty: number; warehouse: string }[];
    warehouse: string;
    company?: string;
  } |
| `toggleFeature` | POST | `trader_app.api.settings.toggle_components_feature` | enabled: boolean, company?: string |

### `adminApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getUsers` | GET | `trader_app.api.admin.get_users` | params?: Record<string, any> |
| `getUserDetail` | GET | `trader_app.api.admin.get_user_detail` | user: string |
| `createUser` | POST | `trader_app.api.admin.create_user` | data: Record<string, any> |
| `updateUser` | POST | `trader_app.api.admin.update_user` | data: Record<string, any> |
| `setUserEnabled` | POST | `trader_app.api.admin.set_user_enabled` | user: string, enabled: boolean |
| `getAllRoles` | GET | `trader_app.api.admin.get_all_roles` | — |
| `getRoleUsers` | GET | `trader_app.api.admin.get_role_users` | role: string |
| `assignRoleToUser` | POST | `trader_app.api.admin.assign_role_to_user` | user: string, role: string |
| `removeRoleFromUser` | POST | `trader_app.api.admin.remove_role_from_user` | user: string, role: string |
| `getCompanySettings` | GET | `trader_app.api.admin.get_company_settings` | company?: string |
| `saveCompanySettings` | POST | `trader_app.api.admin.save_company_settings` | data: Record<string, any> |
| `getFiscalYears` | GET | `trader_app.api.admin.get_fiscal_years` | — |
| `createFiscalYear` | POST | `trader_app.api.admin.create_fiscal_year` | data: Record<string, any> |
| `setActiveFiscalYear` | POST | `trader_app.api.admin.set_active_fiscal_year` | name: string |
| `getWarehouses` | GET | `trader_app.api.admin.get_warehouses` | company?: string |
| `createWarehouse` | POST | `trader_app.api.admin.create_warehouse` | data: Record<string, any> |
| `updateWarehouse` | POST | `trader_app.api.admin.update_warehouse` | data: Record<string, any> |
| `getAccountingSettings` | GET | `trader_app.api.admin.get_accounting_settings` | — |
| `saveAccountingSettings` | POST | `trader_app.api.admin.save_accounting_settings` | data: Record<string, any> |

### `tradingEntityApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getList` | GET | `trader_app.api.trading_entity.get_trading_entities` | params?: { company?: string; include_inactive?: number } |
| `getDetail` | GET | `trader_app.api.trading_entity.get_trading_entity` | name: string |
| `create` | POST | `trader_app.api.trading_entity.create_trading_entity` | data: Record<string, any> |
| `update` | POST | `trader_app.api.trading_entity.update_trading_entity` | data: Record<string, any> |
| `seedDefault` | POST | `trader_app.api.trading_entity.seed_default_trading_entity` | company?: string |

### `daybookApi`

| Method | HTTP | Endpoint | Parameters |
|---|---|---|---|
| `getDayBook` | GET | `trader_app.api.daybook.get_day_book` | params?: Record<string, any> |
| `getDayCloseSummary` | GET | `trader_app.api.daybook.get_day_close_summary` | params?: Record<string, any> |
| `getStockValuation` | GET | `trader_app.api.daybook.get_component_stock_valuation` | params?: Record<string, any> |
| `getIncoming` | GET | `trader_app.api.daybook.get_incoming` | params?: Record<string, any> |
| `getOutgoing` | GET | `trader_app.api.daybook.get_outgoing` | params?: Record<string, any> |
| `settleParty` | POST | `trader_app.api.daybook.settle_party` | data: {
    party_type: 'Customer' | 'Supplier';
    party: string;
    amount: number;
    mode_of_payment?: string;
    company?: string;
    posting_date?: string;
    settlement_account?: string;
    allocations?: { reference_name: string; allocated_amount: number }[];
  } |
| `getPartyOpenInvoices` | GET | `trader_app.api.daybook.get_party_open_invoices` | params: {
    party_type: 'Customer' | 'Supplier';
    party: string;
    company?: string;
  } |
| `findOrCreateParty` | POST | `trader_app.api.daybook.find_or_create_party` | data: {
    party_type: 'Customer' | 'Supplier';
    party_name: string;
    short_code?: string;
    company?: string;
  } |
| `postDayTransaction` | POST | `trader_app.api.daybook.post_day_transaction` | data: {
    tx_type: 'sale' | 'purchase' | 'payment_in' | 'payment_out';
    party: string;
    lines?: {
      item_code: string;
      qty: number;
      rate: number;
      warehouse?: string;
      serial_no?: string;
      description?: string;
    }[];
    amount?: number;
    mode_of_payment?: string;
    posting_date?: string;
    company?: string;
    record_payment?: number;
    payment_amount?: number;
    settlement_account?: string;
    invoice_type?: string;
    allocations?: { reference_name: string; allocated_amount: number }[];
  } |

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

# Frontend Actions Audit

## Title
Traders — Frontend User Actions Inventory

## Purpose
All forms, buttons, handlers, mutations, filters, exports, drill-ins, and workflow actions across the frontend.

## Generated From
Current page components in `frontend/trader-ui/src/pages/*.tsx`

## Last Audit Basis
Manual reconciliation against the shipped frontend screens and handlers — 2026-03-16

---

## Current interpretation note

This inventory has been refreshed against the current shipped UI, not the original shell-only baseline. Several formerly placeholder actions now have working handlers, routed create flows, preserved context navigation, and CSV export support.

## Functional Actions (✅ Implemented)

| # | Screen | Action | Type | Handler / Mechanism | API or Outcome | Status |
|---|---|---|---|---|---|---|
| 1 | `LoginPage` | Login form submit | Form | `handleSubmit` | `authApi.login()` | ✅ |
| 2 | `LoginPage` | Show/hide password | Toggle | local state | UI-only | ✅ |
| 3 | `Navbar` | Logout | Button | `handleLogout` | `authApi.logout()` | ✅ |
| 4 | `Navbar` | Global workflow search | Input + results | local search + `navigate()` | capability-aware route suggestions | ✅ |
| 5 | `Navbar` | Open notifications center | Button | local state panel | role-aware workflow links | ✅ |
| 6 | `SalesPage` | Search invoices | Input | debounced search params | `salesApi.getInvoices()` | ✅ |
| 7 | `SalesPage` | Filter by status | Button group | URL-backed `status` param | `salesApi.getInvoices()` | ✅ |
| 8 | `SalesPage` | Paginate invoices | Button | URL-backed `page` param | `salesApi.getInvoices()` | ✅ |
| 9 | `SalesPage` | Export visible invoices | Button | `handleExport` | CSV download | ✅ |
| 10 | `SalesPage` | New sales invoice | Button | `navigate('/sales/new')` | create route | ✅ |
| 11 | `SalesPage` | Open invoice detail | Row click | `buildDetailPath()` | detail route | ✅ |
| 12 | `SalesPage` | Create sales return | Row action | `buildReturnPath()` | return draft route | ✅ |
| 12 | `PurchasesPage` | Search purchase invoices | Input | debounced search params | `purchasesApi.getInvoices()` | ✅ |
| 13 | `PurchasesPage` | Filter by status | Button group | URL-backed `status` param | `purchasesApi.getInvoices()` | ✅ |
| 14 | `PurchasesPage` | Paginate purchase invoices | Button | URL-backed `page` param | `purchasesApi.getInvoices()` | ✅ |
| 15 | `PurchasesPage` | Export visible invoices | Button | `handleExport` | CSV download | ✅ |
| 16 | `PurchasesPage` | New purchase invoice | Button | `navigate('/purchases/new')` | create route | ✅ |
| 17 | `PurchasesPage` | Open invoice detail | Row click | `buildDetailPath()` | detail route | ✅ |
| 16 | `CustomersPage` | Search customers | Input | debounced search params | `customersApi.getList()` | ✅ |
| 17 | `CustomersPage` | Filter by customer group | Select | URL-backed `group` param | `customersApi.getList()` | ✅ |
| 18 | `CustomersPage` | Paginate customers | Button | URL-backed `page` param | `customersApi.getList()` | ✅ |
| 19 | `CustomersPage` | Add customer | Button | `navigate('/customers/new')` | create route | ✅ |
| 20 | `CustomersPage` | Open customer detail | Row click | `buildCustomerDetailPath()` | detail route | ✅ |
| 21 | `CustomersPage` | Collect payment | Row action | preserved finance route | payment create route | ✅ |
| 22 | `SuppliersPage` | Search suppliers | Input | debounced search params | `suppliersApi.getList()` | ✅ |
| 23 | `SuppliersPage` | Filter by supplier group | Select | URL-backed `group` param | `suppliersApi.getList()` | ✅ |
| 24 | `SuppliersPage` | Paginate suppliers | Button | URL-backed `page` param | `suppliersApi.getList()` | ✅ |
| 25 | `SuppliersPage` | Add supplier | Button | `navigate('/suppliers/new')` | create route | ✅ |
| 26 | `SuppliersPage` | Open supplier detail | Row click | `buildSupplierDetailPath()` | detail route | ✅ |
| 27 | `SuppliersPage` | Pay supplier | Row action | preserved finance route | payment create route | ✅ |
| 28 | `SettingsPage` | Refresh settings | Button | `loadSettings()` | `settingsApi.get()` + roles fetch | ✅ |
| 29 | `SettingsPage` | Edit settings fields | Form | `updateUi()` | local state | ✅ |
| 30 | `SettingsPage` | Reset unsaved changes | Button | `handleReset` | local state reset | ✅ |
| 31 | `SettingsPage` | Save settings | Button | `handleSave` | `settingsApi.save()` | ✅ |
| 32 | `ReportsPage` | Switch report tab | Button group | search params `tab` | multiple `reportsApi` calls | ✅ |
| 33 | `ReportsPage` | Export active report | Button | `handleExport` | CSV download | ✅ |
| 34 | `ReportsPage` | Receivable drill-in search | Input | search params `receivableSearch` | client-side filter | ✅ |
| 35 | `ReportsPage` | Payable drill-in search | Input | search params `payableSearch` | client-side filter | ✅ |
| 36 | `ReportsPage` | Open customer from receivables | Row action | preserved route | customer detail route | ✅ |
| 37 | `ReportsPage` | Open supplier from payables | Row action | preserved route | supplier detail route | ✅ |
| 38 | `OperationsPage` | Filter by module | Button group | search params `module` | client-side filter | ✅ |
| 39 | `OperationsPage` | Toggle open-only queues | Button | search params `openOnly` | client-side filter | ✅ |
| 40 | `OperationsPage` | Search queues | Input | debounced search params | client-side filter | ✅ |
| 41 | `OperationsPage` | Export visible queues | Button | `handleExport` | CSV download | ✅ |
| 42 | `OperationsPage` | Open queue controller | Button / card CTA | preserved route | workflow list route | ✅ |
| 43 | `OperationsPage` | Launch quick actions | Button row | preserved route | create/list routes | ✅ |
| 44 | `OperationsPage` | Toggle approval-focused queues | Button | search params `approvalOnly` | client-side filter | ✅ |
| 44 | `QuotationsPage` | Search quotations | Input | debounced search params | `salesApi.getQuotations()` | ✅ |
| 45 | `QuotationsPage` | Filter quotation status | Button group | URL-backed `status` param | `salesApi.getQuotations()` | ✅ |
| 46 | `QuotationsPage` | Paginate quotations | Button | URL-backed `page` param | `salesApi.getQuotations()` | ✅ |
| 47 | `QuotationsPage` | Create sales order | Row action | `buildSalesOrderPrefill()` | create route with prefills | ✅ |
| 48 | `QuotationsPage` | View customer | Row action | preserved route | customer detail route | ✅ |
| 49 | `SalesOrdersPage` | Search sales orders | Input | debounced search params | `salesApi.getOrders()` | ✅ |
| 50 | `SalesOrdersPage` | Filter sales order status | Button group | URL-backed `status` param | `salesApi.getOrders()` | ✅ |
| 51 | `SalesOrdersPage` | New sales order | Button | `navigate('/sales/orders/new')` | create route | ✅ |
| 52 | `SalesOrdersPage` | Create sales invoice | Row action | `buildSalesInvoicePrefill()` | create route with prefills | ✅ |
| 53 | `SalesOrdersPage` | Create sales dispatch | Row action | `buildSalesDispatchPrefill()` | dispatch draft route | ✅ |
| 54 | `SalesOrdersPage` | View customer | Row action | preserved route | customer detail route | ✅ |
| 54 | `PurchaseOrdersPage` | Search purchase orders | Input | debounced search params | `purchasesApi.getOrders()` | ✅ |
| 55 | `PurchaseOrdersPage` | Filter purchase order status | Button group | URL-backed `status` param | `purchasesApi.getOrders()` | ✅ |
| 56 | `PurchaseOrdersPage` | New purchase order | Button | `navigate('/purchases/orders/new')` | create route | ✅ |
| 57 | `PurchaseOrdersPage` | Create purchase invoice | Row action | `buildPurchaseInvoicePrefill()` | create route with prefills | ✅ |
| 58 | `PurchaseOrdersPage` | View supplier | Row action | preserved route | supplier detail route | ✅ |
| 59 | `PurchaseOrderDetailPage` | Create purchase receipt | Button | routed receipt prefill | stock receipt draft flow | ✅ |
| 59 | `CreateCustomerPage` | Create customer | Form | save handler | `customersApi.create()` | ✅ |
| 60 | `CreateSupplierPage` | Create supplier | Form | `handleSave` | `suppliersApi.create()` | ✅ |
| 61 | `CreateSalesOrderPage` | Create sales order draft | Form | `handleSubmit` | `salesApi.createOrder()` | ✅ |
| 62 | `CreateSalesInvoicePage` | Create sales invoice draft | Form | `handleSubmit` | `salesApi.createInvoice()` | ✅ |
| 63 | `CreatePurchaseOrderPage` | Create purchase order draft | Form | `handleSubmit` | `purchasesApi.createOrder()` | ✅ |
| 64 | `CreatePurchaseInvoicePage` | Create purchase invoice draft | Form | `handleSubmit` | `purchasesApi.createInvoice()` | ✅ |
| 65 | `CreatePaymentEntryPage` | Create payment draft | Form | submit handler | `financeApi.createPaymentEntry()` | ✅ |
| 66 | `CreateJournalEntryPage` | Create journal draft | Form | submit handler | `financeApi.createJournalEntry()` | ✅ |
| 67 | `SalesOrderDetailPage` | Submit order | Button | submit handler | `salesApi.submitOrder()` | ✅ |
| 68 | `SalesOrderDetailPage` | View quotation/customer | Button | preserved route navigation | detail route | ✅ |
| 69 | `SalesOrderDetailPage` | Create sales dispatch | Button | routed dispatch prefill | stock issue draft flow | ✅ |
| 70 | `SalesOrderDetailPage` | Create/open invoice | Button | route launch | downstream invoice flow | ✅ |
| 71 | `SalesInvoiceDetailPage` | Submit invoice | Button | submit handler | `salesApi.submitInvoice()` | ✅ |
| 72 | `SalesInvoiceDetailPage` | Collect payment | Button | preserved route navigation | downstream payment flow | ✅ |
| 73 | `SalesInvoiceDetailPage` | Create sales return | Button | routed return prefill | return invoice draft flow | ✅ |
| 74 | `CreateSalesReturnPage` | Create sales return draft | Form | `handleSubmit` | `salesApi.createReturnInvoice()` | ✅ |
| 75 | `PurchaseOrderDetailPage` | Submit order | Button | submit handler | `purchasesApi.submitOrder()` | ✅ |
| 76 | `PurchaseOrderDetailPage` | View supplier | Button | preserved route navigation | supplier detail route | ✅ |
| 77 | `PurchaseOrderDetailPage` | Create/open invoice | Button | route launch | downstream invoice flow | ✅ |
| 78 | `PurchaseInvoiceDetailPage` | Submit invoice | Button | submit handler | `purchasesApi.submitInvoice()` | ✅ |
| 79 | `PurchaseInvoiceDetailPage` | Pay supplier | Button | preserved route navigation | downstream payment flow | ✅ |
| 80 | `PaymentEntriesPage` | Filter payment type | Button group | URL-backed `paymentType` param | `financeApi.getPaymentEntries()` | ✅ |
| 81 | `PaymentEntriesPage` | Search payments | Input | debounced search params | `financeApi.getPaymentEntries()` | ✅ |
| 82 | `PaymentEntriesPage` | Paginate payments | Button | URL-backed `page` param | `financeApi.getPaymentEntries()` | ✅ |
| 83 | `PaymentEntriesPage` | New payment entry | Button | preserved route navigation | create route | ✅ |
| 84 | `PaymentEntryDetailPage` | Submit payment | Button | submit handler | `financeApi.submitPaymentEntry()` | ✅ |
| 85 | `JournalEntriesPage` | Search journals | Input | debounced search params | `financeApi.getJournalEntries()` | ✅ |
| 86 | `JournalEntriesPage` | Paginate journals | Button | URL-backed `page` param | `financeApi.getJournalEntries()` | ✅ |
| 87 | `JournalEntriesPage` | New journal entry | Button | preserved route navigation | create route | ✅ |
| 88 | `JournalEntryDetailPage` | Submit journal | Button | submit handler | `financeApi.submitJournalEntry()` | ✅ |
| 89 | `InventoryPage` | Switch summary tab | Tab | local state / filtering | inventory data views | ✅ |
| 90 | `InventoryPage` | Search inventory items | Input | local state / filtering | inventory data views | ✅ |
| 91 | `InventoryPage` | Open item detail | Row/card action | route navigation | detail route | ✅ |
| 92 | `InventoryPage` | Open warehouse stock | Row/card action | route navigation | warehouse route | ✅ |
| 93 | `InventoryPage` | Open stock movement | Action | route navigation | stock ledger route | ✅ |
| 94 | `CustomerOutstandingPage` | Search customers | Input | search params | client-side filtered report detail | ✅ |
| 95 | `CustomerOutstandingPage` | View customer | Row action | preserved route | customer detail route | ✅ |
| 96 | `CustomerOutstandingPage` | Collect payment | Row action | preserved route | payment create route | ✅ |
| 97 | `CustomerAgingPage` | Search customers | Input | search params | client-side filtered aging detail | ✅ |
| 98 | `CustomerAgingPage` | Open customer detail | Row action | preserved route | customer detail route | ✅ |
| 99 | `WarehouseStockPage` | Back to inventory | Button | route navigation | inventory route | ✅ |
| 100 | `StockMovementPage` | Filter by item/warehouse/date | Inputs | local state | `inventoryApi.getStockLedger()` | ✅ |
| 101 | `StockMovementPage` | Paginate stock ledger | Button | local state | `inventoryApi.getStockLedger()` | ✅ |
| 102 | `CreatePurchaseReceiptPage` | Create material receipt draft | Form | `handleCreateReceipt` | `inventoryApi.createPurchaseReceipt()` | ✅ |
| 103 | `CreateSalesDispatchPage` | Create sales dispatch draft | Form | `handleCreateDispatch` | `inventoryApi.createSalesDispatch()` | ✅ |

## Non-Functional or Partial Actions (⚠️ Remaining Gaps)

| # | Screen | Action | Type | Current State | Expected Outcome |
|---|---|---|---|---|---|
| 101 | `OperationsPage` | Exception ownership/escalation actions | Queue/controller | approval visibility exists, but exception assignment/escalation actions are still absent | richer controller actions |
| 104 | `Sales` specialist workflows | Fulfillment and return exceptions | workflow family | return drafting now exists, but richer fulfillment exception handling and return resolution controls remain incomplete | deeper post-order sales workflow coverage |
| 114 | `Purchases` specialist workflows | Quote comparison and receiving exceptions | workflow family | requisitions and RFQs now exist, but quote comparison/award and richer receiving exception handling remain incomplete | deeper procurement workflow coverage |
| 115 | `Finance` specialist workflows | Reconciliation and close | workflow family | journals/payments exist, but reconciliation and close processes remain incomplete | deeper finance workflow coverage |

## Summary

| Category | Count |
|---|---|
| Fully functional actions | 113 |
| Non-functional / partial actions | 4 |
| **Total tracked actions** | **117** |
| **Implementation rate** | **96%** |

## Notes

- This audit now reflects the current routed application, not the original shell-only scaffold.
- The biggest maturity gains since the initial baseline are in:
	- create flows
	- submit actions
	- export actions
	- role-aware visibility
	- navbar search + notifications
	- URL-backed filters/search
	- preserved workflow navigation
	- operations controller actions
	- procurement requisition / RFQ drafting
	- purchase receipt drafting
	- sales dispatch drafting
	- sales return drafting
- Remaining gaps are now concentrated in deeper specialist ERP workflow depth rather than missing basic cross-cutting UI handlers.

# Frontend Screen Inventory

Source: `frontend/trader-ui/src/App.tsx`  
Last audit: **2026-07-23**

## Route Inventory

| Path | Component | Guard / Capability | Module | Layout | Status |
|---|---|---|---|---|---|
| `/login` | LoginPage | — | — | None | Active |
| `/super-admin` | SuperAdminDashboardPage | `superadmin:view` | — | SuperAdminLayout | Active |
| `/super-admin/tenants` | TenantListPage | `superadmin:view` | — | SuperAdminLayout | Active |
| `/super-admin/tenants/new` | CreateTenantPage | `superadmin:view` | — | SuperAdminLayout | Active |
| `/super-admin/tenants/:tenantId` | TenantDetailPage | `superadmin:view` | — | SuperAdminLayout | Active |
| `/` | DashboardPage | `dashboard:view` | dashboard | DashboardLayout | Active |
| `/sales` | SalesPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/pos` | PosCheckoutPage | `sales:view` | pos | DashboardLayout | Active |
| `/sales/documents/new` | CreateSalesDocumentHubPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/new` | CreateSalesInvoicePage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/proforma/new` | CreateQuotationPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/challans` | DeliveryChallansPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/challans/new` | CreateDeliveryChallanPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/challans/:challanId` | DeliveryChallanDetailPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/challans/group-invoice` | GroupedInvoicePage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/returns/new` | CreateSalesReturnPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/dispatches/new` | CreateSalesDispatchPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/orders` | SalesOrdersPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/orders/new` | CreateSalesOrderPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/orders/:orderId` | SalesOrderDetailPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/opportunities` | OpportunitiesPage | `sales:view` + opportunity | opportunity | DashboardLayout | Active |
| `/sales/opportunities/:opportunityId` | OpportunityDetailPage | `sales:view` + opportunity | opportunity | DashboardLayout | Active |
| `/sales/quotations` | QuotationsPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/quotations/new` | CreateQuotationPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/quotations/make` | MakeQuotationPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/quotations/:quotationId/edit` | MakeQuotationPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/quotations/:quotationId` | QuotationDetailPage | `sales:view` | sales | DashboardLayout | Active |
| `/sales/:invoiceId` | SalesInvoiceDetailPage | `sales:view` | sales | DashboardLayout | Active |
| `/purchases` | PurchasesPage | `purchases:view` | purchases | DashboardLayout | Active |
| `/purchases/documents/new` | CreatePurchaseDocumentHubPage | `purchases:view` | purchases | DashboardLayout | Active |
| `/purchases/new` | CreatePurchaseInvoicePage | `purchases:view` | purchases | DashboardLayout | Active |
| `/purchases/returns/new` | CreatePurchaseReturnPage | `purchases:view` | purchases | DashboardLayout | Active |
| `/purchases/receipts/new` | CreatePurchaseReceiptPage | `purchases:view` | purchases | DashboardLayout | Active |
| `/purchases/orders` | PurchaseOrdersPage | `purchases:view` | purchases | DashboardLayout | Active |
| `/purchases/orders/new` | CreatePurchaseOrderPage | `purchases:view` | purchases | DashboardLayout | Active |
| `/purchases/orders/:orderId` | PurchaseOrderDetailPage | `purchases:view` | purchases | DashboardLayout | Active |
| `/purchases/requisitions` | PurchaseRequisitionsPage | `purchases:view` | purchases | DashboardLayout | Active |
| `/purchases/requisitions/new` | CreatePurchaseRequisitionPage | `purchases:view` | purchases | DashboardLayout | Active |
| `/purchases/requisitions/:reqId` | PurchaseRequisitionDetailPage | `purchases:view` | purchases | DashboardLayout | Active |
| `/purchases/rfqs` | SupplierQuotationsPage | `purchases:view` | purchases | DashboardLayout | Active |
| `/purchases/rfqs/new` | CreateSupplierQuotationPage | `purchases:view` | purchases | DashboardLayout | Active |
| `/purchases/rfqs/:quotationId` | SupplierQuotationDetailPage | `purchases:view` | purchases | DashboardLayout | Active |
| `/purchases/:invoiceId` | PurchaseInvoiceDetailPage | `purchases:view` | purchases | DashboardLayout | Active |
| `/inventory` | InventoryPage | `inventory:view` | inventory | DashboardLayout | Active |
| `/inventory/items/new` | CreateItemPage | `inventory:view` | inventory | DashboardLayout | Active |
| `/inventory/items/:itemId` | InventoryItemDetailPage | `inventory:view` | inventory | DashboardLayout | Active |
| `/inventory/bundles` | ItemBundlesPage | `inventory:view` | inventory | DashboardLayout | Active |
| `/inventory/warehouse` | WarehouseStockPage | `inventory:view` | inventory | DashboardLayout | Active |
| `/inventory/movements` | StockMovementPage | `inventory:view` | inventory | DashboardLayout | Active |
| `/inventory/dispatches/new` | CreateSalesDispatchPage | `inventory:view` | inventory | DashboardLayout | Active |
| `/inventory/catalog` | ComponentCatalogPage | `inventory:view` + components | components | DashboardLayout | Active |
| `/inventory/opening-stock` | OpeningStockPage | `inventory:view` + components | components | DashboardLayout | Active |
| `/inventory/stock-valuation` | StockValuationPage | `inventory:view` + components | components | DashboardLayout | Active |
| `/inventory/stock-take` | StockTakePage | `inventory:view` + components | components | DashboardLayout | Active |
| `/components/catalog` | → `/inventory/catalog` | — | — | Redirect | Active |
| `/components/opening-stock` | → `/inventory/opening-stock` | — | — | Redirect | Active |
| `/components/stock-valuation` | → `/inventory/stock-valuation` | — | — | Redirect | Active |
| `/components/stock-take` | → `/inventory/stock-take` | — | — | Redirect | Active |
| `/components` | → `/inventory/catalog` | — | — | Redirect | Active |
| `/customers` | CustomersPage | `customers:view` | customers | DashboardLayout | Active |
| `/customers/new` | CreateCustomerPage | `customers:view` | customers | DashboardLayout | Active |
| `/customers/:customerId` | CustomerDetailPage | `customers:view` | customers | DashboardLayout | Active |
| `/customers/:customerId/statement` | CustomerStatementPage | `customers:view` | customers | DashboardLayout | Active |
| `/customers/:customerId/edit` | EditCustomerPage | `customers:view` | customers | DashboardLayout | Active |
| `/suppliers` | SuppliersPage | `suppliers:view` | suppliers | DashboardLayout | Active |
| `/suppliers/new` | CreateSupplierPage | `suppliers:view` | suppliers | DashboardLayout | Active |
| `/suppliers/:supplierId` | SupplierDetailPage | `suppliers:view` | suppliers | DashboardLayout | Active |
| `/suppliers/:supplierId/edit` | EditSupplierPage | `suppliers:view` | suppliers | DashboardLayout | Active |
| `/finance` | FinancePage | `finance:view` | finance | DashboardLayout | Active |
| `/finance/journals` | JournalEntriesPage | `finance:view` | finance | DashboardLayout | Active |
| `/finance/journals/new` | CreateJournalEntryPage | `finance:view` | finance | DashboardLayout | Active |
| `/finance/journals/:journalId` | JournalEntryDetailPage | `finance:view` | finance | DashboardLayout | Active |
| `/finance/payments` | PaymentEntriesPage | `finance:view` | finance | DashboardLayout | Active |
| `/finance/payments/new` | CreatePaymentEntryPage | `finance:view` | finance | DashboardLayout | Active |
| `/finance/payments/:paymentId` | PaymentEntryDetailPage | `finance:view` | finance | DashboardLayout | Active |
| `/finance/day-book` | DayBookPage | `finance:view` + components | components | DashboardLayout | Active |
| `/finance/receivables` | ReceivablesPage | `finance:view` + components | components | DashboardLayout | Active |
| `/finance/payables` | PayablesPage | `finance:view` + components | components | DashboardLayout | Active |
| `/finance/day-close` | DayClosePage | `finance:view` + components | components | DashboardLayout | Active |
| `/operations` | OperationsPage | `operations:view` | operations | DashboardLayout | Active |
| `/reports` | ReportsPage | `reports:view` | reports | DashboardLayout | Active |
| `/settings` | SettingsPage | `settings:view` | settings | DashboardLayout | Active |
| `/settings/audit` | AuditLogPage | `settings:view` | settings | DashboardLayout | Active |
| `/settings/tenant-audit` | TenantBusinessAuditPage | `settings:view` | settings | DashboardLayout | Active |
| `/settings/gst` | GstSettingsPage | `settings:view` | settings | DashboardLayout | Active |
| `/settings/admin/users` | UserManagementPage | `settings:view` | settings | DashboardLayout | Active |
| `/settings/admin/roles` | RoleManagementPage | `settings:view` | settings | DashboardLayout | Active |
| `/settings/admin/company` | CompanySettingsAdminPage | `settings:view` | settings | DashboardLayout | Active |
| `/settings/admin/fiscal-year` | FiscalYearPage | `settings:view` | settings | DashboardLayout | Active |
| `/settings/admin/warehouses` | WarehouseManagementPage | `settings:view` | settings | DashboardLayout | Active |
| `/settings/admin/accounting` | AccountingSettingsPage | `settings:view` | settings | DashboardLayout | Active |
| `/print` | DocumentPrintPage | ProtectedRoute (no GatedRoute) | — | DashboardLayout | Active |
| `*` | NotFoundPage | — | — | None | Active |

**Notes**

- Tenant routes use `ProtectedRoute` → `TenantStatusGate` → `DashboardLayout` unless noted.
- Super-admin routes use `SuperAdminRoute` → `SuperAdminLayout`.
- Opportunity routes also require `requiresOpportunity` / `navFeature="opportunities"`.
- Components module routes require `requiresComponents`.

# Module Coverage Matrix

## Title
Traders — Module Implementation Completeness

## Purpose
Snapshot of each business module's implementation status across all architectural layers.

## Generated From
Combined analysis of all scanner outputs.

## Last Audit Basis
Full architecture audit — 2026-03-16

---

## Current interpretation note

This matrix has been reconciled against the currently shipped repo state, not just the original architecture scanner baseline. Several modules have progressed materially beyond read-only coverage via new list/detail/create/submit flows, contextual finance actions, queue drill-ins, and traceability surfaces.

## Coverage Matrix

| Module | Nav | Route | Screen | Actions | Frontend API | Backend API | DB Access | Workflow | Overall |
|---|---|---|---|---|---|---|---|---|---|
| **Dashboard** | ✅ | ✅ | ✅ | ✅ View + drill-in | ✅ Expanded | ✅ Expanded | ✅ | ✅ Operational read | 🟢 98% |
| **Sales** | ✅ | ✅ | ✅ | ✅ List/detail/create/submit + dispatch/return launch on core flows | ✅ Domain APIs | ✅ Sales workflow APIs | ✅ | ✅ Strong core workflow | 🟢 94% |
| **Purchases** | ✅ | ✅ | ✅ | ✅ Requisition/RFQ/order/receipt/invoice core actions | ✅ Domain APIs | ✅ Purchase workflow APIs | ✅ | ✅ Strong core workflow | 🟢 93% |
| **Inventory** | ✅ | ✅ | ✅ | ✅ View/search/detail + receipt/dispatch draft creation | ✅ Expanded | ✅ Expanded | ✅ | ✅ Operational read/write | 🟢 95% |
| **Customers** | ✅ | ✅ | ✅ | ✅ List/detail/create + finance actions | ✅ Domain APIs | ✅ Customer APIs | ✅ | ✅ Practical CRM core | 🟢 82% |
| **Suppliers** | ✅ | ✅ | ✅ | ✅ List/detail/create + finance actions | ✅ Domain APIs | ✅ Supplier APIs | ✅ | ✅ Practical procurement CRM core | 🟢 82% |
| **Finance** | ✅ | ✅ | ✅ | ✅ Journals/payments/outstanding flows | ✅ Expanded | ✅ Expanded | ✅ | ✅ Working operations core | 🟢 86% |
| **Reports** | ✅ | ✅ | ✅ | ✅ View + operational drill-ins | ✅ Expanded | ✅ Expanded | ✅ | ✅ Strong reporting surface | 🟢 93% |
| **Settings** | ✅ | ✅ | ✅ | ✅ Load/validate/reset/save flows | ✅ `settingsApi` + role lookup | ✅ Settings endpoints | ✅ System Settings + user cache | ✅ Practical admin core | Medium (78%) |

| Module | Representative file evidence |
|---|---|
| Dashboard | `frontend/trader-ui/src/pages/DashboardPage.tsx`, `frontend/trader-ui/src/components/KPICard.tsx`, `apps/trader_app/trader_app/api/dashboard.py` |
| Sales | `frontend/trader-ui/src/pages/QuotationsPage.tsx`, `QuotationDetailPage.tsx`, `SalesOrdersPage.tsx`, `SalesOrderDetailPage.tsx`, `CreateSalesOrderPage.tsx`, `CreateSalesInvoicePage.tsx`, `CreateSalesReturnPage.tsx`, `CreateSalesDispatchPage.tsx`, `SalesInvoiceDetailPage.tsx`, `apps/trader_app/trader_app/api/sales.py` |
| Purchases | `frontend/trader-ui/src/pages/PurchaseRequisitionsPage.tsx`, `CreatePurchaseRequisitionPage.tsx`, `SupplierQuotationsPage.tsx`, `CreateSupplierQuotationPage.tsx`, `PurchaseOrdersPage.tsx`, `PurchaseOrderDetailPage.tsx`, `CreatePurchaseOrderPage.tsx`, `CreatePurchaseInvoicePage.tsx`, `CreatePurchaseReceiptPage.tsx`, `PurchaseInvoiceDetailPage.tsx`, `apps/trader_app/trader_app/api/purchases.py` |
| Inventory | `frontend/trader-ui/src/pages/InventoryItemDetailPage.tsx`, `WarehouseStockPage.tsx`, `StockMovementPage.tsx`, `CreatePurchaseReceiptPage.tsx`, `CreateSalesDispatchPage.tsx`, `apps/trader_app/trader_app/api/inventory.py` |
| Customers | `frontend/trader-ui/src/pages/CreateCustomerPage.tsx`, `CustomerDetailPage.tsx`, `CustomerOutstandingPage.tsx`, `CustomerAgingPage.tsx`, `apps/trader_app/trader_app/api/customers.py` |
| Suppliers | `frontend/trader-ui/src/pages/CreateSupplierPage.tsx`, `SupplierDetailPage.tsx`, `apps/trader_app/trader_app/api/suppliers.py` |
| Finance | `frontend/trader-ui/src/pages/JournalEntriesPage.tsx`, `JournalEntryDetailPage.tsx`, `CreateJournalEntryPage.tsx`, `PaymentEntriesPage.tsx`, `PaymentEntryDetailPage.tsx`, `CreatePaymentEntryPage.tsx`, `apps/trader_app/trader_app/api/finance.py` |
| Reports | `frontend/trader-ui/src/pages/ReportsPage.tsx`, `CustomerOutstandingPage.tsx`, `CustomerAgingPage.tsx`, `apps/trader_app/trader_app/api/reports.py` |
| Settings | `frontend/trader-ui/src/pages/SettingsPage.tsx`, `apps/trader_app/trader_app/api/settings.py` |

## Legend

| Symbol | Meaning |
|---|---|
| 🟢 | 80%+ complete — functional for primary use cases |
| 🟡 | 50-79% — core viewing works, write operations missing |
| 🔴 | <50% — significant functionality gaps |

## Module Risk Assessment

| Module | Risk Level | Primary Gap |
|---|---|---|
| Settings | Medium | Deeper tenant/admin controls remain lighter than the core settings save flow |
| Sales | 🟡 Medium | Fulfillment exception handling, return resolution depth, and pricing depth are still incomplete |
| Purchases | 🟡 Medium | Quote comparison/award and richer receipt exception handling are still incomplete |
| Customers | 🟢 Low | Lead/opportunity and assignment depth remains outside shipped CRM scope |
| Suppliers | 🟢 Low | Advanced sourcing and vendor comparison workflows remain absent |
| Inventory | 🟢 Low | Rich item editing and warehouse operations depth can still expand |
| Dashboard | 🟢 Low | Core dashboard is strong; remaining work is mostly controller-surface depth |
| Finance | 🟡 Medium | Reconciliation, close, and accounting setup screens remain incomplete |
| Reports | 🟢 Low | Report export/admin polish is still lighter than the core reporting surface |

## Summary

- The previous audit substantially understated current module maturity.
- The strongest shipped areas are now `Dashboard`, `Sales`, `Purchases`, `Inventory`, `Finance`, and `Reports`.
- `Settings` has moved from broken to functionally implemented for core admin use cases.
- Role-aware visibility, navbar search, notifications, purchase requisition/RFQ drafting, purchase receipt drafting, sales dispatch drafting, and sales return drafting have all moved the app beyond the earlier shell/workflow baseline.
- Remaining work is concentrated in specialist ERP workflows and runtime validation rather than missing core UI scaffolding.

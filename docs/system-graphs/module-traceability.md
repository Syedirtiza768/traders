# Module Traceability

## Title
Traders — Per-Module Traceability Chains

## Purpose
Documents the complete traceability chain for each business module from navigation to database.

## Generated From
Full audit data combining routes, APIs, endpoints, services, and entities.

## Last Audit Basis
All scanner outputs from the current audit run.

---

## Sales Module

```mermaid
flowchart TD
    NAV_S[Sidebar: Sales] --> ROUTE_S[/sales]
    ROUTE_S --> PAGE_S[SalesPage.tsx]
    PAGE_S --> API_S1[resourceApi.list<br/>doctype: Sales Invoice]
    API_S1 --> FRAPPE_R[Frappe Resource API<br/>GET /api/resource/Sales Invoice]
    FRAPPE_R --> DB_SI[(Sales Invoice)]

    DASH[DashboardPage] --> API_D1[dashboardApi.getKPIs]
    DASH --> API_D2[dashboardApi.getSalesTrend]
    DASH --> API_D3[dashboardApi.getTopCustomers]
    DASH --> API_D4[dashboardApi.getRecentOrders]
    DASH --> API_D5[dashboardApi.getSalesByItemGroup]
    API_D1 --> EP_D1[get_dashboard_kpis]
    API_D2 --> EP_D2[get_sales_trend]
    API_D3 --> EP_D3[get_top_customers]
    API_D4 --> EP_D4[get_recent_orders]
    API_D5 --> EP_D5[get_sales_by_item_group]
    EP_D1 --> DB_SI
    EP_D1 --> DB_SO[(Sales Order)]
    EP_D2 --> DB_SI
    EP_D3 --> DB_SI
    EP_D4 --> DB_SO
    EP_D5 --> DB_SII[(Sales Invoice Item)]
```

## Purchases Module

```mermaid
flowchart TD
    NAV_P[Sidebar: Purchases] --> ROUTE_P[/purchases]
    ROUTE_P --> PAGE_P[PurchasesPage.tsx]
    PAGE_P --> API_P1[resourceApi.list<br/>doctype: Purchase Invoice]
    API_P1 --> FRAPPE_R[Frappe Resource API<br/>GET /api/resource/Purchase Invoice]
    FRAPPE_R --> DB_PI[(Purchase Invoice)]

    DASH[DashboardPage] --> API_KPI[dashboardApi.getKPIs]
    API_KPI --> EP_KPI[get_dashboard_kpis]
    EP_KPI --> DB_PI
```

## Inventory Module

```mermaid
flowchart TD
    NAV_I[Sidebar: Inventory] --> ROUTE_I[/inventory]
    ROUTE_I --> PAGE_I[InventoryPage.tsx]
    PAGE_I --> API_I1[inventoryApi.getStockSummary]
    PAGE_I --> API_I2[inventoryApi.getLowStockItems]
    API_I1 --> EP_I1[get_stock_summary]
    API_I2 --> EP_I2[get_low_stock_items]
    EP_I1 --> DB_BIN[(Bin)]
    EP_I1 --> DB_ITEM[(Item)]
    EP_I1 --> DB_WH[(Warehouse)]
    EP_I2 --> DB_BIN
    EP_I2 --> DB_ITEM
    EP_I2 --> DB_IR[(Item Reorder)]

    ORPHAN1[get_warehouse_stock] -.->|⚠️ No UI| DB_BIN
    ORPHAN2[get_stock_movement] -.->|⚠️ No UI| DB_SLE[(Stock Ledger Entry)]

    style ORPHAN1 fill:#fef3c7,stroke:#d97706
    style ORPHAN2 fill:#fef3c7,stroke:#d97706
```

## Finance Module

```mermaid
flowchart TD
    NAV_F[Sidebar: Finance] --> ROUTE_F[/finance]
    ROUTE_F --> PAGE_F[FinancePage.tsx]
    PAGE_F --> API_F1[reportsApi.getProfitAndLoss]
    PAGE_F --> API_F2[dashboardApi.getCashFlowSummary]
    PAGE_F --> API_F3[reportsApi.getReceivableAgingSummary]
    PAGE_F --> API_F4[reportsApi.getAccountsPayable]
    API_F1 --> EP_F1[get_profit_and_loss]
    API_F2 --> EP_F2[get_cash_flow_summary]
    API_F3 --> EP_F3[get_receivable_aging_summary]
    API_F4 --> EP_F4[get_accounts_payable]
    EP_F1 --> DB_GL[(GL Entry)]
    EP_F1 --> DB_ACC[(Account)]
    EP_F2 --> DB_PE[(Payment Entry)]
    EP_F3 --> DB_SI[(Sales Invoice)]
    EP_F4 --> DB_PI[(Purchase Invoice)]
```

## Reports Module

```mermaid
flowchart TD
    NAV_R[Sidebar: Reports] --> ROUTE_R[/reports]
    ROUTE_R --> PAGE_R[ReportsPage.tsx]
    PAGE_R --> API_R1[reportsApi.getAccountsReceivable]
    PAGE_R --> API_R2[reportsApi.getAccountsPayable]
    PAGE_R --> API_R3[reportsApi.getMonthlySalesReport]
    PAGE_R --> API_R4[reportsApi.getSupplierBalances]
    API_R1 --> EP_R1[get_accounts_receivable]
    API_R2 --> EP_R2[get_accounts_payable]
    API_R3 --> EP_R3[get_monthly_sales_report]
    API_R4 --> EP_R4[get_supplier_balances]
    EP_R1 --> DB_SI[(Sales Invoice)]
    EP_R2 --> DB_PI[(Purchase Invoice)]
    EP_R3 --> DB_SI
    EP_R4 --> DB_PI
```

## CRM Module (Customers & Suppliers)

```mermaid
flowchart TD
    NAV_C[Sidebar: Customers] --> ROUTE_C[/customers]
    ROUTE_C --> PAGE_C[CustomersPage.tsx]
    PAGE_C --> API_C[resourceApi.list<br/>doctype: Customer]
    API_C --> FRAPPE[Frappe Resource API]
    FRAPPE --> DB_CUST[(Customer)]

    NAV_SU[Sidebar: Suppliers] --> ROUTE_SU[/suppliers]
    ROUTE_SU --> PAGE_SU[SuppliersPage.tsx]
    PAGE_SU --> API_SU[resourceApi.list<br/>doctype: Supplier]
    API_SU --> FRAPPE
    FRAPPE --> DB_SUP[(Supplier)]
```

## Settings Module

```mermaid
flowchart TD
    NAV_SET[Sidebar: Settings] --> ROUTE_SET[/settings]
    ROUTE_SET --> PAGE_SET[SettingsPage.tsx]
    PAGE_SET --> UI[UI-only forms]
    UI -.->|⚠️ No backend| NONE[No API calls]

    style NONE fill:#fee2e2,stroke:#dc2626
```

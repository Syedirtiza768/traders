/**
 * Generator: Mermaid Diagrams
 *
 * Generates Mermaid-based system graphs from audit data.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

export function generateMermaid(root, data) {
  generateERPSystemGraph(root, data);
  generateNavigationGraph(root, data);
  generateModuleTraceability(root, data);
  generateWorkflowGraphs(root, data);
}

function generateERPSystemGraph(root, data) {
  const content = `# ERP System Graph

## Title
Traders — Top-Level System Architecture Graph

## Purpose
Visual representation of the complete system architecture showing the flow from user navigation through to database entities.

## Generated From
Full architecture audit scan of all frontend and backend source files.

## Last Audit Basis
All routes, navigation, API calls, backend endpoints, services, and entities.

---

## Overall Architecture Flow

\`\`\`mermaid
flowchart TD
    NAV[🧭 Navigation<br/>Sidebar: 9 items] --> ROUTE[🔀 Routes<br/>App.tsx: 11 routes]
    ROUTE --> SCR[📄 Screens<br/>10 page components]
    SCR --> ACT[⚡ User Actions<br/>View, Filter, Search, Create]
    ACT --> FAPI[📡 Frontend API<br/>5 namespaces, 22+ methods]
    FAPI --> API[🔌 Backend Endpoints<br/>16 whitelisted methods]
    FAPI --> RAPI[🔌 Frappe Resource API<br/>CRUD for 4 DocTypes]
    API --> SVC[⚙️ Services<br/>Inline business logic]
    RAPI --> FRM[⚙️ Frappe ORM<br/>Built-in CRUD]
    SVC --> DB[(🗄️ MariaDB<br/>15+ DocTypes)]
    FRM --> DB
    SVC --> WF[🔄 Workflows<br/>Document lifecycle]
    WF --> DB

    style NAV fill:#e0f2fe,stroke:#0284c7
    style ROUTE fill:#e0f2fe,stroke:#0284c7
    style SCR fill:#dbeafe,stroke:#2563eb
    style ACT fill:#ede9fe,stroke:#7c3aed
    style FAPI fill:#fef3c7,stroke:#d97706
    style API fill:#fee2e2,stroke:#dc2626
    style RAPI fill:#fee2e2,stroke:#dc2626
    style SVC fill:#fce7f3,stroke:#be185d
    style FRM fill:#fce7f3,stroke:#be185d
    style DB fill:#d1fae5,stroke:#059669
    style WF fill:#f3e8ff,stroke:#9333ea
\`\`\`

## Layer Detail

### Navigation Layer
\`\`\`mermaid
flowchart LR
    subgraph MainMenu[Main Menu]
        D[Dashboard /]
        S[Sales /sales]
        P[Purchases /purchases]
        I[Inventory /inventory]
        C[Customers /customers]
        SU[Suppliers /suppliers]
        F[Finance /finance]
        R[Reports /reports]
    end
    subgraph System[System]
        SET[Settings /settings]
    end
    subgraph Auth[Public]
        L[Login /login]
    end
\`\`\`

### API Communication Layer
\`\`\`mermaid
flowchart LR
    subgraph Frontend[Frontend API Namespaces]
        authApi
        dashboardApi
        resourceApi
        inventoryApi
        reportsApi
    end
    subgraph Backend[Backend Modules]
        auth[frappe.auth]
        dash[api/dashboard.py]
        res[Frappe Resource API]
        inv[api/inventory.py]
        rep[api/reports.py]
    end
    authApi --> auth
    dashboardApi --> dash
    resourceApi --> res
    inventoryApi --> inv
    reportsApi --> rep
\`\`\`
`;

  writeFileSync(join(root, 'docs', 'system-graphs', 'erp-system-graph.md'), content);
  console.log('  ✓ Generated erp-system-graph.md');
}

function generateNavigationGraph(root, data) {
  const content = `# Navigation Graph

## Title
Traders — Primary Navigation Structure and Route Reachability

## Purpose
Visualizes the sidebar navigation structure, route mapping, and screen reachability.

## Generated From
- \`frontend/trader-ui/src/components/Sidebar.tsx\`
- \`frontend/trader-ui/src/App.tsx\`

## Last Audit Basis
All navigation items and route definitions.

---

## Navigation → Route → Screen Map

\`\`\`mermaid
flowchart LR
    subgraph Sidebar[Sidebar Navigation]
        N1[📊 Dashboard]
        N2[📈 Sales]
        N3[📉 Purchases]
        N4[🏭 Inventory]
        N5[👥 Customers]
        N6[🚚 Suppliers]
        N7[💰 Finance]
        N8[📋 Reports]
        N9[⚙️ Settings]
    end

    subgraph Routes[React Routes]
        R1["/ (index)"]
        R2[/sales]
        R3[/purchases]
        R4[/inventory]
        R5[/customers]
        R6[/suppliers]
        R7[/finance]
        R8[/reports]
        R9[/settings]
        R10[/login]
        R11["/* (catch-all)"]
    end

    subgraph Screens[Page Components]
        S1[DashboardPage]
        S2[SalesPage]
        S3[PurchasesPage]
        S4[InventoryPage]
        S5[CustomersPage]
        S6[SuppliersPage]
        S7[FinancePage]
        S8[ReportsPage]
        S9[SettingsPage]
        S10[LoginPage]
    end

    N1 --> R1 --> S1
    N2 --> R2 --> S2
    N3 --> R3 --> S3
    N4 --> R4 --> S4
    N5 --> R5 --> S5
    N6 --> R6 --> S6
    N7 --> R7 --> S7
    N8 --> R8 --> S8
    N9 --> R9 --> S9
    R10 --> S10
    R11 -.->|redirect| R1

    style R10 fill:#fef3c7,stroke:#d97706
    style R11 fill:#fee2e2,stroke:#dc2626
    style S10 fill:#fef3c7,stroke:#d97706
\`\`\`

## Guard Map

\`\`\`mermaid
flowchart TD
    USER[User] --> CHECK{Authenticated?}
    CHECK -->|Yes| LAYOUT[DashboardLayout]
    CHECK -->|No| LOGIN[/login → LoginPage]
    LOGIN -->|Login Success| LAYOUT
    LAYOUT --> SIDEBAR[Sidebar + Navbar]
    SIDEBAR --> PAGES[All Protected Pages]
\`\`\`

## Reachability Summary

| Nav Item | Route | Screen | Reachable | Guard |
|---|---|---|---|---|
| Dashboard | \`/\` | DashboardPage | ✅ | ProtectedRoute |
| Sales | \`/sales\` | SalesPage | ✅ | ProtectedRoute |
| Purchases | \`/purchases\` | PurchasesPage | ✅ | ProtectedRoute |
| Inventory | \`/inventory\` | InventoryPage | ✅ | ProtectedRoute |
| Customers | \`/customers\` | CustomersPage | ✅ | ProtectedRoute |
| Suppliers | \`/suppliers\` | SuppliersPage | ✅ | ProtectedRoute |
| Finance | \`/finance\` | FinancePage | ✅ | ProtectedRoute |
| Reports | \`/reports\` | ReportsPage | ✅ | ProtectedRoute |
| Settings | \`/settings\` | SettingsPage | ✅ | ProtectedRoute |
| — (no nav) | \`/login\` | LoginPage | ✅ | None (public) |
| — (no nav) | \`/*\` | Redirect → \`/\` | ✅ | None |
`;

  writeFileSync(join(root, 'docs', 'system-graphs', 'navigation-graph.md'), content);
  console.log('  ✓ Generated navigation-graph.md');
}

function generateModuleTraceability(root, data) {
  const content = `# Module Traceability

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

\`\`\`mermaid
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
\`\`\`

## Purchases Module

\`\`\`mermaid
flowchart TD
    NAV_P[Sidebar: Purchases] --> ROUTE_P[/purchases]
    ROUTE_P --> PAGE_P[PurchasesPage.tsx]
    PAGE_P --> API_P1[resourceApi.list<br/>doctype: Purchase Invoice]
    API_P1 --> FRAPPE_R[Frappe Resource API<br/>GET /api/resource/Purchase Invoice]
    FRAPPE_R --> DB_PI[(Purchase Invoice)]

    DASH[DashboardPage] --> API_KPI[dashboardApi.getKPIs]
    API_KPI --> EP_KPI[get_dashboard_kpis]
    EP_KPI --> DB_PI
\`\`\`

## Inventory Module

\`\`\`mermaid
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
\`\`\`

## Finance Module

\`\`\`mermaid
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
\`\`\`

## Reports Module

\`\`\`mermaid
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
\`\`\`

## CRM Module (Customers & Suppliers)

\`\`\`mermaid
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
\`\`\`

## Settings Module

\`\`\`mermaid
flowchart TD
    NAV_SET[Sidebar: Settings] --> ROUTE_SET[/settings]
    ROUTE_SET --> PAGE_SET[SettingsPage.tsx]
    PAGE_SET --> UI[UI-only forms]
    UI -.->|⚠️ No backend| NONE[No API calls]

    style NONE fill:#fee2e2,stroke:#dc2626
\`\`\`
`;

  writeFileSync(join(root, 'docs', 'system-graphs', 'module-traceability.md'), content);
  console.log('  ✓ Generated module-traceability.md');
}

function generateWorkflowGraphs(root, data) {
  const content = `# Workflow Graphs

## Title
Traders — Business Workflow Diagrams

## Purpose
Visualizes end-to-end business workflows showing document lifecycle, data flow, and system interactions.

## Generated From
Workflow scanner analysis of backend queries, frontend status handling, and demo generator patterns.

## Last Audit Basis
All API endpoints, page components, and hooks configuration.

---

## Sales End-to-End Flow

\`\`\`mermaid
flowchart TD
    SO[Sales Order<br/>Draft] -->|Submit| SO_S[Sales Order<br/>Submitted]
    SO_S -->|Delivery| DN[Delivery Note<br/>Submitted]
    DN -->|Stock Impact| BIN1[Bin<br/>qty reduced]
    SO_S -->|Invoice| SI[Sales Invoice<br/>Draft]
    SI -->|Submit| SI_S[Sales Invoice<br/>Submitted]
    SI_S -->|Payment| PE[Payment Entry<br/>Receive]
    PE -->|Reconcile| SI_P[Sales Invoice<br/>Paid]
    SI_S -->|No Payment| SI_O[Sales Invoice<br/>Unpaid/Overdue]

    style SO fill:#e0f2fe
    style SO_S fill:#dbeafe
    style DN fill:#d1fae5
    style SI fill:#e0f2fe
    style SI_S fill:#dbeafe
    style PE fill:#d1fae5
    style SI_P fill:#bbf7d0
    style SI_O fill:#fecaca
    style BIN1 fill:#ede9fe
\`\`\`

### Sales Workflow — UI Coverage

| Step | Frontend Screen | Backend Endpoint | Status |
|---|---|---|---|
| Create Sales Order | ❌ Not available | resourceApi (Frappe) | ⚠️ Missing |
| View Sales Orders | DashboardPage (recent) | get_recent_orders | ✅ Read-only |
| Create Sales Invoice | ❌ Button exists, no handler | resourceApi (Frappe) | ⚠️ Missing |
| View Sales Invoices | SalesPage | resourceApi.list | ✅ |
| Submit Invoice | ❌ Not available | Frappe workflow | ⚠️ Missing |
| Record Payment | ❌ Not available | Payment Entry | ⚠️ Missing |
| View Receivables | ReportsPage, FinancePage | get_accounts_receivable | ✅ |

## Purchase End-to-End Flow

\`\`\`mermaid
flowchart TD
    PI[Purchase Invoice<br/>Draft] -->|Submit| PI_S[Purchase Invoice<br/>Submitted]
    PI_S -->|Receipt| PR[Purchase Receipt<br/>Submitted]
    PR -->|Stock Impact| BIN2[Bin<br/>qty increased]
    PI_S -->|Payment| PE2[Payment Entry<br/>Pay]
    PE2 -->|Reconcile| PI_P[Purchase Invoice<br/>Paid]
    PI_S -->|No Payment| PI_O[Purchase Invoice<br/>Unpaid/Overdue]

    style PI fill:#fef3c7
    style PI_S fill:#fde68a
    style PR fill:#d1fae5
    style PE2 fill:#d1fae5
    style PI_P fill:#bbf7d0
    style PI_O fill:#fecaca
    style BIN2 fill:#ede9fe
\`\`\`

## Inventory Movement Flow

\`\`\`mermaid
flowchart LR
    SE[Stock Entry<br/>Material Receipt] -->|Creates| SLE1[Stock Ledger Entry]
    PR2[Purchase Receipt] -->|Creates| SLE2[Stock Ledger Entry]
    DN2[Delivery Note] -->|Creates| SLE3[Stock Ledger Entry]

    SLE1 --> BIN3[Bin Updated]
    SLE2 --> BIN3
    SLE3 --> BIN3

    BIN3 --> INV_VIEW[Inventory Page<br/>Stock Summary]
    BIN3 --> LOW[Low Stock<br/>Alert Display]
    BIN3 --> DASH_KPI[Dashboard<br/>Stock Value KPI]
\`\`\`

## Payment Reconciliation Flow

\`\`\`mermaid
flowchart TD
    SI2[Sales Invoice<br/>Unpaid] --> PE3[Payment Entry<br/>Receive]
    PI2[Purchase Invoice<br/>Unpaid] --> PE4[Payment Entry<br/>Pay]

    PE3 --> GL1[GL Entry<br/>Debit: Bank<br/>Credit: Receivable]
    PE4 --> GL2[GL Entry<br/>Debit: Payable<br/>Credit: Bank]

    GL1 --> PNL[Profit & Loss]
    GL2 --> PNL
    PE3 --> CF[Cash Flow<br/>Inflow]
    PE4 --> CF2[Cash Flow<br/>Outflow]
    CF --> FINANCE[Finance Page]
    CF2 --> FINANCE
    PNL --> FINANCE
\`\`\`

## Authentication Flow

\`\`\`mermaid
sequenceDiagram
    actor User
    participant SPA as React SPA
    participant Store as authStore
    participant API as Frappe API
    participant DB as Session Store

    User->>SPA: Navigate to app
    SPA->>Store: Check isAuthenticated
    Store-->>SPA: false
    SPA->>User: Redirect to /login
    User->>SPA: Enter credentials
    SPA->>API: POST /api/method/login
    API->>DB: Create session
    API-->>SPA: 200 + Set-Cookie
    SPA->>API: GET /api/method/frappe.auth.get_logged_user
    API-->>SPA: {message: "user@email.com"}
    SPA->>Store: Set isAuthenticated=true
    Store-->>SPA: Authenticated
    SPA->>User: Redirect to Dashboard
\`\`\`
`;

  writeFileSync(join(root, 'docs', 'system-graphs', 'workflow-graphs.md'), content);
  console.log('  ✓ Generated workflow-graphs.md');
}

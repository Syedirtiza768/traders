# Workflow Graphs

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

```mermaid
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
```

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

```mermaid
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
```

## Inventory Movement Flow

```mermaid
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
```

## Payment Reconciliation Flow

```mermaid
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
```

## Authentication Flow

```mermaid
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
```

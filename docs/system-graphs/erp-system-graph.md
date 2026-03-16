# ERP System Graph

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

```mermaid
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
```

## Layer Detail

### Navigation Layer
```mermaid
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
```

### API Communication Layer
```mermaid
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
```

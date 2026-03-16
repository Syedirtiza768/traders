# Navigation Graph

## Title
Traders — Primary Navigation Structure and Route Reachability

## Purpose
Visualizes the sidebar navigation structure, route mapping, and screen reachability.

## Generated From
- `frontend/trader-ui/src/components/Sidebar.tsx`
- `frontend/trader-ui/src/App.tsx`

## Last Audit Basis
All navigation items and route definitions.

---

## Navigation → Route → Screen Map

```mermaid
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
```

## Guard Map

```mermaid
flowchart TD
    USER[User] --> CHECK{Authenticated?}
    CHECK -->|Yes| LAYOUT[DashboardLayout]
    CHECK -->|No| LOGIN[/login → LoginPage]
    LOGIN -->|Login Success| LAYOUT
    LAYOUT --> SIDEBAR[Sidebar + Navbar]
    SIDEBAR --> PAGES[All Protected Pages]
```

## Reachability Summary

| Nav Item | Route | Screen | Reachable | Guard |
|---|---|---|---|---|
| Dashboard | `/` | DashboardPage | ✅ | ProtectedRoute |
| Sales | `/sales` | SalesPage | ✅ | ProtectedRoute |
| Purchases | `/purchases` | PurchasesPage | ✅ | ProtectedRoute |
| Inventory | `/inventory` | InventoryPage | ✅ | ProtectedRoute |
| Customers | `/customers` | CustomersPage | ✅ | ProtectedRoute |
| Suppliers | `/suppliers` | SuppliersPage | ✅ | ProtectedRoute |
| Finance | `/finance` | FinancePage | ✅ | ProtectedRoute |
| Reports | `/reports` | ReportsPage | ✅ | ProtectedRoute |
| Settings | `/settings` | SettingsPage | ✅ | ProtectedRoute |
| — (no nav) | `/login` | LoginPage | ✅ | None (public) |
| — (no nav) | `/*` | Redirect → `/` | ✅ | None |

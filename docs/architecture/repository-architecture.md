# Repository Architecture

## Title
Traders — Repository Architecture Overview

## Purpose
High-level description of the repository structure, major architectural zones, technology stack, and deployment topology.

## Generated From
Full repository scan of `d:\apps\Traders\`

## Last Audit Basis
- All directories under project root
- `frontend/trader-ui/` — React/Vite SPA
- `apps/trader_app/` — Frappe/ERPNext custom app
- `compose/` — Docker orchestration
- `infra/` — Docker build files and Nginx configs
- `scripts/` — Deployment and maintenance scripts

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend Framework** | React | 18.3.x |
| **Frontend Build** | Vite | 5.4.x |
| **Frontend Routing** | React Router DOM | 6.26.x |
| **State Management** | Zustand | 4.5.x |
| **HTTP Client** | Axios | 1.7.x |
| **Charts** | Recharts | 2.12.x |
| **UI Icons** | Lucide React | 0.400.x |
| **CSS Framework** | Tailwind CSS | 3.4.x |
| **Backend Framework** | Frappe | (ERPNext dependency) |
| **ERP Platform** | ERPNext | (required app) |
| **Backend Language** | Python | 3.x |
| **Database** | MariaDB | (via Frappe) |
| **Containerization** | Docker / Docker Compose | - |
| **Reverse Proxy** | Nginx | - |

## Repository Structure

```
Traders/
├── apps/trader_app/             # Frappe custom application
│   └── trader_app/
│       ├── api/                 # Whitelisted API endpoints
│       │   ├── dashboard.py     # Dashboard KPIs and charts
│       │   ├── inventory.py     # Stock summary and movements
│       │   └── reports.py       # Financial reports
│       ├── demo/                # Demo data generation system
│       │   ├── generators/      # Per-entity data generators
│       │   ├── installer/       # Installation orchestrator
│       │   └── seed_engine/     # Seed framework (base, config)
│       ├── setup/               # Post-install hooks
│       └── hooks.py             # Frappe app configuration
├── frontend/trader-ui/          # React SPA
│   └── src/
│       ├── App.tsx              # Route definitions
│       ├── pages/               # 10 page components
│       ├── components/          # Shared components (Navbar, Sidebar, KPICard)
│       ├── layouts/             # DashboardLayout
│       ├── lib/                 # API client, utilities
│       └── stores/              # Zustand auth store
├── compose/                     # Docker Compose configs
├── infra/                       # Dockerfiles, Nginx configs
├── scripts/                     # Deploy, backup, setup scripts
└── docs/                        # Architecture documentation
```

## Architectural Zones

### Zone 1: Frontend SPA (`frontend/trader-ui/`)

Single-page application served as static files through Nginx. Communicates with the backend exclusively through Frappe's REST API.

**Key Architectural Decisions:**
- Client-side routing via React Router v6
- Protected routes via `ProtectedRoute` component checking `authStore.isAuthenticated`
- All API calls go through centralized `lib/api.ts` Axios instance
- CSRF token management via cookie parsing
- No server-side rendering

### Zone 2: Backend API (`apps/trader_app/trader_app/api/`)

Custom Frappe whitelisted methods providing aggregated data for the frontend dashboard. Leverages ERPNext's existing document model for all business entities.

**Key Architectural Decisions:**
- All custom endpoints use `@frappe.whitelist()` decorator
- No custom DocTypes — relies entirely on ERPNext standard DocTypes
- Frontend uses Frappe's generic `/api/resource/` endpoints for CRUD operations
- Custom API only for aggregated/computed views (KPIs, reports, stock summaries)

### Zone 3: Demo Data System (`apps/trader_app/trader_app/demo/`)

Seeded demo data generation system with ordered generators for company setup, users, customers, suppliers, items, inventory, purchases, sales, payments, and financial entries.

### Zone 4: Infrastructure (`compose/`, `infra/`)

Docker-based deployment with separate frontend and backend containers, Nginx reverse proxy, and SSL support.

**Topology:**
```
Internet → Nginx (SSL) → Frontend (static) + Backend (Frappe/Gunicorn)
                                                    ↓
                                              MariaDB + Redis
```

## Communication Flow

```
Browser → Nginx → /api/* → Frappe Backend → MariaDB
       → Nginx → /*     → Static React SPA
```

## Authentication Model

1. Frontend login form sends credentials to `/api/method/login`
2. Frappe sets session cookie
3. Frontend reads CSRF token from cookie
4. All subsequent API requests include CSRF token in header
5. `ProtectedRoute` component checks `authStore.isAuthenticated`
6. Backend `@frappe.whitelist()` requires authenticated session
7. 401/403 responses trigger redirect to `/login`

# Traders — Architecture Blueprint

## 1. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        NGINX REVERSE PROXY                       │
│                     (Port 8080 → external)                       │
├──────────────┬───────────────────────────────────────────────────┤
│              │                                                   │
│  /api/*      │   /*  (all other routes)                          │
│  /assets/*   │                                                   │
│              ▼                                                   ▼
│  ┌───────────────────┐                        ┌─────────────────────┐
│  │  FRAPPE BACKEND    │                        │  TRADER-UI FRONTEND │
│  │  (Gunicorn:8000)   │                        │  (Nginx:3000)       │
│  │                    │                        │  React + Vite       │
│  │  - ERPNext 15      │                        │  - Custom Login     │
│  │  - Trader App      │                        │  - Dashboard        │
│  │  - REST API        │                        │  - Trader Modules   │
│  └────────┬───────────┘                        └─────────────────────┘
│           │
│  ┌────────┴───────────────────────────────────┐
│  │                                             │
│  ▼                      ▼                      ▼
│  ┌──────────┐  ┌──────────────┐  ┌────────────────┐
│  │ MariaDB  │  │ Redis Cache  │  │ Redis Queue    │
│  │ 10.11    │  │              │  │                │
│  └──────────┘  └──────────────┘  └────────┬───────┘
│                                           │
│                              ┌────────────┴────────────┐
│                              │                         │
│                              ▼                         ▼
│                    ┌──────────────┐          ┌──────────────┐
│                    │  Workers     │          │  Scheduler   │
│                    │  (short/long)│          │              │
│                    └──────────────┘          └──────────────┘
└──────────────────────────────────────────────────────────────────┘
```

## 2. Container Architecture

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| backend | Custom (Frappe+ERPNext+TraderApp) | 8000 | API server, Frappe backend |
| frontend | trader-ui (React) | 3000 | Custom SaaS UI |
| db | MariaDB 10.11 | 3306 | Primary database |
| redis-cache | Redis 7 | 6379 | Caching layer |
| redis-queue | Redis 7 | 6380 | Background job queue |
| worker-short | Custom (same as backend) | — | Short-running background jobs |
| worker-long | Custom (same as backend) | — | Long-running background jobs |
| scheduler | Custom (same as backend) | — | Scheduled tasks |
| websocket | Custom (same as backend) | 9000 | Real-time updates |
| proxy | Nginx | 8080 | Reverse proxy / routing |

## 3. Data Flow

### 3.1 API Request Flow
```
Browser → Nginx:8080 → /api/* → Frappe Backend:8000 → MariaDB
                     → /*     → Trader-UI:3000
```

### 3.2 Authentication Flow
```
Trader-UI Login Page → POST /api/method/login → Frappe Auth
                     → Set Cookie (sid)
                     → Redirect to Dashboard
```

### 3.3 Seed Data Flow
```
CLI Command → install_demo() → seed_engine.run()
           → CompanyGenerator → UserGenerator → CustomerGenerator
           → SupplierGenerator → ItemGenerator → InventoryGenerator
           → SalesGenerator → PurchaseGenerator → PaymentGenerator
           → FinancialGenerator → Validator
```

## 4. Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend Framework | React 18 + TypeScript | Industry standard, rich ecosystem |
| Build Tool | Vite | Fast HMR, modern bundling |
| CSS Framework | TailwindCSS | Rapid UI development, utility-first |
| State Management | Zustand | Lightweight, minimal boilerplate |
| HTTP Client | Axios | Interceptors, request/response transforms |
| Charts | Recharts | React-native charting library |
| Tables | TanStack Table | Headless, high-performance tables |
| Icons | Lucide React | Consistent, lightweight icons |
| Backend Framework | Frappe 15 | ERPNext foundation |
| ERP | ERPNext 15 | Complete ERP modules |
| Database | MariaDB 10.11 | Frappe-recommended RDBMS |
| Cache | Redis 7 | Frappe-recommended cache/queue |
| Containerization | Docker + Compose | Portable deployment |

## 5. Security Architecture

- Custom authentication through Frappe session management
- Role-based access control (Trader Admin, Sales Manager, Purchase Manager, Accountant, Warehouse Manager)
- API rate limiting via Nginx
- CORS restricted to known origins
- HTTPS termination at Nginx (production)
- Environment-based secrets management
- No default passwords in production

## 6. Module Architecture

### 6.1 Trader App Modules
```
trader_app/
├── company/        # Company setup, fiscal years, chart of accounts
├── sales/          # Sales orders, invoices, delivery notes
├── purchasing/     # Purchase orders, invoices, receipts
├── inventory/      # Stock management, transfers, reconciliation
├── finance/        # Payments, journal entries, bank reconciliation
├── customers/      # Customer management, credit limits
├── suppliers/      # Supplier management, payment terms
├── reports/        # Custom trader reports and analytics
└── dashboard/      # Dashboard API endpoints
```

### 6.2 Frontend Modules
```
trader-ui/
├── auth/           # Login, logout, session management
├── dashboard/      # Main dashboard with KPI widgets
├── sales/          # Sales workflow screens
├── purchasing/     # Purchase workflow screens
├── inventory/      # Inventory management screens
├── finance/        # Financial overview screens
├── customers/      # Customer management
├── suppliers/      # Supplier management
├── reports/        # Report viewer
└── settings/       # System settings
```

## 7. Performance Targets

| Metric | Target |
|--------|--------|
| Dashboard load | < 2 seconds |
| API response (list) | < 500ms |
| API response (single) | < 200ms |
| Seed data generation | < 10 minutes |
| Container startup | < 60 seconds |
| Frontend bundle size | < 500KB gzipped |

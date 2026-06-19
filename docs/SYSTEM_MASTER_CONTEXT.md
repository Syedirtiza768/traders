# System Master Context and Audit Document

> **Authoritative reference** for the Traders Business Management System.  
> **Audit date:** 2026-06-20 · **Method:** complete static analysis of all source files.  
> For the interactive, navigable version open the canvas at  
> `C:\Users\Irtaza Hassan\.cursor\projects\f-apps-traders\canvases\traders-system-audit.canvas.tsx`

---

## Source-of-truth statement

This system is operational as a **single-company trader/distribution management SPA** with
38 working features across 16 modules. The following are **declared but not yet implemented**:

- Tally/CSV migration wizard (DocType schema exists; no parser, no engine, no API endpoints)
- Document approval workflows (declared in `hooks.py` fixtures; no JSON files exist)
- Per-route role-based authorization (only sidebar visibility is filtered; routes are unguarded)

There are **6 HIGH-severity findings** that must be resolved before production deployment should
be considered secure. See the [Audit Findings](#audit-findings) section.

---

## Table of Contents

1. [Product Purpose and Business Scope](#1-product-purpose-and-business-scope)
2. [Current Implementation Status](#2-current-implementation-status)
3. [Architecture Overview](#3-architecture-overview)
4. [Repository and Module Structure](#4-repository-and-module-structure)
5. [Frontend Architecture and Route Map](#5-frontend-architecture-and-route-map)
6. [Backend Architecture and API Map](#6-backend-architecture-and-api-map)
7. [Database Schema and Entity Model](#7-database-schema-and-entity-model)
8. [End-to-End Data Flows](#8-end-to-end-data-flows)
9. [Authentication, Authorization, and Data Isolation](#9-authentication-authorization-and-data-isolation)
10. [External Integrations, Scheduled Jobs, and Background Processing](#10-external-integrations-scheduled-jobs-and-background-processing)
11. [Environment Variables and Configuration Reference](#11-environment-variables-and-configuration-reference)
12. [Local Setup, Development, Testing, Build, and Deployment](#12-local-setup-development-testing-build-and-deployment)
13. [Audit Findings](#13-audit-findings)
14. [Technical Debt Register](#14-technical-debt-register)
15. [Prioritized Remediation Roadmap](#15-prioritized-remediation-roadmap)
16. [Known Issues, Risks, and Unresolved Decisions](#16-known-issues-risks-and-unresolved-decisions)

---

## 1. Product Purpose and Business Scope

**Traders** transforms ERPNext 15 into a productized trader/distribution management system with a
fully custom React SPA frontend. It is designed for **FMCG and hardware wholesale distributors in
Pakistan** (PKR, Punjab GST). The backend is a Frappe app (`trader_app`) that exposes 165
whitelisted RPC endpoints; the SPA consumes them via Axios with cookie-based session auth.

**Demo company profile:**

| Field | Value |
|-------|-------|
| Company | Global Trading Company Ltd |
| Business type | Wholesale trader / distributor |
| Industry | FMCG + Hardware |
| Location | Lahore, Pakistan |
| Currency | PKR |

**What it is NOT (yet):** not a full ERP replacement — no manufacturing, no payroll, no bank
reconciliation UI, no multi-company consolidated financials, no Tally migration (planned).

---

## 2. Current Implementation Status

### Feature inventory (31 items)

| Module | Feature | Status | Notes |
|--------|---------|--------|-------|
| Auth & Session | Cookie-based Frappe login with CSRF | ✅ Working | |
| Auth & Session | Role-based sidebar visibility | ✅ Working | |
| Auth & Session | Route-level role guards | ❌ Missing | **F-01** |
| Company | Multi-company switching | ✅ Working | |
| Company | Company-scoped DB filters | ✅ Working | |
| Dashboard | KPI cards (Redis cached, 15-min refresh) | ✅ Working | |
| Dashboard | Sales trend, top customers, cash flow | ✅ Working | |
| Sales | Invoice create/submit/cancel | ✅ Working | |
| Sales | Orders, quotations, delivery challans | ✅ Working | |
| Sales | Quotation cancel | ❌ Missing | **F-04** |
| Sales | POS checkout + serial tracking | ✅ Working | |
| Sales | Sales returns | ✅ Working | |
| Purchases | Invoice, orders, receipts, returns | ✅ Working | |
| Purchases | Material requests, supplier quotations | ✅ Working | |
| Inventory | Stock balance, ledger, warehouses | ✅ Working | |
| Inventory | Serial number + barcode tracking | ✅ Working | |
| Inventory | Item bundles | ✅ Working | |
| Inventory | Opening stock, stock take | ✅ Working | Components feature |
| Finance | Payment entries (create/submit/cancel) | ✅ Working | |
| Finance | Journal entries | ✅ Working | |
| Finance | Day book / day close | ✅ Working | Components feature |
| Customers | Customer CRUD + transaction history | ✅ Working | |
| Suppliers | Supplier CRUD + transaction history | ✅ Working | |
| Reports | 36 reports with CSV export | ✅ Working | |
| Settings | UI prefs, multi-currency, feature flags | ✅ Working | |
| Settings | Pakistan Punjab GST templates | ✅ Working | |
| Printing | Structured print data for invoices | ✅ Working | |
| Migration | Tally XML / CSV import wizard | ❌ Not Implemented | **F-09** |
| Migration | Migration Job DocType (schema stub) | 🟡 Partial | Schema only |
| Workflows | Document approval workflows (4 declared) | ❌ Not Implemented | **F-06** |
| Demo | 14-generator seed engine | ✅ Working | `bench execute` only |

**Summary:** 26 working · 1 partial · 4 missing

---

## 3. Architecture Overview

### Technology stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 5, TailwindCSS 3.4, Recharts 2, Zustand |
| Backend | Frappe Framework 15, ERPNext 15, Python 3.11 |
| Database | MariaDB 10.11 |
| Cache | Redis 7 (two instances: cache + queue) |
| Proxy | Nginx 1.25 |
| Containers | Docker, Docker Compose |
| CI/CD | GitHub Actions (build + deploy + architecture-audit) |

### Services (Docker Compose, 10 total)

| Service | Image | Host port | Purpose |
|---------|-------|-----------|---------|
| `db` | `mariadb:10.11` | internal | Primary database |
| `redis-cache` | `redis:7-alpine` | internal | Application cache |
| `redis-queue` | `redis:7-alpine` | internal | RQ job queue |
| `backend` | `traders-backend` (built) | **8000** | Frappe/Gunicorn API |
| `websocket` | same as backend | **9000** | Socket.IO |
| `worker-short` | same | — | RQ short queue worker |
| `worker-long` | same | — | RQ long queue worker |
| `worker-default` | same | — | RQ default queue worker |
| `scheduler` | same | — | `bench schedule` |
| `frontend` | `traders-frontend` (built) | internal (3000) | React SPA/Nginx |
| `proxy` | `nginx:1.25-alpine` | **8080** | Reverse proxy |

> **Note:** Frontend `:3000`, DB `:3306`, and Redis `:6379` are internal only. The three
> host-exposed ports are **8000**, **9000**, and **8080**. ARCHITECTURE.md incorrectly documents
> DB and Redis as externally accessible — see **F-17**.

### High-level data path

```
Browser
  → Nginx :8080
      → /api/*              → Frappe :8000
                                → permission_query_conditions (company-scoped)
                                → ERPNext DocType CRUD
                                → MariaDB
      → /socket.io          → Websocket :9000
      → /* (everything else) → Frontend Nginx :3000 → React SPA (static files)
```

---

## 4. Repository and Module Structure

```
traders/
├── apps/
│   └── trader_app/          # Custom Frappe application (Python)
│       ├── trader_app/
│       │   ├── hooks.py     # All Frappe hooks (central config)
│       │   ├── api/         # 20 Python modules, 165 whitelisted endpoints
│       │   ├── setup/       # after_install: roles + custom fields
│       │   ├── trader/doctype/  # 3 custom DocTypes
│       │   └── demo/        # 14-generator seed engine
│       ├── setup.py / pyproject.toml
│       └── requirements.txt
├── frontend/
│   └── trader-ui/           # React + TypeScript SPA
│       ├── src/
│       │   ├── App.tsx      # Routes + ProtectedRoute
│       │   ├── pages/       # 72 page components (lazy-loaded)
│       │   ├── components/  # Shared UI components
│       │   ├── stores/      # authStore, companyStore (Zustand)
│       │   └── lib/         # api.ts, permissions.ts, utils.ts, ...
│       ├── vite.config.ts
│       └── package.json
├── compose/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── .env.example
├── infra/
│   ├── docker/              # backend.Dockerfile, frontend.Dockerfile
│   └── nginx/               # proxy.conf, frontend.conf, ssl configs
├── scripts/                 # setup.sh, deploy.sh, backup.sh, redeploy-*.ps1, ...
├── docs/                    # Architecture, API docs, audits, governance
├── .github/workflows/       # build.yml, deploy.yml, architecture-audit.yml
└── package.json             # Root-level scripts (progress:sync, audit:*)
```

---

## 5. Frontend Architecture and Route Map

### Technology

- **Framework:** React 18 + TypeScript + Vite 5
- **Routing:** React Router v6 (`BrowserRouter`, `Routes`, `Route`)
- **State:** Zustand (`authStore`, `companyStore`)
- **HTTP:** Axios — all calls in `src/lib/api.ts` — `baseURL: '/'`, `withCredentials: true`
- **Auth:** Cookie-based Frappe session + `X-Frappe-CSRF-Token` header (see §9)
- **Styling:** TailwindCSS 3.4 + CSS variables + custom component classes in `index.css`
- **Charts:** Recharts 2
- **Feature flag:** `companyStore.componentsEnabled` (drives Components Trading module visibility)

### Route map (80+ routes across 72 page components)

All routes under `/` (except `/login`) are wrapped in `ProtectedRoute` → `DashboardLayout`.
Pages are lazy-loaded via `React.lazy()`.

**⚠️ WARNING (F-01):** `ProtectedRoute` only checks `isAuthenticated`. There are NO role/capability
guards at the route level. Any authenticated user can access any route directly via URL.

| Path | Component | Notes |
|------|-----------|-------|
| `/login` | `LoginPage` | Public |
| `/` | `DashboardPage` | |
| `/sales` | `SalesPage` | |
| `/sales/pos` | `PosCheckoutPage` | |
| `/sales/new` | `CreateSalesInvoicePage` | |
| `/sales/proforma/new` | `CreateQuotationPage` | |
| `/sales/challans` | `DeliveryChallansPage` | |
| `/sales/challans/new` | `CreateDeliveryChallanPage` | |
| `/sales/challans/:challanId` | `DeliveryChallanDetailPage` | |
| `/sales/returns/new` | `CreateSalesReturnPage` | |
| `/sales/dispatches/new` | `CreateSalesDispatchPage` | |
| `/sales/orders` | `SalesOrdersPage` | |
| `/sales/orders/new` | `CreateSalesOrderPage` | |
| `/sales/orders/:orderId` | `SalesOrderDetailPage` | |
| `/sales/quotations` | `QuotationsPage` | |
| `/sales/quotations/new` | `CreateQuotationPage` | |
| `/sales/quotations/:quotationId` | `QuotationDetailPage` | cancel not implemented (F-04) |
| `/sales/:invoiceId` | `SalesInvoiceDetailPage` | |
| `/purchases` | `PurchasesPage` | |
| `/purchases/new` | `CreatePurchaseInvoicePage` | |
| `/purchases/returns/new` | `CreatePurchaseReturnPage` | |
| `/purchases/receipts/new` | `CreatePurchaseReceiptPage` | |
| `/purchases/orders` | `PurchaseOrdersPage` | |
| `/purchases/orders/new` | `CreatePurchaseOrderPage` | |
| `/purchases/orders/:orderId` | `PurchaseOrderDetailPage` | |
| `/purchases/requisitions` | `PurchaseRequisitionsPage` | |
| `/purchases/requisitions/new` | `CreatePurchaseRequisitionPage` | |
| `/purchases/requisitions/:reqId` | `PurchaseRequisitionDetailPage` | |
| `/purchases/rfqs` | `SupplierQuotationsPage` | |
| `/purchases/rfqs/new` | `CreateSupplierQuotationPage` | |
| `/purchases/rfqs/:quotationId` | `SupplierQuotationDetailPage` | |
| `/purchases/:invoiceId` | `PurchaseInvoiceDetailPage` | |
| `/inventory` | `InventoryPage` | |
| `/inventory/items/new` | `CreateItemPage` | |
| `/inventory/items/:itemId` | `InventoryItemDetailPage` | |
| `/inventory/bundles` | `ItemBundlesPage` | |
| `/inventory/warehouse` | `WarehouseStockPage` | |
| `/inventory/movements` | `StockMovementPage` | |
| `/inventory/catalog` | `ComponentCatalogPage` | `componentsEnabled` guarded |
| `/inventory/opening-stock` | `OpeningStockPage` | `componentsEnabled` guarded |
| `/inventory/stock-valuation` | `StockValuationPage` | `componentsEnabled` guarded |
| `/inventory/stock-take` | `StockTakePage` | `componentsEnabled` guarded |
| `/customers` | `CustomersPage` | |
| `/customers/new` | `CreateCustomerPage` | |
| `/customers/:customerId` | `CustomerDetailPage` | |
| `/customers/:customerId/edit` | `EditCustomerPage` | |
| `/suppliers` | `SuppliersPage` | |
| `/suppliers/new` | `CreateSupplierPage` | |
| `/suppliers/:supplierId` | `SupplierDetailPage` | |
| `/suppliers/:supplierId/edit` | `EditSupplierPage` | |
| `/finance` | `FinancePage` | |
| `/finance/journals` | `JournalEntriesPage` | |
| `/finance/journals/new` | `CreateJournalEntryPage` | |
| `/finance/journals/:journalId` | `JournalEntryDetailPage` | |
| `/finance/payments` | `PaymentEntriesPage` | |
| `/finance/payments/new` | `CreatePaymentEntryPage` | |
| `/finance/payments/:paymentId` | `PaymentEntryDetailPage` | |
| `/finance/day-book` | `DayBookPage` | `componentsEnabled` guarded |
| `/finance/receivables` | `ReceivablesPage` | `componentsEnabled` guarded |
| `/finance/payables` | `PayablesPage` | `componentsEnabled` guarded |
| `/finance/day-close` | `DayClosePage` | `componentsEnabled` guarded |
| `/operations` | `OperationsPage` | |
| `/reports` | `ReportsPage` | |
| `/settings` | `SettingsPage` | |
| `/settings/audit` | `AuditLogPage` | |
| `/settings/gst` | `GstSettingsPage` | |
| `/print` | `DocumentPrintPage` | |
| `*` | `NotFoundPage` | |

### Dead code in frontend

| Item | File | Issue |
|------|------|-------|
| `AccessDenied` component | `src/components/AccessDenied.tsx` | Defined, never imported (F-07) |
| `PageLoader` function | `src/App.tsx` | Defined, never rendered (F-08) |
| `Suspense` import | `src/App.tsx` | Unused import — Suspense in DashboardLayout (F-08) |

---

## 6. Backend Architecture and API Map

### Overview

- **Framework:** Frappe 15 + ERPNext 15
- **Language:** Python 3.11
- **API pattern:** All custom endpoints are `@frappe.whitelist()` functions, accessible via
  `POST /api/method/trader_app.api.<module>.<function>`
- **Auth:** Frappe session cookie required for all endpoints (no guest endpoints)
- **Total:** 165 whitelisted methods across 20 API modules

### API modules

| Module | File | Endpoints | Purpose |
|--------|------|-----------|---------|
| audit | `api/audit.py` | 1 | Company-scoped activity log |
| bundling | `api/bundling.py` | 6 | Item Bundle CRUD and expansion |
| catalog | `api/catalog.py` | 13 | Components SKU taxonomy, find-or-create, quick entry |
| company | `api/company.py` | 3 | Multi-company SPA context + active company |
| currency | `api/currency.py` | 6 | Multi-currency settings + exchange rates |
| customers | `api/customers.py` | 8 | Customer CRUD + transactions |
| dashboard | `api/dashboard.py` | 7 | KPIs (Redis cached), trends, top customers |
| daybook | `api/daybook.py` | 9 | Day book, party settlement, quick transactions |
| finance | `api/finance.py` | 14 | Payment entries, journal entries, outstanding |
| gst | `api/gst.py` | 4 | Pakistan Punjab GST templates + config |
| inventory | `api/inventory.py` | 17 | Stock balance/ledger, serial validation, stock entries |
| pos | `api/pos.py` | 2 | POS quick checkout |
| printing | `api/printing.py` | 1 | Structured print data for invoices |
| purchases | `api/purchases.py` | 23 | Purchase documents CRUD |
| reports | `api/reports.py` | 36 | Financial + operational reports (JSON + CSV) |
| sales | `api/sales.py` | 22 | Sales documents CRUD |
| settings | `api/settings.py` | 5 | UI settings, feature flags, role resolution |
| suppliers | `api/suppliers.py` | 8 | Supplier CRUD + transactions |
| **invoice_types** | `api/invoice_types.py` | — | Internal (NOT whitelisted) — doc catalog + tax resolution |
| **permissions** | `api/permissions.py` | — | Internal (NOT whitelisted) — permission hooks |

### Hooks summary (`hooks.py`)

```python
after_install = "trader_app.setup.install.after_install"

fixtures = [
    # Role fixtures — created programmatically at install
    {"dt": "Role", "filters": [["name", "in", [...]]]},
    # Workflow fixtures — DECLARED but JSON files DO NOT EXIST (F-06)
    {"dt": "Workflow", "filters": [["name", "in", [...]]]},
    # Custom Field fixtures — created programmatically at install
    {"dt": "Custom Field", "filters": [["module", "=", "Trader"]]},
]

doc_events = {
    "Sales Invoice": {"validate": ..., "on_submit": ..., "on_cancel": ...},
    "Purchase Invoice": {"validate": ..., "on_submit": ..., "on_cancel": ...},
    "Payment Entry": {"on_submit": ...},
    "Stock Entry": {"validate": ...},
}

scheduler_events = {
    "daily_long": ["trader_app.api.inventory.update_reorder_levels"],
    "cron": {"*/15 * * * *": ["trader_app.api.dashboard.refresh_dashboard_cache"]},
}

permission_query_conditions = { ... 7 DocTypes ... }
has_permission = { ... 7 DocTypes ... }
```

---

## 7. Database Schema and Entity Model

### Schema management

MariaDB 10.11. Schema is **fully managed by Frappe/ERPNext** — no custom SQL migrations.
Schema evolves via DocType JSON sync on `bench migrate`. There is **no `patches.txt`** file.
Schema history is not explicitly tracked; all changes must be reconstructed from DocType JSON diffs.

### Custom DocTypes (3)

| DocType | Naming | Status | Key fields |
|---------|--------|--------|------------|
| **Item Bundle** | `BDL-{####}` | Operational | bundle_name, description, total_rate, items (child table) |
| **Item Bundle Detail** | (child table) | Operational | item_code (→ Item), qty, rate, amount |
| **Migration Job** | `MJ-{####}` | Schema stub only | company, status, source_type, file_path, progress, job_id, error_message, mapping_json, summary_json |

> `Migration Job` status values: Queued / Parsing / Mapping / Importing / Draft / Submitted / Failed / Cancelled

### Custom fields on ERPNext DocTypes (18 fields)

| DocType | Fields added |
|---------|-------------|
| **Company** | `trader_multi_currency_enabled`, `trader_enabled_currencies`, `trader_components_enabled`, `trader_sku_taxonomy`, `trader_item_group_templates`, `trader_custom_sku_templates` |
| **Sales Invoice** | `trader_invoice_type` (Select), `preferred_bank_account` (→ Account) |
| **Purchase Invoice** | `trader_invoice_type` (Select) |
| **Quotation** | `trader_invoice_type` (Quotation / Proforma Invoice) |
| **Delivery Note** | `trader_invoice_type` (Delivery Challan) |
| **Item** | `trader_component_item`, `trader_component_category`, `trader_component_form_factor`, `trader_component_capacity`, `trader_component_grade` |
| **Customer** | `trader_short_code`, `trader_opening_balance` |
| **Supplier** | `trader_short_code`, `trader_opening_balance` |

### Key standard ERPNext DocTypes used

Sales Invoice · Purchase Invoice · Sales Order · Purchase Order · Quotation · Delivery Note ·
Material Request · Supplier Quotation · Payment Entry · Journal Entry · Stock Entry ·
Purchase Receipt · Customer · Supplier · Item · Warehouse · Bin · Stock Ledger Entry ·
Account · Currency Exchange · GL Entry

---

## 8. End-to-End Data Flows

### A. Sales invoice creation

1. User fills `CreateSalesInvoicePage` → selects customer, adds item lines (with serial/barcode support)
2. SPA calls `inventoryApi.validateItemsStock()` to check stock availability
3. Submit → `salesApi.createSalesInvoice()` → `POST /api/method/trader_app.api.sales.create_sales_invoice`
4. Backend: resolves company → applies currency + GST template → sets `trader_invoice_type`
5. On validate hook: credit limit warning (non-blocking `msgprint`)
6. After create: `salesApi.submitSalesInvoice()` → `submit_sales_invoice`
7. `on_submit` doc event: `frappe.publish_realtime('sales_invoice_submitted')`
8. SPA receives `{name, status}` response → navigates to `SalesInvoiceDetailPage`

### B. Payment entry

1. User fills `CreatePaymentEntryPage` → party, amount, bank account/mode
2. `financeApi.createPaymentEntry()` → `create_payment_entry` → resolves settlement accounts
3. `financeApi.submitPaymentEntry()` → `submit_payment_entry`
4. `on_submit`: `frappe.publish_realtime('payment_entry_submitted')`

### C. Day book workflow (Components feature)

1. `daybookApi.postDayTransaction()` → `post_day_transaction` → creates Sales/Purchase Invoice + optional Payment Entry in one call
2. `daybookApi.settleParty()` → `settle_party` → creates Payment Entry with invoice allocation
3. Day close: `daybookApi.getDayCloseSummary()` → summary of day's totals

### D. Authentication

See §9.

### E. Dashboard KPI caching

1. Scheduler `refresh_dashboard_cache` runs every 15 minutes per company
2. Stores KPI JSON in Redis with 300-second TTL
3. `get_kpis()` reads from Redis; on cache miss, computes from ERPNext and re-caches
4. **⚠️ F-11:** if KPI computation fails, exception is silently swallowed and zeros returned

---

## 9. Authentication, Authorization, and Data Isolation

### Authentication flow

```
1. SPA loads → pings /api/method/ping as Guest → Frappe sets CSRF cookie
2. LoginPage → POST /api/method/login {usr, pwd} → Frappe sets session cookie
3. On every SPA mount → GET frappe.auth.get_logged_user → "Guest" = unauthenticated
4. On auth success → GET trader_app.api.settings.get_current_user_roles
5. All subsequent API calls include X-Frappe-CSRF-Token header
6. 401 → Axios interceptor → window.location.href = '/login'
7. CSRF error (403) → retry once with refreshed CSRF token
```

Session is managed entirely by Frappe (cookie-based). No JWT, no localStorage token.

### Frappe roles

Five custom roles are created at install time:

| Frappe role name | Frontend alias | Notes |
|-----------------|----------------|-------|
| Trader Admin | Trader Admin | Full access |
| Trader Sales Manager | Trader Sales Manager | |
| Trader Purchase Manager | Trader Purchase Manager | |
| Trader Accountant | Trader Finance Manager | **Naming mismatch — F-12** |
| Trader Warehouse Manager | Trader Inventory Manager | **Naming mismatch — F-12** |

### Permission architecture

| Layer | Mechanism | Coverage | Gap |
|-------|-----------|----------|-----|
| DB-level (backend) | `permission_query_conditions` in hooks.py — company scope + owner filter for 7 DocTypes | Sales Invoice, Purchase Invoice, Sales Order, Purchase Order, Payment Entry, Delivery Note, Quotation | None |
| Feature-flag (backend) | `_assert_enabled()` in catalog.py / daybook.py — checks `Company.trader_components_enabled` | Components Trading module | None |
| API-level (backend) | Settings toggle restricted to Trader Admin / System Manager / Administrator | Settings feature flag | None |
| UI nav (frontend) | `hasCapability(roles, capability)` in `Sidebar.tsx` | Desktop sidebar only | **MobileNav unfiltered (F-02)** |
| Route guard (frontend) | `ProtectedRoute` — checks `isAuthenticated` only | All routes | **No role/capability guard (F-01)** |

### Company data isolation

- `resolve_active_company()` validates company exists and user can access it
- `assert_document_company_access()` — Trader roles pinned to active company; System Manager can cross-read
- All list-view APIs call `resolve_active_company()` and filter by company

---

## 10. External Integrations, Scheduled Jobs, and Background Processing

### Scheduled jobs

| Schedule | Function | Purpose |
|----------|----------|---------|
| `*/15 * * * *` | `trader_app.api.dashboard.refresh_dashboard_cache` | Pre-warm Redis KPI cache per company |
| `daily_long` | `trader_app.api.inventory.update_reorder_levels` | Log low-stock alert when bin qty < 10 |

### Doc event hooks

| DocType | Event | Handler |
|---------|-------|---------|
| Sales Invoice | `validate` | Credit limit warning (non-blocking msgprint) |
| Sales Invoice | `on_submit` / `on_cancel` | `frappe.publish_realtime` event |
| Purchase Invoice | `validate` | **Placeholder (`pass`) — no logic** |
| Purchase Invoice | `on_submit` / `on_cancel` | `frappe.publish_realtime` event |
| Payment Entry | `on_submit` | `frappe.publish_realtime` event |
| Stock Entry | `validate` | Reject zero/negative qty rows |

### External integrations

| Integration | Status | Notes |
|-------------|--------|-------|
| ERPNext / Frappe 15 | ✅ Active | Primary platform for all DocTypes |
| Redis | ✅ Active | KPI cache (300s TTL), settings cache, GST config cache, RQ job queue |
| Pakistan Punjab GST | ✅ Active | `seed_punjab_gst_templates` creates local tax accounts |
| Frappe socketio | ✅ Active | Realtime document submit/cancel notifications via websocket :9000 |
| Tally ERP / TallyPrime / CSV | ❌ Planned only | `defusedxml` dep added; `Migration Job` DocType schema; no parser or import logic |
| Email / SMS / Push | ❌ Not implemented | No notification integrations |

### RQ workers

Three workers are configured: `worker-short`, `worker-long`, `worker-default`. These process
Frappe's built-in background job queue. No custom jobs are submitted via RQ in this app currently
(pending migration engine implementation).

---

## 11. Environment Variables and Configuration Reference

All variables set in `compose/.env` (copy from `compose/.env.example`).

| Variable | Required | Default/Example | Purpose |
|----------|----------|-----------------|---------|
| `SITE_NAME` | Yes | `trader.localhost` | Frappe site name |
| `BENCH_NAME` | No | `frappe-bench` | Bench directory name |
| `DB_HOST` | Yes | `db` | MariaDB service hostname (Docker internal) |
| `DB_PORT` | No | `3306` | MariaDB port |
| `DB_ROOT_PASSWORD` | Yes | — | MariaDB root password — **CHANGE IN PRODUCTION** |
| `MYSQL_DATABASE` | No | `trader_db` | Database name |
| `REDIS_CACHE` | Yes | `redis-cache:6379` | Redis cache DSN |
| `REDIS_QUEUE` | Yes | `redis-queue:6379` | Redis queue DSN |
| `ADMIN_PASSWORD` | Yes | — | ERPNext admin password — **CHANGE IN PRODUCTION** |
| `ENCRYPTION_KEY` | Yes | — | Frappe field encryption key (32 chars) — **CHANGE IN PRODUCTION** |
| `SECRET_KEY` | Yes | — | Frappe secret key — **CHANGE IN PRODUCTION** |
| `FRAPPE_VERSION` | Yes | `v15.47.4` | Frappe version pinned in Dockerfile |
| `ERPNEXT_VERSION` | Yes | `v15.37.2` | ERPNext version pinned in Dockerfile |
| `HTTP_PORT` | No | `8080` | Nginx proxy host port |
| `GUNICORN_WORKERS` | No | `4` (prod: `8`) | Gunicorn worker count |
| `GUNICORN_THREADS` | No | `4` | Threads per Gunicorn worker |
| `BACKUP_DIR` | No | `/home/frappe/backups` | Backup destination path |
| `BACKUP_RETENTION_DAYS` | No | `30` (prod: `90`) | Backup retention period |
| `VITE_API_URL` | No | `/api` | ⚠️ Injected as Docker build arg but **NOT consumed** by frontend — see **F-05** |
| `VITE_SITE_NAME` | No | `trader.localhost` | ⚠️ Injected as Docker build arg but **NOT consumed** by frontend — see **F-05** |
| `INSTALL_DEMO` | No | `true` | Set in `setup.sh` to trigger demo seed |
| `DEPLOY_SSH_KEY` | No | — | CI/CD secret: SSH key for server deployment |
| `DEPLOY_HOST` | No | `enxi.realtrackapp.com` | CI/CD: deployment server host |
| `DEPLOY_USER` | No | `ubuntu` | CI/CD: deployment SSH user |
| `DEPLOY_PATH` | No | `/opt/traders` | CI/CD: project path on server |
| `DEPLOY_URL` | No | `https://enxi.realtrackapp.com` | CI/CD: health-check base URL |

---

## 12. Local Setup, Development, Testing, Build, and Deployment

### Quick start (Docker)

```bash
git clone https://github.com/Syedirtiza768/traders.git
cd traders/compose
cp .env.example .env
# Edit .env: set DB_ROOT_PASSWORD, ADMIN_PASSWORD, ENCRYPTION_KEY, SECRET_KEY
docker compose up -d
# Wait ~3–5 min for backend health check to pass
docker compose exec backend bench --site trader.localhost execute trader_app.demo.install_demo
# Access: http://localhost:8080
# Demo login: demo.admin@traderapp.com / Demo@12345
```

### Frontend development (Vite)

```bash
cd frontend/trader-ui
npm install
npm run dev        # Vite dev server on :3000, proxies /api → http://localhost:8000
npm run build      # tsc -b && vite build → dist/
npm run lint       # eslint .
```

> No `VITE_*` env vars are needed — API base is hardcoded as `/` in `api.ts`.

### Backend development

```bash
# In running Docker container or local bench:
bench --site trader.localhost migrate                   # Apply schema changes
bench --site trader.localhost execute trader_app.demo.install_demo   # Seed demo data
bench --site trader.localhost execute trader_app.demo.uninstall_demo # Remove demo data
bench --site trader.localhost clear-cache              # Clear Redis caches
```

### Windows PowerShell helpers

```powershell
scripts/redeploy-windows.ps1 -Migrate           # Quick rebuild + migrate
scripts/cold-rebuild-windows.ps1 -RemoveVolumes  # Full cold rebuild, reset DB
```

### Testing

> ⚠️ **F-13:** There are currently zero automated tests in either the frontend or backend.

Run code quality checks (CI runs these on every PR):

```bash
# Backend linting
cd apps/trader_app
flake8 trader_app/
black --check trader_app/
isort --check trader_app/

# Frontend type checking
cd frontend/trader-ui
npx tsc --noEmit
```

### Production deployment

```bash
# Initial setup
./scripts/setup.sh           # Or: INSTALL_DEMO=true ./scripts/setup.sh

# Manual Docker production
docker compose -f compose/docker-compose.yml -f compose/docker-compose.prod.yml up -d

# Ongoing updates
./scripts/deploy.sh          # Or: ./scripts/redeploy-ec2.sh (EC2)

# Backups
./scripts/backup.sh
```

### CI/CD (GitHub Actions)

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `build.yml` | Push to main/develop; PRs to main | `implementation-progress` (PRs), `frontend` (tsc + build), `backend` (flake8/black/isort), `docker-build` (build + push to GHCR on push) |
| `deploy.yml` | After CI success on main; workflow_dispatch | SSH to server, git pull, docker build, bench migrate, health check, auto-create GitHub issue on failure |
| `architecture-audit.yml` | PR/push on structural files; workflow_dispatch | Run `npm run audit:architecture`; auto-commit doc updates on main; comment on PRs |

Health check URL: `${DEPLOY_URL}/api/method/ping`

---

## 13. Audit Findings

### Summary: 17 findings (0 Critical · 6 High · 7 Medium · 4 Low)

---

### HIGH severity (6)

#### F-01 — Frontend routes have no role-based guards
- **Category:** Security
- **Evidence:** `App.tsx` `ProtectedRoute` checks `isAuthenticated` only. `src/components/AccessDenied.tsx` is defined but never imported anywhere in the codebase.
- **Impact:** Any authenticated user can navigate to `/settings`, `/finance/journals/new`, etc. regardless of their Trader role. A Trader Sales Manager can access all finance routes; a demo user can access all admin routes.
- **Recommendation:** Add `hasCapability()` checks in `ProtectedRoute` or create per-route capability HOCs using `permissions.ts`. Wire `AccessDenied.tsx` to render when capability check fails.

#### F-02 — MobileNav bypasses capability and feature-flag filtering
- **Category:** Security
- **Evidence:** `src/components/MobileNav.tsx` always shows Home/Sales/Stock/Reports/More with no `hasCapability()` or `componentsEnabled` checks. `Sidebar.tsx` correctly filters both.
- **Impact:** Mobile users can navigate to restricted routes (e.g. inventory routes for a Finance-only user; components routes when feature is disabled).
- **Recommendation:** Apply the same `hasCapability()` and `componentsEnabled` checks to `MobileNav` as `Sidebar` already uses.

#### F-03 — Documentation references wrong dashboard endpoint name
- **Category:** API Contract
- **Evidence:** `docs/API_REFERENCE.md` and `DEPLOYMENT_COMMANDS.md` reference `trader_app.api.dashboard.get_dashboard_kpis`. Actual function in `dashboard.py` (line 159) is `get_kpis`.
- **Impact:** Developer/operator curl commands from docs return 404. New integrators using the API reference will be misled.
- **Recommendation:** Update `docs/API_REFERENCE.md` and `DEPLOYMENT_COMMANDS.md` to use `get_kpis`. Optionally add a `get_dashboard_kpis` alias in `dashboard.py`.

#### F-04 — Sales Quotation cancel not implemented on either side
- **Category:** API Contract
- **Evidence:** `frontend/trader-ui/src/lib/api.ts` has no `cancelQuotation` function. `apps/trader_app/trader_app/api/sales.py` has `cancel_sales_invoice` (L528) and `cancel_sales_order` (L538) but no `cancel_quotation` function.
- **Impact:** Submitted sales quotations cannot be cancelled through the custom UI. They remain permanently in Submitted state unless the user accesses ERPNext Desk directly.
- **Recommendation:** Add `@frappe.whitelist() def cancel_quotation(name)` in `sales.py`. Add `cancelQuotation` in `api.ts` `salesApi`. Wire a cancel button in `QuotationDetailPage`.

#### F-05 — VITE_API_URL and VITE_SITE_NAME build args are silently ignored
- **Category:** Configuration
- **Evidence:** `infra/docker/frontend.Dockerfile` injects `VITE_API_URL` and `VITE_SITE_NAME` as build ARGs. `compose/.env.example` and `.env.production.example` define them. Grep of `frontend/trader-ui/src/**` finds zero `import.meta.env` references. API base URL is hardcoded as `'/'` in `api.ts`.
- **Impact:** `.env.production.example` shows `VITE_API_URL=https://enxi.realtrackapp.com/api` which is never applied. Production API URL configuration via the env file silently has no effect.
- **Recommendation:** Either (a) consume `import.meta.env.VITE_API_URL` in `api.ts` as the Axios `baseURL` fallback, or (b) remove unused build ARGs from `frontend.Dockerfile` and document that the API base is always proxied through Nginx.

#### F-06 — Workflow fixtures declared but no JSON files exist
- **Category:** Infrastructure
- **Evidence:** `hooks.py` `fixtures` array declares 4 Workflow DocTypes: Trader Sales Order Workflow, Trader Sales Invoice Workflow, Trader Purchase Order Workflow, Trader Purchase Invoice Workflow. No workflow JSON files exist anywhere in the repository.
- **Impact:** Fresh installs have no document approval workflows. `bench export-fixtures` would yield empty results for these. Document lifecycle state machine (approval/rejection flows) is entirely absent.
- **Recommendation:** Create and commit workflow JSON fixture files (run `bench export-fixtures` after creating workflows in the UI), or remove the Workflow entries from `hooks.py` fixtures if approval workflows are not yet designed.

---

### MEDIUM severity (7)

#### F-07 — AccessDenied.tsx component is orphaned
- **Category:** Dead Code
- **Evidence:** `src/components/AccessDenied.tsx` — component exists, zero imports in the codebase.
- **Impact:** Misleads developers into believing route-level access control is already implemented.
- **Recommendation:** Wire into route guards (see F-01) or delete.

#### F-08 — App.tsx contains dead PageLoader and unused Suspense import
- **Category:** Dead Code
- **Evidence:** `App.tsx` defines `function PageLoader()` that is never rendered. `Suspense` is imported but the actual Suspense boundary lives in `DashboardLayout.tsx`.
- **Impact:** Bundle bloat; developer confusion about the intended loading pattern.
- **Recommendation:** Remove `PageLoader` definition and the `Suspense` import from `App.tsx`.

#### F-09 — Tally/CSV migration wizard is a schema stub only
- **Category:** Planned — Not Implemented
- **Evidence:** `Migration Job` DocType JSON exists in `trader/doctype/migration_job/`. `defusedxml>=0.7.1` in `requirements.txt`. But: no `MigrationExtractor` ABC, no Tally XML parser, no CSV extractor, no import engine, no whitelisted API endpoints for migration. `TODOS.md` items M-1–M-8 and FE-1–FE-7 are all marked pending.
- **Impact:** Migration feature is completely non-functional. Any documentation describing Tally migration capability is premature and misleading.
- **Recommendation:** Add a `> PLANNED — Not yet implemented` callout to `README.md` and `docs/ARCHITECTURE.md`. Complete TODOS M-1–M-8 before creating any user-facing migration UI.

#### F-10 — TODOS.md is stale relative to IMPLEMENTATION_PROGRESS.md
- **Category:** Documentation Staleness
- **Evidence:** `docs/IMPLEMENTATION_PROGRESS.md` (generated 2026-06-19) marks QW-1–5, Settings persistence, Migration Job DocType, and dashboard cache as Done. `TODOS.md` still lists all of these as pending.
- **Impact:** New contributors and AI agents reading `TODOS.md` will work on already-resolved issues.
- **Recommendation:** Update `TODOS.md` to mark QW-1–5, M-2, settings, and cache items as `[DONE]`. Add a note that `docs/IMPLEMENTATION_PROGRESS.md` is the authoritative progress tracker.

#### F-11 — Broad except: pass swallows errors silently
- **Category:** Reliability
- **Evidence:** `TODOS.md` QW-3 identifies `_check_customer_credit_limit` broad `except`. `dashboard.py` `get_kpis()` uses `try/except` to silently return zeros. `settings.py` and others use `except Exception: pass` for non-critical paths.
- **Impact:** Production errors in KPI computation, settings saves, and credit limit checks produce silent failures with no log entries.
- **Recommendation:** Replace broad `except` with specific exceptions or add `frappe.log_error()` before `pass`.

#### F-12 — Role names mismatch between Frappe DB and frontend permissions
- **Category:** Naming
- **Evidence:** `setup/__init__.py` creates roles named `"Trader Accountant"` and `"Trader Warehouse Manager"`. `permissions.ts` maps these as aliases to `"Trader Finance Manager"` and `"Trader Inventory Manager"`.
- **Impact:** Frappe role assignment UI shows `Accountant`/`Warehouse Manager` but docs and capability code say `Finance Manager`/`Inventory Manager`. Confusing for administrators assigning roles.
- **Recommendation:** Pick one canonical name per role and apply it everywhere (Frappe role name, `permissions.ts`, docs, `hooks.py` fixtures).

#### F-13 — Zero automated tests
- **Category:** Testing
- **Evidence:** No `.test.ts`, `.spec.ts`, `_test.py`, or `test_*.py` files in either `frontend/trader-ui/src/` or `apps/trader_app/`. CI backend job runs only `flake8`/`black`/`isort`.
- **Impact:** No regression coverage for auth, invoice creation, payment allocation, serial validation, or permission query conditions. Silent regressions possible on any change.
- **Recommendation:** Add pytest coverage for serial validation, permission query conditions, credit limit validation. Add Vitest coverage for `itemLineUtils.ts` and `permissions.ts`.

---

### LOW severity (4)

#### F-14 — No validation library; inconsistent imperative validation
- **Category:** Code Quality
- **Evidence:** `package.json` has no Zod, Yup, React Hook Form, or Formik. Validation is per-page `setError()` + HTML5 `required` attributes.
- **Recommendation:** Adopt React Hook Form + Zod. Prioritize `CreateSalesInvoicePage` and `CreatePaymentEntryPage`.

#### F-15 — TypeScript unused-variable checking disabled
- **Category:** Code Quality
- **Evidence:** `tsconfig.json`: `"noUnusedLocals": false`, `"noUnusedParameters": false`. The `PageLoader` dead code in `App.tsx` would be caught by enabling these.
- **Recommendation:** Enable both flags and fix resulting errors.

#### F-16 — Stock aging report has unbounded table scan
- **Category:** Performance
- **Evidence:** `TODOS.md` P-1 documents: "Fix stock aging report unbounded table scan" in `reports.py` `get_stock_aging_report`.
- **Recommendation:** Add date range or pagination filter to the stock aging query. Profile with `EXPLAIN` before production deployment on large datasets.

#### F-17 — Port exposure documented inconsistently
- **Category:** Documentation
- **Evidence:** `docs/ARCHITECTURE.md` lists DB `:3306` and Redis `:6379`/`:6380` as localhost-accessible. `docker-compose.yml` only exposes `:8000` (backend), `:9000` (websocket), and `:8080` (proxy). Frontend `:3000` and DB `:3306` are internal-only (`expose`, not `ports`).
- **Recommendation:** Update `ARCHITECTURE.md` port table to show only the three actually host-exposed ports.

---

## 14. Technical Debt Register

| Severity | Item | Finding |
|----------|------|---------|
| HIGH | No automated tests (frontend or backend) | F-13 |
| HIGH | Silent exception swallowing in `get_kpis` and credit limit check | F-11 |
| MEDIUM | No form validation library — inconsistent imperative `setError()` | F-14 |
| MEDIUM | Dead code: `App.tsx` `PageLoader` + unused `Suspense` import | F-08 |
| MEDIUM | Orphaned component: `AccessDenied.tsx` never used | F-07 |
| MEDIUM | `TODOS.md` manually maintained and known to be stale | F-10 |
| MEDIUM | Frappe role name vs frontend alias mismatch | F-12 |
| MEDIUM | No `patches.txt` — schema history not tracked | — |
| MEDIUM | `Purchase Invoice` validate hook is a `pass` placeholder | — |
| MEDIUM | Unbounded table scan in stock aging report | F-16 |
| LOW | TypeScript `noUnusedLocals`/`noUnusedParameters` disabled | F-15 |

---

## 15. Prioritized Remediation Roadmap

### P0 — Blocking for production security/correctness

| ID | Task | Effort | Finding | Acceptance criteria |
|----|------|--------|---------|---------------------|
| R-01 | Add route-level capability guards | Medium | F-01 | Direct URL to `/settings` returns access-denied UI for non-admins |
| R-02 | Fix MobileNav capability filtering | Small | F-02 | MobileNav items match Sidebar visibility for all roles |
| R-03 | Fix API docs: `get_kpis` not `get_dashboard_kpis` | Trivial | F-03 | curl from docs succeeds |
| R-04 | Implement `cancel_quotation` endpoint | Small | F-04 | Submitted quotation cancellable from `QuotationDetailPage` |
| R-05 | Resolve `VITE_API_URL`: consume or remove | Small | F-05 | `VITE_API_URL` in `.env.production.example` has observable effect, or ARG removed from Dockerfile |
| R-06 | Create workflow JSON fixtures or remove declarations | Medium | F-06 | `bench export-fixtures` succeeds for Workflow; document lifecycle approval works or removed |

### P1 — Important before public release

| ID | Task | Effort | Finding | Acceptance criteria |
|----|------|--------|---------|---------------------|
| R-07 | Fix silent exception swallowing | Small | F-11 | All exceptions logged via `frappe.log_error` before bare `except pass` |
| R-08 | Canonicalize Trader role names | Small | F-12 | Frappe role UI names match docs and `permissions.ts` |
| R-09 | Remove orphaned `AccessDenied.tsx` and `App.tsx` dead code | Trivial | F-07, F-08 | No orphaned components; `tsc --noEmit` passes with stricter checks |
| R-10 | Update `TODOS.md` to reflect completed items | Trivial | F-10 | `TODOS.md` matches `IMPLEMENTATION_PROGRESS.md` for all Done items |
| R-11 | Fix port documentation in `ARCHITECTURE.md` | Trivial | F-17 | Only `:8000`, `:9000`, `:8080` shown as host-exposed ports |

### P2 — Recommended before onboarding external developers

| ID | Task | Effort | Finding | Acceptance criteria |
|----|------|--------|---------|---------------------|
| R-12 | Add initial test coverage | Large | F-13 | pytest covers serial validation, permission query conditions, credit limit; Vitest covers `permissions.ts` and `itemLineUtils` |
| R-13 | Mark Tally migration as planned-not-implemented in docs | Trivial | F-09 | `README.md` and `ARCHITECTURE.md` show migration as a planned future feature |

### P3 — Quality-of-life improvements

| ID | Task | Effort | Finding | Acceptance criteria |
|----|------|--------|---------|---------------------|
| R-14 | Enable TS `noUnusedLocals`/`noUnusedParameters` | Small | F-15 | `tsc --noEmit` passes with strict unused-variable checking |
| R-15 | Fix stock aging unbounded table scan | Medium | F-16 | Stock aging query has LIMIT or date-range filter; `EXPLAIN` shows index scan |
| R-16 | Adopt form validation library for critical forms | Large | F-14 | `CreateSalesInvoicePage` and `CreatePaymentEntryPage` use React Hook Form + Zod |

---

## 16. Known Issues, Risks, and Unresolved Decisions

### Known issues

1. **Quotation cancel:** Submitted quotations cannot be cancelled via the SPA (F-04). Workaround: use ERPNext Desk at `/app/quotation`.
2. **Dashboard zeros on exception:** If ERPNext query fails inside `get_kpis()`, all KPIs silently return zeros with no visible error in the UI (F-11).
3. **MobileNav auth bypass:** Finance-only users can reach inventory routes on mobile (F-02).
4. **API docs stale:** `get_dashboard_kpis` name in docs returns 404 (F-03).

### Open decisions

1. **Tally migration scope:** TODOS.md lists M-1–M-8 (backend) and FE-1–FE-7 (frontend). No design spec or timeline exists. The Migration Job DocType schema was created speculatively.
2. **Workflow design:** Four document approval workflows are declared in `hooks.py` fixtures but never designed or implemented. Decision needed: workflow states, transitions, approver roles.
3. **Role naming:** Whether to rename Frappe roles from `Trader Accountant` / `Trader Warehouse Manager` to match the frontend aliases `Trader Finance Manager` / `Trader Inventory Manager` — requires migration for existing installations.
4. **VITE_API_URL usage:** Whether to actually consume this env var (enabling custom API base) or document that Nginx proxying always handles routing. Currently the var is a dead config entry.
5. **Test framework selection:** No decision on whether to use pytest + frappe test runner or a standalone pytest setup for backend; no decision on Vitest vs Jest for frontend.

### Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Authenticated user accesses unauthorized routes | High | High | Implement R-01, R-02 before production |
| Demo data produces unrealistic reports | Medium | Medium | Seed engine verified; minor sales errors (credit limits) expected |
| ERPNext version upgrade breaks custom fields/hooks | Medium | High | Pin FRAPPE_VERSION/ERPNEXT_VERSION in `.env`; test on version upgrade |
| Silent KPI zeros mislead users | Medium | Medium | Fix R-07 (F-11) |
| Tally migration expectations vs implementation gap | High | Medium | Document clearly as planned-only (R-13) |
| Unbounded stock aging report times out on large data | Low | Medium | Fix R-15 (F-16) before data volume grows |

---

*Document generated by static code analysis on 2026-06-20. Maintained by the system audit process — update this file whenever `docs/implementation-progress.manifest.json` changes or a finding is resolved.*

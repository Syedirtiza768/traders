# Traders — Trader Business System on ERPNext

> Trader and distribution ERP built on ERPNext/Frappe with a custom UI and an isolated development demo-data engine.

## Overview

**Traders** transforms ERPNext into a productized trader/distribution management system with:

- 🏢 **Custom Frontend** — Modern SaaS-style UI (React + TypeScript), completely independent of ERPNext Desk
- 🐳 **Docker Deployment** — Compose-based local setup and documented production overlay
- 🌱 **Demo Seed Engine** — Verified zero-error QA dataset; restricted to explicitly marked fresh disposable sites
- 📊 **Trader-Focused Modules** — Sales, purchasing, inventory, receivables, payables, financial dashboards
- 🔐 **Custom Auth Flow** — Branded login, capability-gated routes, tenant and company permission logic

## System Documentation

For the current production-readiness verdict and evidence, see
[`docs/PRODUCTION_READINESS_REPORT.md`](docs/PRODUCTION_READINESS_REPORT.md) and its
[`test matrix`](docs/PRODUCTION_READINESS_TEST_MATRIX.md). The system master context is a historical architecture snapshot; generated architecture audits are heuristic candidates and are not a substitute for current code review.

> **Note on planned features:** Tally/CSV data migration and document approval workflows are
> declared in the codebase but **not yet implemented**. The Migration Job DocType schema exists
> as a placeholder. Do not rely on these features for production use.

## Quick Start

```bash
# Clone and start
git clone https://github.com/Syedirtiza768/traders.git
cd traders

# Local-development values only; never use these values in production.
cp compose/.env.example compose/.env

cd compose
docker compose up -d --build
docker compose logs -f site-init

# Demo data may only be seeded on a fresh disposable site:
docker compose exec backend bench --site trader.localhost set-config allow_demo_seed true
docker compose exec backend bench --site trader.localhost execute trader_app.demo.install_demo
```

The demo installer rejects any site that already has a Company or business data. `trader_app.demo.uninstall_demo` is disabled because the legacy command could delete site-wide master records; remove a demo dataset by resetting its disposable site.

The `site-init` service creates the Frappe site and installs ERPNext and `trader_app`. Access the local UI at `http://localhost:8080`. Production requires unique secrets from `compose/.env.production.example` and an HTTPS host proxy; see [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md).

## Windows rebuild & redeploy helpers

For Windows/Docker Desktop workflows, use the PowerShell helpers in `scripts/`:

- Quick redeploy: `scripts/redeploy-windows.ps1`
- Full cold rebuild: `scripts/cold-rebuild-windows.ps1`

See `docs/WINDOWS_DEPLOYMENT.md` for the quick app-only, frontend-only, backend-only, and full cold rebuild flows.

## Demo seed status

A clean isolated QA site on 2026-10-05 generated 2,453 records with zero generator errors and passed every generator validation. The demo seed is development/QA data, not an operational production migration. Payment references, fiscal-period stock posting, supplier quotation prerequisites, inventory valuation, and component stock metadata were verified in the seeded site. Read-only accounting checks found no unbalanced GL voucher groups or Bin/Stock Ledger Entry discrepancies. See the production-readiness report and test matrix for scope, limitations, and the remaining release gates.

### Frontend workspace note

If VS Code shows unresolved imports in `frontend/trader-ui`, install the frontend dependencies before relying on editor typecheck results. The app metadata already declares the required packages in `frontend/trader-ui/package.json`.

The frontend requires **Chrome 111+, Edge 111+, Safari 16.4+, or Firefox 128+**. Its Tailwind CSS 4 build uses modern CSS features and does not support older browser versions; see the [official browser requirements](https://tailwindcss.com/docs/upgrade-guide#browser-requirements).

## Repository Structure

```
root/
├── docs/                    # Architecture, API docs, guides
├── infra/
│   ├── docker/              # Dockerfiles for all services
│   └── nginx/               # Nginx reverse proxy config
├── apps/
│   └── trader_app/          # Custom Frappe application
├── frontend/
│   └── trader-ui/           # React + TypeScript custom frontend
├── demo/
│   ├── seed_engine/         # Core seed data engine
│   ├── generators/          # Module-specific data generators
│   └── installer/           # Demo installation orchestrator
├── compose/                 # Docker Compose files & env
├── scripts/                 # Setup, deploy, backup scripts
└── .github/                 # CI/CD workflows
```

## Demo Company Profile

| Field | Value |
|-------|-------|
| Company | Global Trading Company Ltd |
| Business Type | Wholesale trader / distributor |
| Industry | FMCG + Hardware |
| Location | Lahore, Pakistan |
| Currency | PKR |

## Demo Data Generated

- **80–120** Customers with contacts and addresses
- **40–60** Suppliers with payment terms
- **300–500** Products across FMCG, hardware, electrical, consumables
- **300–600** Sales orders and invoices
- **150–300** Purchase orders and invoices
- **Financial transactions** spanning 6–12 months
- **Outstanding receivables and payables** for aging reports
- **Inventory balances** across multiple warehouses

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Frappe Framework 15, ERPNext 15, Python 3.11 |
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Database | MariaDB 10.11 |
| Cache | Redis 7 |
| Proxy | Nginx |
| Containers | Docker, Docker Compose |
| CI/CD | GitHub Actions |

## License

MIT License — See [LICENSE](LICENSE) for details.

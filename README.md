# Traders — Trader Business System on ERPNext

> A production-grade trader management platform built on ERPNext/Frappe with a custom UI, Dockerized deployment, and comprehensive demo seed data engine.

## Overview

**Traders** transforms ERPNext into a productized trader/distribution management system with:

- 🏢 **Custom Frontend** — Modern SaaS-style UI (React + TypeScript), completely independent of ERPNext Desk
- 🐳 **Docker Deployment** — One-command deployment on any Ubuntu server
- 🌱 **Demo Seed Engine** — Generates 6–12 months of realistic trading data instantly
- 📊 **Trader-Focused Modules** — Sales, purchasing, inventory, receivables, payables, financial dashboards
- 🔐 **Custom Auth Flow** — Branded login, role-based access, trader-specific permissions

## Quick Start

```bash
# Clone and start
git clone https://github.com/Syedirtiza768/traders.git
cd traders

# Copy environment file
cp compose/.env.example compose/.env

# Start all services
docker compose -f compose/docker-compose.yml up -d

# Install demo data (after ERPNext is ready)
docker compose -f compose/docker-compose.yml exec backend bench --site trader.localhost execute trader_app.demo.install_demo
```

Access the system at `http://localhost:8080`

## Windows rebuild & redeploy helpers

For Windows/Docker Desktop workflows, use the PowerShell helpers in `scripts/`:

- Quick redeploy: `scripts/redeploy-windows.ps1`
- Full cold rebuild: `scripts/cold-rebuild-windows.ps1`

See `docs/WINDOWS_DEPLOYMENT.md` for the quick app-only, frontend-only, backend-only, and full cold rebuild flows.

## Verified Local Demo Status

The local Docker demo flow has been revalidated against the current repo state.

### Latest verified result

- Demo installer: `✅ DEMO INSTALLED SUCCESSFULLY`
- Sales generator: `459` created, `13` errors
- Financial generator: `72` created, `0` errors

### Latest verified counts

| Metric | Count |
|-------|------:|
| Bins with stock | 450 |
| Purchase Invoices | 224 |
| Sales Invoices | 472 |
| Payment Entries | 589 |
| Journal Entries | 72 |

### Verified notes

- HTTP site resolution for `trader.localhost` is fixed in the Docker/Nginx setup.
- `uninstall_demo()` now cleans `Bin` rows correctly.
- Demo inventory, purchases, sales, payments, and financial entries all populate successfully.
- A small number of sales invoices can still be rejected by ERPNext credit-limit rules during seeding; the latest verified run ended with `13` such sales errors while still passing validation.

### Frontend workspace note

If VS Code shows unresolved imports in `frontend/trader-ui`, install the frontend dependencies before relying on editor typecheck results. The app metadata already declares the required packages in `frontend/trader-ui/package.json`.

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

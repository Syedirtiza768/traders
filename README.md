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

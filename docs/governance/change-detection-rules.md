# Change Detection Rules

## Purpose

This document defines path-based and pattern-based triggers that determine when architecture documentation must be refreshed. The continuous audit system uses these rules to decide whether a full or partial re-audit is required.

## Path-Based Trigger Rules

### Frontend Structural Changes

```
Trigger Paths:
  frontend/trader-ui/src/App.tsx
  frontend/trader-ui/src/pages/**
  frontend/trader-ui/src/components/Sidebar.tsx
  frontend/trader-ui/src/components/Navbar.tsx
  frontend/trader-ui/src/layouts/**
  frontend/trader-ui/src/components/**

Refresh Targets:
  docs/audits/frontend-screen-inventory.md
  docs/audits/navigation-audit.md
  docs/audits/frontend-actions-audit.md
  docs/system-graphs/navigation-graph.md
  docs/system-graphs/erp-system-graph.md
  docs/audits/module-coverage-matrix.md
```

### Frontend API Changes

```
Trigger Paths:
  frontend/trader-ui/src/lib/api.ts
  frontend/trader-ui/src/stores/**

Refresh Targets:
  docs/audits/frontend-api-mapping.md
  docs/audits/frontend-backend-mapping.md
  docs/system-graphs/erp-system-graph.md
```

### Backend Endpoint Changes

```
Trigger Paths:
  apps/trader_app/trader_app/api/**
  apps/trader_app/trader_app/hooks.py

Refresh Targets:
  docs/audits/backend-endpoints.md
  docs/audits/frontend-backend-mapping.md
  docs/architecture/service-layer-map.md
  docs/architecture/database-entity-map.md
  docs/audits/workflow-coverage.md
  docs/system-graphs/erp-system-graph.md
```

### Service / Business Logic Changes

```
Trigger Paths:
  apps/trader_app/trader_app/api/**
  apps/trader_app/trader_app/setup/**
  apps/trader_app/trader_app/demo/**

Refresh Targets:
  docs/architecture/service-layer-map.md
  docs/architecture/database-entity-map.md
  docs/audits/workflow-coverage.md
  docs/system-graphs/module-traceability.md
```

### Permission / Auth Changes

```
Trigger Paths:
  apps/trader_app/trader_app/hooks.py  (fixtures, permissions sections)
  frontend/trader-ui/src/stores/authStore.ts
  frontend/trader-ui/src/App.tsx  (ProtectedRoute)

Refresh Targets:
  docs/architecture/permission-visibility-map.md
  docs/audits/architecture-findings.md
```

### Infrastructure Changes

```
Trigger Paths:
  compose/**
  infra/**
  scripts/**

Refresh Targets:
  docs/architecture/repository-architecture.md
```

### Demo / Seed Data Changes

```
Trigger Paths:
  apps/trader_app/trader_app/demo/**

Refresh Targets:
  docs/architecture/service-layer-map.md
  docs/audits/module-coverage-matrix.md
```

## Pattern-Based Detection

| Pattern | Detection Logic | Action |
|---|---|---|
| New `<Route` element in `App.tsx` | Regex: `<Route\s+path=` count changed | Refresh screen inventory, navigation audit |
| New `@frappe.whitelist()` in `api/` | Grep for decorator count | Refresh backend endpoints |
| New `navItems` entry in `Sidebar.tsx` | Parse navItems array length | Refresh navigation audit |
| New API namespace in `api.ts` | Detect new `export const xxxApi` | Refresh frontend API mapping |
| New page import in `App.tsx` | Count import statements from `./pages/` | Refresh screen inventory |
| New `frappe.db.sql` table reference | Grep for `tab` table names | Refresh database entity map |
| New `resourceApi.list({ doctype:` call | Grep for doctype references | Refresh frontend-backend mapping |
| Changed fixtures in `hooks.py` | Detect fixtures array changes | Refresh permission map |

## Change Scope Classification

### Small Change
**Criteria:** 1-2 files changed in a single layer (frontend-only or backend-only)

**Examples:**
- One screen updated
- One endpoint adjusted
- One nav item added

**Action:**
- Run targeted refresh of affected docs only
- Refresh relevant trace chain
- Update findings if mapping changed

### Medium Change
**Criteria:** 3-10 files changed, or changes span multiple layers

**Examples:**
- A module expanded (new page + new API calls)
- Several routes added
- Service logic altered
- Workflow step introduced

**Action:**
- Refresh all related audits
- Refresh module graphs
- Refresh coverage matrix
- Update findings and repair blueprint

### Large Change
**Criteria:** 10+ files changed, or new module/major refactor

**Examples:**
- New module added
- Major route refactor
- Backend reorganization
- Permission system changes
- Workflow rearchitecture

**Action:**
- Perform full audit
- Regenerate all docs
- Re-evaluate all module statuses
- Rebuild top-level system graphs

## CI Integration Rules

```yaml
# Structural file patterns for CI trigger
structural_paths:
  - "frontend/trader-ui/src/App.tsx"
  - "frontend/trader-ui/src/pages/**"
  - "frontend/trader-ui/src/components/Sidebar.tsx"
  - "frontend/trader-ui/src/components/Navbar.tsx"
  - "frontend/trader-ui/src/layouts/**"
  - "frontend/trader-ui/src/lib/api.ts"
  - "frontend/trader-ui/src/stores/**"
  - "apps/trader_app/trader_app/api/**"
  - "apps/trader_app/trader_app/hooks.py"
  - "apps/trader_app/trader_app/setup/**"
```

When a PR modifies any of the above paths, the CI pipeline must:

1. Run `npm run audit:architecture` (or targeted variant)
2. Check if `/docs` files are up to date
3. Report any newly introduced gaps as PR comments
4. Block merge if release-blocking issues are found (as defined in `architecture-audit-policy.md`)

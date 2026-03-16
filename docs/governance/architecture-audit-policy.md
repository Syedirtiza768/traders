# Architecture Audit Policy

## Purpose

This document defines the governance rules for maintaining architecture documentation as a first-class build artifact in the Traders repository. Architecture documentation must remain continuously synchronized with the codebase so that the `/docs` directory always provides a trustworthy, repository-grounded view of the system's structure.

Stale architecture documentation is treated as an **engineering governance problem**, not a cosmetic issue.

## Scope

This policy applies to all structural components of the Traders platform:

| Layer | Scope |
|---|---|
| **Frontend** | Pages, routes, navigation items, layouts, components, forms, user actions |
| **Frontend API** | All `api.ts` call sites — `authApi`, `dashboardApi`, `resourceApi`, `inventoryApi`, `reportsApi` |
| **Backend** | Frappe whitelisted methods in `trader_app/api/`, hooks, scheduled tasks |
| **Services** | Business logic functions in API modules, seed engine, demo generators |
| **Entities / Tables** | ERPNext DocTypes accessed via `frappe.db.sql`, `frappe.get_doc`, `resourceApi` |
| **Workflows** | Document lifecycle (Draft → Submit → Cancel), payment flows, inventory movements |
| **Permissions** | `ProtectedRoute` guard, Frappe session auth, CSRF tokens, role fixtures |
| **Infrastructure** | Docker Compose, Nginx, build config |

## Trigger Conditions

A documentation refresh **must** be triggered when any of the following changes occur:

### Frontend Structural Changes
- New or deleted page/route in `App.tsx`
- Changed navigation items in `Sidebar.tsx`
- Changed layout registration in `DashboardLayout.tsx`
- New or modified form/action wiring in any page component
- Changed frontend API client usage in `lib/api.ts` or page-level call sites
- Changed module registration or RBAC-driven visibility

### Backend Structural Changes
- New or deleted `@frappe.whitelist()` endpoint in `trader_app/api/`
- Changed route path or method signature
- Changed request/response shape
- Changed service behavior or business logic
- Changed repository/entity/model access patterns
- Changed workflow/job/event handler in `hooks.py`
- Changed permission/guard/role logic in fixtures

### Cross-Layer Changes
- New module added (frontend page + backend API)
- Workflow evolution (new document states or transitions)
- Renamed domain object or DocType reference
- Changed route-to-endpoint mapping
- Changed screen-to-service relationship
- Changed seed/demo capability exposure

## Required Outputs

Every audit run must produce or refresh the following documentation artifacts:

### Inventories (Phase 1)
| File | Content |
|---|---|
| `docs/audits/frontend-screen-inventory.md` | Every screen, route, layout, actions, status |
| `docs/audits/navigation-audit.md` | Every navigation item and reachability |
| `docs/audits/frontend-actions-audit.md` | All forms, buttons, handlers, mutations |
| `docs/audits/frontend-api-mapping.md` | All frontend API calls and origins |
| `docs/audits/backend-endpoints.md` | All backend routes, handlers, services |
| `docs/architecture/service-layer-map.md` | Business logic mapping |
| `docs/architecture/database-entity-map.md` | Entities/tables and usage |

### Reconciliations (Phase 2)
| File | Content |
|---|---|
| `docs/audits/frontend-backend-mapping.md` | UI ↔ API reconciliation |
| `docs/audits/workflow-coverage.md` | Workflow completeness |
| `docs/audits/dead-path-audit.md` | Dead routes, endpoints, components |
| `docs/audits/architecture-findings.md` | Risk and issues register |

### System Graphs (Phase 3)
| File | Content |
|---|---|
| `docs/system-graphs/erp-system-graph.md` | Top-level system graph |
| `docs/system-graphs/module-traceability.md` | Per-module traceability chains |
| `docs/system-graphs/navigation-graph.md` | Navigation structure |
| `docs/system-graphs/workflow-graphs.md` | ERP workflow diagrams |

### Repair Plan (Phase 5)
| File | Content |
|---|---|
| `docs/architecture/repair-blueprint.md` | Prioritized fix plan |

## Review Expectations

During **every pull request** that modifies structural files:

1. Reviewer must verify relevant `/docs` files were updated
2. No new route may exist without a `frontend-screen-inventory.md` entry
3. No new endpoint may exist without a `backend-endpoints.md` entry
4. No new screen may exist without navigation entry or explicit justification
5. No new mutation action may exist without UI → API mapping
6. No new workflow step may exist without `workflow-coverage.md` update
7. No new permission gating may exist without `permission-visibility-map.md` update

If docs are stale relative to code changes, the PR must be marked as **architecture documentation incomplete**.

## Release Gates

The following issues are **release-blocking** unless explicitly waived:

| Blocker | Description |
|---|---|
| **Missing backend mapping** | Screen exists but no backend mapping for required write action |
| **Orphan endpoint** | Backend endpoint for major business flow has no UI reachability and no internal-only justification |
| **Broken navigation** | Navigation points to missing or broken route |
| **Incomplete workflow** | Major workflow has missing step |
| **Permission mismatch** | Visible UI does not match backend guard |
| **Orphan critical service** | Critical business service with no reachable trigger |
| **Stale docs** | Architecture docs clearly stale after structural refactor |

Release blockers must be documented in `docs/audits/architecture-findings.md`.

## Responsibility

| Role | Responsibility |
|---|---|
| **Developer** | Run `npm run audit:architecture` before submitting PRs affecting structural files |
| **Reviewer** | Verify `/docs` alignment during PR review |
| **CI System** | Automatically run audit on PRs touching structural paths |
| **Tech Lead** | Review `architecture-findings.md` before each release |

## Audit Frequency

| Trigger | Scope |
|---|---|
| Every PR affecting structural files | Targeted refresh |
| Every merge to `main` | Full or partial audit based on change scope |
| Pre-release | Full audit with manual verification |
| On-demand | `npm run audit:architecture` |

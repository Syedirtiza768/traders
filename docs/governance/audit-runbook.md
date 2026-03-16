# Architecture Audit Runbook

## Purpose

This runbook documents the exact procedure for executing an architecture audit of the Traders repository. It defines the phases, data collection order, reconciliation steps, expected outputs, and fallback rules.

## Prerequisites

- Node.js 18+ installed
- Repository cloned with full history
- Access to `frontend/trader-ui/src/` and `apps/trader_app/trader_app/`

## Execution Commands

### Full Audit
```bash
npm run audit:architecture
```

### Targeted Audits
```bash
npm run audit:frontend      # Phase 1 frontend inventory only
npm run audit:backend       # Phase 1 backend inventory only
npm run audit:workflows     # Workflow coverage audit
npm run audit:graphs        # Regenerate system graphs only
```

---

## Phase 1 — Inventory Refresh

**Goal:** Rebuild all inventories from repository-derived facts only. No assumptions.

### Step 1.1 — Scan Routes
**Script:** `scripts/architecture-audit/scan-routes.mjs`

**Data Sources:**
- `frontend/trader-ui/src/App.tsx` — all `<Route>` elements

**Collection Method:**
1. Parse `App.tsx` for all `<Route path="..." element={...} />` entries
2. Extract: path, component name, guard (ProtectedRoute), nesting
3. Identify catch-all redirects (`path="*"`)

**Output:** Route inventory table with columns: Path, Component, Guard, Layout, Status

### Step 1.2 — Scan Navigation
**Script:** `scripts/architecture-audit/scan-navigation.mjs`

**Data Sources:**
- `frontend/trader-ui/src/components/Sidebar.tsx` — `navItems` and `bottomItems` arrays

**Collection Method:**
1. Parse Sidebar.tsx for `navItems` and `bottomItems` array definitions
2. Extract: `to` (path), `label`, `icon`, section (Main Menu / System)
3. Cross-reference against route inventory

**Output:** Navigation inventory with reachability status

### Step 1.3 — Scan Frontend API Calls
**Script:** `scripts/architecture-audit/scan-frontend-api.mjs`

**Data Sources:**
- `frontend/trader-ui/src/lib/api.ts` — all API namespaces and methods
- `frontend/trader-ui/src/stores/authStore.ts` — auth API usage
- `frontend/trader-ui/src/pages/*.tsx` — page-level API call sites

**Collection Method:**
1. Parse `api.ts` for all exported API objects (`authApi`, `dashboardApi`, etc.)
2. For each API method, extract: HTTP method, endpoint URL, parameters
3. Scan page files for which APIs they import and call

**Output:** Frontend API call inventory with origin screens

### Step 1.4 — Scan Backend Endpoints
**Script:** `scripts/architecture-audit/scan-backend-endpoints.mjs`

**Data Sources:**
- `apps/trader_app/trader_app/api/dashboard.py`
- `apps/trader_app/trader_app/api/inventory.py`
- `apps/trader_app/trader_app/api/reports.py`

**Collection Method:**
1. Parse each Python file for `@frappe.whitelist()` decorated functions
2. Extract: function name, dotted path, parameters, docstring
3. Map to Frappe API URL pattern: `/api/method/{dotted_path}`
4. Identify helper functions (not whitelisted)

**Output:** Backend endpoint inventory with parameters and docstrings

### Step 1.5 — Scan Services and Entities
**Scripts:**
- `scripts/architecture-audit/scan-services.mjs`
- `scripts/architecture-audit/scan-entities.mjs`

**Data Sources:**
- All Python files in `apps/trader_app/trader_app/`
- All `frappe.db.sql` queries
- All `resourceApi.list({ doctype: ... })` calls in frontend

**Collection Method:**
1. Extract all `frappe.db.sql` table references (pattern: `` `tabXxx` ``)
2. Extract all `resourceApi.list/get/create/update/delete` doctype references
3. Map business logic functions to the entities they access

**Output:** Service-layer map and database entity map

### Step 1.6 — Scan Workflows
**Script:** `scripts/architecture-audit/scan-workflows.mjs`

**Data Sources:**
- `hooks.py` — doc_events, scheduled tasks
- Backend API functions — document lifecycle queries
- Frontend pages — status displays, action buttons

**Collection Method:**
1. Identify document lifecycle patterns (docstatus = 0/1/2 for Draft/Submitted/Cancelled)
2. Map payment flows (Payment Entry → Invoice reconciliation)
3. Map inventory flows (Purchase → Stock → Sale)

**Output:** Workflow coverage inventory

---

## Phase 2 — Bidirectional Reconciliation

**Goal:** Match every structural relationship and report all gaps.

### Step 2.1 — Navigation ↔ Route Reconciliation
- Every `navItems` entry must have a matching `<Route>` in `App.tsx`
- Every `<Route>` should ideally have a navigation entry (or explicit justification)
- Report: orphan nav items, unreachable routes

### Step 2.2 — Route ↔ Screen Reconciliation
- Every `<Route>` must point to an existing page component
- Every page component should be referenced by at least one route
- Report: missing components, orphan pages

### Step 2.3 — Screen/Action ↔ Frontend API Reconciliation
- Every page that displays data must import and call an API
- Every action button (New, Save, Delete, Export) should have an API mapping
- Report: screens with no API, buttons with no handlers

### Step 2.4 — Frontend API ↔ Backend Endpoint Reconciliation
- Every `api.ts` method URL must have a corresponding `@frappe.whitelist()` function
- Every whitelisted backend function should be reachable from the frontend
- Report: orphan frontend calls, orphan backend endpoints

### Step 2.5 — Endpoint ↔ Service/Entity Reconciliation
- Every backend endpoint should use services or direct DB access
- Every entity access should be traceable to an endpoint or internal process
- Report: endpoints with no DB access, entities with no API exposure

### Step 2.6 — Permission ↔ Guard Reconciliation
- `ProtectedRoute` in frontend must align with `@frappe.whitelist()` (authenticated-only) in backend
- Role fixtures in `hooks.py` should map to actual usage
- Report: permission gaps

---

## Phase 3 — System Graph Regeneration

**Script:** `scripts/architecture-audit/generate-mermaid.mjs`

**Regenerate whenever Phase 1 or Phase 2 outputs change.**

### Required Graphs:
1. **Overall Architecture** — NAV → ROUTE → SCREEN → ACTION → API → ENDPOINT → SERVICE → DB
2. **Navigation Graph** — Sidebar items → routes → screens
3. **Module Graphs** — Per-module (Sales, Purchases, Inventory, Finance, Reports, CRM, Settings)
4. **Workflow Graphs** — Sales flow, Purchase flow, Payment flow, Inventory flow
5. **Broken Path Graph** — If critical gaps exist

---

## Phase 4 — Findings and Risk Refresh

After reconciliation, update `docs/audits/architecture-findings.md`:

1. Classify each issue:
   - **New** — First detected in this audit
   - **Resolved** — Previously reported, now fixed
   - **Unchanged** — Still present, same severity
   - **Worsened** — Severity increased

2. Severity levels:
   - **Critical** — Release-blocking
   - **High** — Should fix before next release
   - **Medium** — Should fix within next 2 sprints
   - **Low** — Cleanup / cosmetic

3. Required sections:
   - Current Critical Issues
   - Current High Issues
   - Newly Introduced Issues
   - Recently Resolved Issues
   - Needs Manual Verification

---

## Phase 5 — Repair Blueprint Refresh

Update `docs/architecture/repair-blueprint.md` with:

1. **Immediate Fixes** — Can be done now, low risk
2. **Next Sprint Fixes** — Require planning, moderate complexity
3. **Structural Refactors** — Architecture-level changes
4. **Cleanup Work** — Dead code removal, naming standardization
5. **Documentation Gaps** — Manual review items

---

## Fallback Rules

| Situation | Fallback |
|---|---|
| Cannot determine if endpoint is used | Mark as `⚠️ Needs Manual Review` |
| Cannot parse a file (syntax error) | Log warning, skip file, note in findings |
| Ambiguous route-to-API mapping | Mark as `🔍 Inferred` with explanation |
| New file type not covered by scanners | Note as `📋 Scanner Gap` in findings |
| Conflicting information between layers | Report both versions, mark as `⚠️ Conflict` |

## Escalation Rules

| Condition | Escalation |
|---|---|
| 3+ Critical issues found | Alert tech lead immediately |
| New release-blocking issue | Block release pipeline |
| Scanner cannot complete | Fall back to manual audit for affected scope |
| More than 20% of mappings are `Inferred` | Request architecture review meeting |

## How to Mark "Needs Manual Review"

Use the following format in any audit document:

```markdown
| Item | Status |
|---|---|
| Sales Invoice create action | ⚠️ Needs Manual Review — Button exists but handler is a placeholder |
```

Valid status markers:
- ✅ Verified
- ⚠️ Needs Manual Review
- 🔍 Inferred
- ❌ Missing
- 🔴 Broken
- 📋 Not Scanned

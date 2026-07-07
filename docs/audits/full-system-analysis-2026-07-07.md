# Traders — Full-System Analysis

**Date:** 2026-07-07 · **Scope:** entire monorepo + running local stack + Sales Lifecycle Extension (Phases 0–5)
**Method:** direct code inspection, live-container queries, security greps, cross-reference with the repo's own audit register.

---

## 1. Executive summary

Traders is a **multi-tenant business-management SaaS** built as a thin-but-substantial extension layer
(`trader_app`, ~19.5k LOC Python) over **Frappe/ERPNext**, with a fully custom **React SPA**
(`trader-ui`, ~31.9k LOC TS/TSX) replacing the Frappe desk for business users. It runs as a
12-container Docker stack locally and deploys to EC2/Ubuntu via scripts.

**Overall verdict:** architecturally sound and unusually well-documented for its size, with a
clean tenant-isolation design in the application layer and a newly completed config-driven sales
lifecycle extension. The dominant risks are **operational, not architectural**: ~30 files of
verified but uncommitted work, code hot-copied into an ephemeral container layer, a thin
automated-test safety net relative to 230 whitelisted endpoints, and a handful of authorization
gaps (two of them in the brand-new extension code).

| Dimension | Grade | One-line justification |
|---|---|---|
| Architecture & layering | **A−** | Clear core/extension boundary; config-not-code enforced (audit: 0 hits) |
| Multi-tenant isolation | **B+** | Solid app-layer design; shared-DB model means every endpoint must opt in correctly |
| Security posture | **B−** | Parametrized SQL in sampled sites, no guest endpoints; but authz gaps + tracked cookie file |
| Test coverage | **C** | 4 backend + 2 frontend test files vs 230 endpoints; extension verified by deleted self-tests only |
| Documentation | **A** | Auto-audit pipeline, architecture maps, live findings register |
| Operational durability | **D → must fix** | Phases 0–5 uncommitted; container code layer ephemeral |

---

## 2. System architecture

```
┌────────────────────────── Docker (compose/) ──────────────────────────┐
│  proxy :8080 ──► frontend :3000 (nginx + built SPA)                    │
│      │                                                                 │
│      └────► backend :8000 (gunicorn, Frappe) ◄── websocket :9000       │
│                │           workers: default / short / long, scheduler  │
│                ▼                                                       │
│         MariaDB (db)          Redis cache · Redis queue                │
│         volumes: sites-vol, logs-vol   (code is BAKED INTO IMAGE)      │
└────────────────────────────────────────────────────────────────────────┘
```

**Layers**
1. **Core (upstream, untouched):** Frappe framework + ERPNext (documents, GL, stock, permissions, workflow, print).
2. **Extension (`apps/trader_app`):** 35 API modules (230 whitelisted endpoints), 20 custom DocTypes
   (module `Trader`), custom fields on ERPNext doctypes, doc_events hooks, demo-data engine,
   multi-tenant platform (`Trader Tenant`, super-admin APIs, tenant guard).
3. **SPA (`frontend/trader-ui`):** React 18 + Vite + Zustand + Tailwind + Recharts; ~75 pages incl.
   a super-admin console; 3 stores (auth, company, tenant); central `lib/api.ts` client.
4. **Infra:** compose files (dev/prod), nginx configs (`infra/nginx`, incl. `enxi.realtrackapp.com`),
   EC2/Ubuntu deploy + redeploy scripts, backup script.
5. **Docs pipeline:** `npm run progress:sync`, architecture-audit scripts regenerating
   `docs/audits/*` and `docs/IMPLEMENTATION_PROGRESS.md`.

**Multi-tenancy model:** single Frappe site, **shared database**; tenant = `Trader Tenant` doctype
1:1 with `Company`; users pinned via `User.trader_tenant`. Isolation is enforced **in the
application layer**: `resolve_active_company` / `assert_document_company_access`
([api/company.py](../../apps/trader_app/trader_app/api/company.py)), tenant scoping
([api/tenant.py](../../apps/trader_app/trader_app/api/tenant.py)), and per-module guards
(`_tenant_guard.apply_module_guards`, applied in 18 of 35 API modules — the rest are platform
modules with their own `_require_super_admin`-style checks, plus the new extension modules, see §5).
There is **no DB-level row security**; correctness depends on every endpoint routing through the
guards. This is a reasonable SaaS pattern at this scale but makes endpoint review the critical
security activity.

---

## 3. Backend analysis (`apps/trader_app`)

**Shape:** 19,490 LOC Python. Largest modules: `reports.py` (2,332), `daybook.py` (1,028),
`catalog.py` (1,011), `sales.py` (880). Domain coverage: sales, purchases, inventory, finance,
POS, GST, currency, bundling, day-book (components trading), dashboards, reporting, printing,
tenant platform, and the new lifecycle extension.

**Strengths**
- Consistent endpoint pattern: whitelist → `resolve_active_company` → parametrized SQL/ORM → dict payload.
- Raw SQL (199 call sites) samples checked (`customers.py`, `daybook.py`) interpolate only
  **clause skeletons built from literals**; user values go through `%(param)s` binding. No guest
  endpoints (`allow_guest` appears only in the guard's own metadata list).
- Feature flags per company (multi-currency, components trading) and per tenant (module toggles) —
  the config-not-code culture predates the new extension.
- `hooks.py` doc_events give clean interception points (validate/submit/cancel for SI/PI/PE/SE).

**Weaknesses**
- 39 `ignore_permissions=True` sites in `api/` — each is a spot where Frappe's permission model is
  bypassed on purpose; justified for platform provisioning, but they deserve an inventory.
- `reports.py` is a 2.3k-LOC monolith of hand-written SQL — the highest-maintenance surface.
- Known duplication (`_get_default_company` ×3 — FIND-12 in the repo's own register).
- Only 4 backend test files (`test_daybook`, `test_seed_super_admin`, `test_tenant_guard`,
  `test_tenant_isolation`). Tenant isolation is tested — good instinct — but sales/purchase/finance
  flows and all Phase 0–5 engines have **no persistent automated tests**.

---

## 4. Security posture

**Good:** no guest endpoints; parametrized SQL in sampled hot paths; role-gated settings writes;
platform APIs require super-admin; suspension disables tenant users; audit + decision logs are
append-only for non-admins.

**Findings (new, from this analysis):**

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| SA-01 | **High (ops)** | Phases 0–5 (30 files: 10 API modules, 13 DocTypes, hooks, custom fields, design doc) are **uncommitted** and the container copy lives in an **ephemeral image layer**. A `git clean`/checkout or image rebuild-from-repo loses or desyncs it. | `git status --porcelain` = 30 entries |
| SA-02 | ~~Medium~~ **FIXED 2026-07-07** | `compose/auth_cookies.txt` was **tracked in git with a session `sid`** despite a matching `.gitignore` rule (it predated the rule). **Fix:** `git rm --cached compose/auth_cookies.txt` (file kept on disk, now ignored). Root `cookies.txt` was already untracked. Rotate the demo session for good measure. | `git ls-files` + file contents |
| SA-03 | ~~Medium~~ **FIXED 2026-07-07** | `decision_log.get_decision_trace` queried via `frappe.get_all` (bypasses user permissions) **without a company/tenant check** → cross-tenant read of decision traces. **Fix:** now asserts access to the referenced document's company and filters returned rows to the user's permitted companies. | [api/decision_log.py](../../apps/trader_app/trader_app/api/decision_log.py) |
| SA-04 | ~~Medium~~ **FIXED 2026-07-07** | `process.get_state_model` accepted any company without an access check; `process.transition_state` never asserted company scope. **Fix:** `get_state_model` now calls `user_can_access_company`; `transition_state` calls `assert_document_company_access`. | [api/process.py](../../apps/trader_app/trader_app/api/process.py) |
| SA-05 | **Low** | 39 × `ignore_permissions=True`; `frappe.db.sql` clause-skeleton interpolation is safe in sampled sites but unreviewed across all 199 call sites (esp. any `order_by`/column interpolation in `reports.py`). | grep counts |

*(SA-03/SA-04 are in code written this session — they need a `resolve_active_company`-style guard
before this ships beyond local.)*

---

## 5. Sales Lifecycle Extension (Phases 0–5) — state assessment

All six phases shipped and functionally verified on `trader.localhost` (see
[SALES_LIFECYCLE_EXTENSION_DESIGN.md](../SALES_LIFECYCLE_EXTENSION_DESIGN.md) §6 for the per-phase
record). Architecture audit (`migration_toolkit.audit_hardcoded_branches`) returns **clean — zero
company/tenant literals** in the API layer, objectively validating the config-not-code principle.

| Layer | Artifacts | Opt-in guarantee |
|---|---|---|
| Config store | `Trader Config Pack` + `config_store.py` (fixed the Redis-only GST landmine) | DocType is source of truth; cache is read-through |
| Decisions | `Trader Decision Log` + `decision_log.py` (+ trace endpoint) | log failures never break business flow |
| Rules | `Trader Validation Rule` + `rules.py` (safe JSON-logic, no `eval`) | no rules → no-op |
| States | `Trader Process Profile/State/Transition` + `process.py` | requires `is_active` **and** `enforce_states` |
| Grouping | `Trader Grouping Policy` + `grouped_invoicing.py` (dual consumption tracking) | defaults mirror legacy behavior |
| Tax/WHT/FX | 3 policy DocTypes + `tax_policy.py` / `fx_policy.py` | no policy → no-op; local currency ignored |
| Posting/Docs | `Trader Posting Profile` / `Trader Template Map` + `posting.py` (balanced dry-run) / `templates.py` | posting profile inactive unless enabled |
| Migration | `migration_toolkit.py` — idempotent provisioning, parity report (passing), architecture audit | provisions everything inert |

**Gaps in the extension (honest list):**
1. SA-03 / SA-04 authorization hardening (above).
2. Self-tests were run-then-deleted by design → **no persistent regression suite**; the PRD's
   "golden documents" suite (§11) is still owed.
3. Frontend workstream not started: config-admin pages, decision-trace ("why") view,
   dual-control posting approval.
4. `apply_tax_policy` sets `doc.flags.trader_tax_inclusive` but nothing consumes the inclusive
   flag yet (row-level `included_in_print_rate` mapping is future work).
5. FX custom fields exist on Sales Invoice only — Quotation/DN snapshots would need the same
   fields when the clause is wanted earlier in the lifecycle.

---

## 6. Frontend analysis (`frontend/trader-ui`)

**Shape:** 31,869 LOC TS/TSX; React 18 + Vite 5 + TS 5.5 + Zustand + Tailwind + Recharts + Axios;
~75 page components incl. a super-admin console (tenant CRUD, dashboard, detail); Vitest present
with exactly **2 unit-test files** (`tenantBranding`, `tenantModules`).

**Strengths:** modern lean stack (no heavyweight state/query libs), separation of stores/lib/pages,
tenant-branding + module-gating logic unit-tested, print pipeline page, extensive domain coverage
(sales/purchase document hubs, day-book, stock ops, GST settings, role management).

**Weaknesses (per the repo's own live register, `architecture-findings.md`, 2026-07-07):**
FIND-01 Settings page has no backend wiring (critical); FIND-02..05 create buttons without
handlers on some list pages; FIND-06 **no role-based sidebar visibility** (roles exist in fixtures
but UI shows everything to everyone); FIND-07..11 orphaned endpoints, dead Filter/Export buttons,
non-functional global search/notification bell. None of the new Phase 0–5 backend surfaces have UI.

---

## 7. Live data & platform state (local site)

3 tenants · 3 companies · 11 enabled users · 808 sales invoices · 856 items (demo-dominated) ·
20 `Trader` DocTypes (7 pre-existing + 13 from Phases 0–5) · Electrance (TNT-0015) provisioned with
inert migrated config packs, admin `bilal@electrance.local` (Trader Admin).

---

## 8. Deployment & operations

- **Local:** compose stack healthy; first-run bootstrap via backend entrypoint; demo installer.
- **Prod:** EC2/Ubuntu scripts (`setup-ec2-ubuntu.sh`, `redeploy-*.sh`, `deploy.sh`), prod compose,
  nginx vhost for `enxi.realtrackapp.com`, `backup.sh`.
- **Key facts:** application code is **baked into the image** (only `sites`/`logs` are volumes);
  DB schema/migrations persist in the sites volume; the Phase 0–5 code currently running was
  hot-copied via `docker cp` — an image rebuild from the repo is required for durability, and the
  repo must be committed first or the rebuild would *remove* the extension from the running stack
  while leaving its schema in the DB (a nasty desync).
- **CI:** `.github/` exists; progress-check script offers a drift gate; no evidence of a test gate.

---

## 9. Prioritized risk register

| # | Risk | Likelihood | Impact | Action |
|---|---|---|---|---|
| 1 | Uncommitted Phases 0–5 lost or image rebuilt without them (schema/code desync) | High | Severe | **Commit to branch now**, then rebuild image from repo |
| 2 | ~~SA-03/SA-04 cross-tenant reads via new endpoints~~ **FIXED 2026-07-07** | — | — | Company guards added on the three endpoints |
| 3 | No regression suite over 230 endpoints + new engines | High | High | Convert phase self-tests into permanent `tests/`; golden documents per PRD §11 |
| 4 | Tracked session-cookie file (SA-02) | Low (stale) | Medium | `git rm --cached compose/auth_cookies.txt cookies.txt`, extend .gitignore |
| 5 | Role-based UI visibility absent (FIND-06) | High | Medium | Gate sidebar/routes on `get_current_user_roles` |
| 6 | `reports.py` monolith + 199 raw SQL sites | Medium | Medium | Incremental review; extract query builders |
| 7 | Settings page dead-end (FIND-01) + dead buttons | High | Low-Med | Frontend wiring sprint |

## 10. Recommended sequence

1. **Commit everything** (branch `feature/sales-lifecycle-extension`), then rebuild backend image
   from the repo so container == git.
2. **Harden SA-03/SA-04** (one small PR: guards on `get_decision_trace`, `get_state_model`,
   `transition_state`) and untrack the cookie files (SA-02).
3. **Persist the test suite:** resurrect the five phase self-tests as `apps/trader_app/tests/test_lifecycle_*.py`
   and add the golden-document parity suite.
4. **Frontend workstream:** role-gated nav (FIND-06), Settings wiring (FIND-01), then the extension
   UI (config admin, grouped-invoice builder over `get_invoiceable_delivery_notes`, decision-trace view).
5. **Server migration for Electrance** (the original plan: "locally first, shift to server later")
   — after 1–3, it's a clean `git pull + compose build + bench migrate + provision_config_packs`.

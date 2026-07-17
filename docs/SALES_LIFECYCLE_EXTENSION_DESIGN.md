# Configurable Sales Lifecycle Extension — Grounded Design

**Feature theme:** Quotation → Delivery Challan → Grouped Invoice → Posting
**Target tenant:** Electrance (`TNT-0015`), then reusable across all tenants
**Status:** Design / gap analysis (pre-implementation)
**Author:** Engineering
**Companion to:** the product PRD "Configurable Sales Lifecycle Extension"

## Related docs (vault)

- [[ARCHITECTURE]] — system topology this extension layers onto (Frappe/ERPNext + trader-ui)
- [[repository-architecture]] — repo zones and tech stack referenced throughout §2–4
- [[database-entity-map]] — existing DocTypes the new config packs (§2) extend
- [[module-traceability]] — Sales module nav→API→DB chain that FR-1/FR-7 hook into
- [[architecture-findings]] — live findings register; cross-check before marking a phase shipped
- [[full-system-analysis-2026-07-07]] — full-system audit covering Phases 0–5 of this design
- [[IMPLEMENTATION_PROGRESS]] — tracker to update as phases in §6 land
- [[RISK_REGISTER]] — financial/posting risks relevant to Phase 4 (posting profiles)

---

## 0. The one decision this document exists to make

The PRD is written against an abstract "core system." In this repository the core is
**Frappe Framework + ERPNext**, and `apps/trader_app` is **already the extension layer**.
That reframes the whole PRD:

> **We do not build a parallel config/rule/workflow runtime. We express tenant-specific
> behavior as _data_ in tenant-scoped config DocTypes and Frappe-native primitives
> (Workflow, Custom Field, Print Format, doc_events, Server Script), and we forbid
> `if company == "..."` branches in `trader_app`.**

Frappe already provides every "core responsibility" the PRD lists (§6 of the PRD):

| PRD "Core responsibility" | Provided today by |
| --- | --- |
| Generic workflow engine | Frappe **Workflow** DocType (states + transitions + role guards) |
| Generic document framework | Frappe DocType + child tables |
| Generic rule execution runtime | Frappe **Server Script** / validation hooks + `doc_events` |
| Generic posting/event bus | ERPNext GL posting + Frappe `doc_events` |
| Generic template renderer | Frappe **Print Format** (Jinja) |
| Security / permissions / audit | Frappe roles, permissions, Version/audit |

So the engineering work is **not** "build a framework." It is: (a) fill the specific
gaps ERPNext leaves, and (b) move the config that currently lives in ad-hoc places into
a **durable, tenant-scoped, auditable config-pack model**.

---

## 1. Grounded gap analysis (PRD hypothesis vs. reality)

The PRD §4 makes hypotheses about "likely core gaps." Several are already solved by
ERPNext; a few are real; one existing implementation is a **data-durability landmine**.

| # | PRD area | PRD's guess | **Actual state in this repo** | Verdict |
| --- | --- | --- | --- | --- |
| A | Lifecycle states | "no DC-grouped invoice lifecycle" | ERPNext ships Quotation, Sales Order, **Delivery Note (=DC)**, Sales Invoice, all wrapped by tenant-scoped APIs in [`api/sales.py`](apps/trader_app/trader_app/api/sales.py). Frappe **Workflow** DocType exists but is **unused** — the workflow fixture is deliberately commented out in [`hooks.py:49`](apps/trader_app/trader_app/hooks.py). | **Partial gap** — engine exists, no workflows defined |
| B | Nested data model | "core may stop at line level" | Correct. ERPNext is header→line. There is **no** line→option→item nesting. `Item Bundle`/`Item Bundle Detail` ([`trader/doctype/`](apps/trader_app/trader_app/trader/doctype/)) is a product-kit concept, not quotation options. No `qty_invoiced` consumption counter. | **Real gap** |
| C | Validation rules | "fixed validation hooks only" | Correct. Rules are hardcoded Python: credit-limit + stock checks in [`sales.py:validate_sales_invoice`](apps/trader_app/trader_app/api/sales.py) and `_ensure_stock_available`. No declarative rule definitions, no bypass flag/role. | **Real gap** |
| D | Tax logic (GST/WHT) | "core tax tables exist but branch logic remains" | GST templates & tax accounts exist ([`api/gst.py`](apps/trader_app/trader_app/api/gst.py), `seed_punjab_gst_templates`). **BUT** GST config is stored **only in Redis cache** (`frappe.cache().set_value` in `_read_gst_config`/`save_gst_settings`) — **not durable, lost on cache flush.** No WHT engine, no effective-dating, no customer-category/jurisdiction dimensions. | **Real gap + data-loss risk** |
| E | FX handling | "only currency support, no snapshot clause" | Correct. [`api/currency.py`](apps/trader_app/trader_app/api/currency.py) sets `conversion_rate` via ERPNext's `get_exchange_rate`. No rate-clause snapshot semantics, no validity date, no print mode (local/both/foreign). | **Real gap** |
| F | Accounting posting | "hardcoded accounts / event handlers" | Posting is ERPNext-default. `on_sales_invoice_submit` ([`sales.py`](apps/trader_app/trader_app/api/sales.py)) only fires a realtime event — no configurable account mapping, no dry-run preview, no posting profile. | **Real gap** (but ERPNext GL engine is the substrate) |
| G | Documents / print | "static templates" | Print Format resolution per invoice type exists ([`api/printing.py`](apps/trader_app/trader_app/api/printing.py), `print_format_for_doc` in [`invoice_types.py`](apps/trader_app/trader_app/api/invoice_types.py)). Tokenized/conditional blocks and per-customer-profile variants are not modeled. | **Partial gap** |

### Config fragmentation (the root problem)

Tenant configuration is scattered across three incompatible stores today:

- **Trader Tenant** DocType JSON fields — `enabled_modules` (child table), `workflow_prefs` (JSON), `branding` (JSON). Durable. See [`trader/doctype/trader_tenant/`](apps/trader_app/trader_app/trader/doctype/trader_tenant/).
- **ERPNext native** — currency/`conversion_rate`, tax templates, accounts.
- **Redis cache only** — GST config (`trader_gst_config::<company>`). **Non-durable.**

The PRD's config model (§7) is the fix: one coherent, durable, tenant-scoped set of
config packs. **This is the foundation and must land first.**

---

## 2. Target architecture — config packs as Frappe DocTypes

Each PRD config surface (§7) becomes a **tenant/company-scoped DocType** in the `Trader`
module. All are plain data; the runtime reads them — it never branches on tenant name.

| PRD config table | New DocType | Scope key | Notes |
| --- | --- | --- | --- |
| `process_profiles` | **Trader Process Profile** | company | Which stages active (quotation/DC/grouped-invoice/OC), mandatory vs optional |
| `state_models` | *(use Frappe **Workflow**)* | doctype+company | Define per doctype; wire the commented-out fixture in `hooks.py` |
| `validation_rules` | **Trader Validation Rule** | company + doctype | scope, condition, message, severity, blocking, bypass_role |
| `tax_policies` | **Trader Tax Policy** | company | mode (none/incl/excl), effective_from/to, service_flag, customer_category, jurisdiction → tax template |
| `wht_policies` | **Trader WHT Policy** | company | selection + rate + account mapping |
| `fx_policies` | **Trader FX Policy** | company | snapshot_trigger (create/finalize/both), validity_days, print_mode |
| `grouping_policies` | **Trader Grouping Policy** | company | same_debtor_required, max_docs_per_group, auto_complete_criteria |
| `posting_profiles` | **Trader Posting Profile** | company + event | event → journal template → account map (sales/AR/tax/WHT) |
| `document_templates` | *(use Frappe **Print Format**)* + **Trader Template Map** | company + doctype + customer_profile | token map + variant selection |
| `feature_flags` | extend **Trader Tenant**.`workflow_prefs` JSON | tenant | quick_quote, revisioning, auto_create_quote_from_dc, etc. |

**Decision log / explainability (PRD FR-10, §12):** one **Trader Decision Log** DocType
(append-only) records every rule/tax/FX/posting decision with `{inputs, matched_policy,
output, timestamp, user}`. This is distinct from the existing **Trader Tenant Audit Log**
(which is tenant *lifecycle* only — see [`api/audit.py`](apps/trader_app/trader_app/api/audit.py)).

### Why DocTypes and not a bespoke JSON blob
- Free permissions, versioning, list views, and admin UX (satisfies PRD §8 auditability + §9 System Config Admin role).
- Fixtures-exportable → **upgrade-safe** across core version bumps (PRD §8).
- Query/precedence resolution in SQL rather than in-memory blob parsing.

---

## 3. Core-vs-extension boundary, made concrete

The PRD's design rule — *"if a requirement is tenant/country/business specific it must be
configuration, never core branch logic"* — becomes an **enforceable checklist** for PRs in
this repo:

1. No `if company ==` / `if tenant ==` in `trader_app/api/*`. Behavior comes from a config DocType lookup.
2. New behavior toggled by a **feature flag** (Trader Tenant `workflow_prefs`) or a config-pack row, defaulted off.
3. Tax %, WHT %, account codes, FX rates, grouping limits: **never literals in code** — always resolved from a policy DocType with effective-dating.
4. Every policy decision writes a **Trader Decision Log** row.
5. All new config DocTypes are added to the `fixtures` list in [`hooks.py`](apps/trader_app/trader_app/hooks.py) so they survive upgrades.

A lightweight guard already exists to build on: [`api/_tenant_guard.py`](apps/trader_app/trader_app/api/_tenant_guard.py) (`apply_module_guards`) — the resolver layer should sit beside it.

---

## 4. FR-by-FR implementation mapping

| PRD FR | Approach in this stack | Primary touch points |
| --- | --- | --- |
| FR-1 Process config | `Trader Process Profile` DocType + resolver; SPA reads it to show/hide stages | new DocType; [`api/sales.py`](apps/trader_app/trader_app/api/sales.py); SPA hub pages `CreateSalesDocumentHubPage.tsx` |
| FR-2 State machine | Define Frappe **Workflow** per doctype; uncomment/author the fixture | [`hooks.py:49`](apps/trader_app/trader_app/hooks.py) fixtures block |
| FR-3 Nested schema | Add `Quotation Option` + `Quotation Option Item` child DocTypes; add `qty_invoiced` custom field on DC/line | new child DocTypes; `setup/custom_fields.py` |
| FR-4 Rule engine | `Trader Validation Rule` evaluated in a shared `run_rules(doc, scope)` called from `doc_events` validate hooks; bypass via role/flag | new module `api/rules.py`; wire in `validate_sales_invoice` |
| FR-5 Tax policy | `Trader Tax Policy` + `Trader WHT Policy` resolver replaces cache-based GST config; **migrate GST config out of Redis into a durable DocType** | rewrite [`api/gst.py`](apps/trader_app/trader_app/api/gst.py) storage layer |
| FR-6 FX policy | `Trader FX Policy`; snapshot `conversion_rate` + clause fields onto doc on configured event; print mode token | [`api/currency.py`](apps/trader_app/trader_app/api/currency.py) `apply_document_currency`; custom fields |
| FR-7 Grouped invoicing | `Trader Grouping Policy` + a `create_grouped_invoice(delivery_notes[])` endpoint built on ERPNext `make_sales_invoice`; track `qty_invoiced` + auto-complete | new endpoint in [`api/sales.py`](apps/trader_app/trader_app/api/sales.py) (today `create_delivery_note` only does ad-hoc `against_sales_invoice` linking, sales.py:702) |
| FR-8 Posting | `Trader Posting Profile` (event→journal template→accounts) + **dry-run preview** endpoint before submit | [`api/finance.py`](apps/trader_app/trader_app/api/finance.py); `on_sales_invoice_submit` |
| FR-9 Documents | Frappe Print Formats + `Trader Template Map` (doctype+customer_profile→format) + token config | [`api/printing.py`](apps/trader_app/trader_app/api/printing.py), [`invoice_types.py`](apps/trader_app/trader_app/api/invoice_types.py) |
| FR-10 Audit/explainability | `Trader Decision Log` append-only DocType + "why" trace view in SPA | new DocType; new SPA page (pattern: `TenantBusinessAuditPage.tsx`) |

---

## 5. Resolved open decisions (PRD §13)

Recommendations, grounded in what Frappe gives us for free:

| Open decision | Recommendation | Rationale |
| --- | --- | --- |
| Rule DSL format | **JSON-logic conditions** stored on `Trader Validation Rule`, with an escape hatch to **Frappe Server Script** for complex cases | JSON-logic is safe/serializable/UI-buildable; Server Script covers the 5% without `eval` risk |
| Posting strictness | **Fail-fast + dry-run preview + dual-control approval** | PRD §11 finance risk; ERPNext GL is transactional — partial posts corrupt AR. Preview first, then atomic submit |
| FX snapshot timing default | **Snapshot on finalize; optionally also on create** (per-policy) | Matches ERPNext's `conversion_rate` lock at submit; quotations can hold an indicative create-time rate under a clause |
| Template engine | **Frappe Print Format (HTML + Jinja tokens)** — no new designer UI in Phase 1 | Already the renderer; `print_format_for_doc` exists; avoids building a parallel engine |
| Backward-compat for existing tenants | **Ship every config pack with a "legacy-equivalent" default**, feature-flagged off; migrate per tenant via a mapping script | PRD §10 Phase 5 + §11 migration parity; new tenants (Electrance) start clean, existing tenants unchanged until opted in |

---

## 6. Rollout sequence (mapped to real files/effort)

Aligned to PRD §10, but ordered so the **durability fixes** and **foundation** land first.

- **Phase 0 — Foundation + de-risk (prerequisite). ✅ SHIPPED (2026-07-07).**
  Delivered:
  - `Trader Config Pack` DocType — durable, company-scoped config store (`trader/doctype/trader_config_pack/`).
  - `Trader Decision Log` DocType — append-only decision trace (`trader/doctype/trader_decision_log/`).
  - `api/config_store.py` — cache-backed resolver (`read_config`/`write_config`/`invalidate`); DocType is source of truth, Redis is only a read cache.
  - `api/decision_log.py` — `log_decision(...)`, never raises.
  - **GST config migrated off Redis-only** onto the durable store (`api/gst.py`), with a one-time lazy migration of any legacy cached value. Landmine fixed — verified config survives a cache flush.

  Note: the new DocTypes are **schema** (part of the app, installed by `bench migrate`) and are intentionally *not* in `hooks.py` `fixtures` — fixtures export records, and config-pack rows are per-tenant environment data, not app data.
- **Phase 1 — State model + nested schema + rule engine.** *(in progress)*
  - **1a — Declarative rule engine. ✅ SHIPPED (2026-07-07).**
    `Trader Validation Rule` DocType + `api/rules.py` (safe JSON-logic evaluator — no `eval`;
    dotted child paths match existentially over rows). Wired into `validate_sales_invoice`
    ([`api/sales.py`](apps/trader_app/trader_app/api/sales.py)) alongside the existing credit-limit
    check. `block`/`warn` severities, per-role bypass, every decision written to Trader Decision Log.
    Rules are opt-in data, so the engine is a no-op (zero behavior change) until an admin authors a rule.
    Verified: zero-qty invoice blocked, valid invoice passes, decisions logged.
  - **1b — Nested schema.** ⏳ Pending. `Quotation Option` + `Quotation Option Item` child DocTypes
    (added to Quotation via Table Custom Fields) + `qty_invoiced` counter on Delivery Note lines.
    The counter is *consumed* by Phase 2 grouped invoicing, so 1b and Phase 2 are best built together.
  - **1c — State machine. ✅ SHIPPED (2026-07-07).** Decision (2026-07-07): **feature-flag-gated,
    opt-in** — *not* a global ERPNext Workflow. `Trader Process Profile` (+ `Trader Process State` /
    `Trader Process Transition` child tables) defines per-company states & transitions; the guard in
    [`api/process.py`](apps/trader_app/trader_app/api/process.py) only acts when a profile has both
    `is_active` and `enforce_states`. `apply_initial_state` (wired into validate for Quotation /
    Delivery Note / Sales Invoice via [`hooks.py`](apps/trader_app/trader_app/hooks.py)) stamps the
    initial state; `transition_state` gates moves by configured transition + required role; every
    decision is logged. New `trader_workflow_state` custom field on the three sales doctypes stays
    blank unless enforced. **Verified: no profile → total no-op (existing tenants safe); opted-in
    company gets initial state + allowed/blocked transitions.**
  - **1b — Nested schema.** ⏳ Deferred into Phase 2 (decision 2026-07-07) — Phase 2 grouped
    invoicing consumes `qty_invoiced`, so they're built together.
- **Phase 2 — Sales lifecycle pack. ✅ SHIPPED (2026-07-07).**
  - **Grouped invoicing (FR-7):** `Trader Grouping Policy` DocType (same-debtor / max-docs /
    partial / auto-submit) + [`api/grouped_invoicing.py`](apps/trader_app/trader_app/api/grouped_invoicing.py).
    `create_grouped_invoice(delivery_notes[])` builds one Sales Invoice from many submitted
    Delivery Challans, enforcing the policy (pure, unit-tested `validate_group`) and logging the
    decision. Consumption tracked two ways: **native** (`delivery_note`+`dn_detail` back-refs →
    ERPNext updates `per_billed`) and **explicit** (`trader_qty_invoiced` counter on the challan
    line). `get_invoiceable_delivery_notes` lists candidates; challans hitting 100% billed are
    reported complete. **Verified E2E:** 2 challans (qty 3+2) → 1 submitted invoice (qty 5),
    both linked, `per_billed`=100, counter=3, both marked complete; same-debtor & max-docs guards fire.
  - **Nested quotation schema (1b / FR-3):** `Quotation Option` + `Quotation Option Item` child
    DocTypes, surfaced on Quotation via the `trader_options` Table custom field (line → option →
    item). `trader_qty_invoiced` custom field added to Delivery Note Item.
- **Phase 3 — Policy packs. ✅ SHIPPED (2026-07-07).**
  - **Tax policy engine (FR-5):** `Trader Tax Policy` DocType (effective window + goods/service /
    customer-category / jurisdiction dimensions → tax mode + ERPNext template) with a pure,
    unit-tested `match_tax_policies`. [`api/tax_policy.py`](apps/trader_app/trader_app/api/tax_policy.py)
    `resolve_tax_policy` / `apply_tax_policy` (validate hook, opt-in) stamp the resolved template;
    `preview_tax` exposes resolution to the SPA. **No hardcoded percentages in the runtime.**
  - **WHT engine (FR-5):** `Trader WHT Policy` DocType (section/rate/account/threshold by party
    type) + `resolve_wht` (threshold-aware; computes the withheld amount). Actual GL posting is
    Phase 4. Verified: below-threshold → none, 5000 @ 4.5% → 225.
  - **FX policy engine (FR-6):** `Trader FX Policy` DocType (snapshot trigger create/finalize/both,
    clause validity days, print mode local/both/foreign) + [`api/fx_policy.py`](apps/trader_app/trader_app/api/fx_policy.py).
    `snapshot_fx` captures `conversion_rate` + clause-valid-until + print mode onto new
    `trader_fx_*` custom fields; wired into Sales Invoice validate (create) and before_submit
    (finalize). **Local-currency documents are ignored.** Verified: USD doc snapshots rate 278.5
    with clause date; PKR doc skipped. All resolutions logged to the Decision Log.

  Gotcha recorded: Frappe derives a doctype's controller class by removing spaces **preserving
  case**, so acronym doctypes need `TraderWHTPolicy` / `TraderFXPolicy` (not `...Wht.../...Fx...`),
  else the doctype silently fails to sync.
- **Phase 4 — Posting + docs + explainability. ✅ SHIPPED (2026-07-07, backend).**
  - **Posting profiles + dry-run (FR-8):** `Trader Posting Profile` DocType (event → receivable /
    income / tax / WHT / cost-center / round-off account map) + [`api/posting.py`](apps/trader_app/trader_app/api/posting.py).
    `apply_posting_profile` (opt-in validate hook) stamps configured accounts; `preview_posting`
    returns a **balanced double-entry dry-run without submitting** (incl. WHT reduction of the
    receivable). **Verified:** preview debit=credit=1000, invoice remained draft.
  - **Template map (FR-9):** `Trader Template Map` DocType (company + doctype + customer profile →
    Print Format) + [`api/templates.py`](apps/trader_app/trader_app/api/templates.py) `resolve_template`
    / `get_document_template`, with graceful fallback. Verified resolution.
  - **Explainability (FR-10):** `get_decision_trace(reference_doctype, reference_name)` in
    [`api/decision_log.py`](apps/trader_app/trader_app/api/decision_log.py) returns every logged
    decision for a document (oldest first) — backend for the "why this amount/state/posting" UI.

  Deferred to the frontend workstream: the SPA trace view and the dual-control posting-approval
  gate (backend hook point exists via posting profile + decision log).
- **Phase 5 — Migration toolkit. ✅ SHIPPED (2026-07-07).**
  [`api/migration_toolkit.py`](apps/trader_app/trader_app/api/migration_toolkit.py):
  - `provision_config_packs(company, activate)` — idempotently creates Tax / Grouping / FX (if
    multi-currency) / Posting / Process packs mirroring the company's legacy defaults.
    **Non-destructive, opt-in** (created inactive/non-enforcing; posting always inactive) so a live
    tenant is unchanged until it activates.
  - `migration_status(company)` — which packs exist and how many are enabled.
  - `parity_report(company)` — compares migrated packs vs the legacy defaults they replace
    (tax template, grouping same-debtor). **Verified passing on Electrance.**
  - `audit_hardcoded_branches()` — the "no tenant logic in core" gate (PRD §11): scans the API
    layer for `company ==` / `tenant ==` literals. **Verified clean (0 hits)** across Phases 0–5.
  Verified: provisioned Electrance's packs (all inert), status shows 0 enabled, parity passed,
  re-provision is idempotent (creates nothing).

---

## 7. Codebase-specific risks (beyond PRD §11)

| Risk | Evidence | Mitigation |
| --- | --- | --- |
| **GST config silently lost** on Redis flush/restart | `save_gst_settings` writes only `frappe.cache()` ([`gst.py`](apps/trader_app/trader_app/api/gst.py)) | Phase 0 durable-DocType migration — do this before layering WHT/effective-dating on top |
| Workflow guards assumed but not present | fixture commented out, `hooks.py:49` | Author workflows explicitly in Phase 1; don't assume states exist |
| Ad-hoc DC↔invoice link bypasses grouping policy | `against_sales_invoice` loop, [`sales.py:702`](apps/trader_app/trader_app/api/sales.py) | Replace with policy-driven `create_grouped_invoice` in Phase 2 |
| Hidden tenant logic re-entering core | large `api/` surface (12k LOC) | Enforce §3 checklist in `/code-review`; grep gate for `company ==` in `trader_app/api` |

---

## 8. Acceptance criteria trace (PRD §12)

Every PRD acceptance criterion is satisfiable **without core (Frappe/ERPNext) modification**,
because all tenant behavior resolves from config DocTypes + Frappe-native primitives:

- Configure full lifecycle w/o code → Process Profile + Workflow.
- Alter tax/FX via config only → Tax/WHT/FX Policy DocTypes.
- Toggle quick-quote / grouped invoicing per tenant → feature flags + Grouping Policy.
- Posting accounts/formulas profile-driven → Posting Profile.
- Decisions explainable → Trader Decision Log + trace UI.
- No core change to onboard a variant → new config-pack rows only.

---

## 9. Status & next step

**Phase 0 is shipped and verified** (see §6). The config-pack store, decision log, and the
durable GST migration are in the codebase and installed on the local `trader.localhost`
site. GST config now survives a Redis flush (previously it did not).

**Deployment note:** the app image bakes code at build time (only `sites`/`logs` are
volumes). Phase 0 code is committed to the repo (source of truth) and was hot-copied +
`bench migrate`d into the running local container for verification. To persist across an
image rebuild, rebuild the backend image from the repo (`scripts/redeploy-windows.ps1` /
compose `--build`). The DB schema for the two DocTypes already persists in the `sites` volume.

**All six phases (0–5) shipped and verified on the local `trader.localhost` site (2026-07-07).**
Backend complete: 10 new API modules, 13 new DocTypes, custom fields, and hook wiring — all
behavior config-driven and opt-in, architecture audit clean. Remaining follow-ups are the
frontend workstream (SPA config admin + decision-trace view + dual-control gate) and an image
rebuild + git commit to persist the work.

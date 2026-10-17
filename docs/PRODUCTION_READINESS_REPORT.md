# Traders ERP Production Readiness Report

- **Audit date:** 2026-10-05
- **Repository:** `F:\apps\traders`
- **Branch / baseline commit:** `main` / `4e0aabf7bdd7fa11ee9eff522bac87f1513e636d`
- **Working tree:** changes are uncommitted; pre-existing untracked user files were preserved.
- **Runtime:** Node 24.15.0, npm 11.12.1, Python 3.14.4, Docker Engine 29.8.1, Docker Compose 5.5.1. The isolated QA stack ran Frappe 15.113.1, ERPNext 15.114.0, MariaDB 10.11.19, and Redis 7.4.11.

The detailed scenario log is [`PRODUCTION_READINESS_TEST_MATRIX.md`](PRODUCTION_READINESS_TEST_MATRIX.md). This report separates confirmed defects from release gates that remain open because the required adversarial or accounting test was not performed. “Not run” is not treated as a pass.

## Executive Verdict

# NOT READY FOR PRODUCTION

**Production readiness score: 67/100.** This is the equal-weight average of the 13 category scores below. It is a risk summary, not a statistical certification.

The isolated QA backend and frontend images were rebuilt and deployed after Docker recovered, before the two source-only security corrections in this follow-up. The QA stack's database, Redis, backend, frontend, websocket, proxy and workers are running; database, Redis, backend, frontend, websocket and proxy report healthy. A clean site installed Frappe, ERPNext and `trader_app` from that QA backend image. Its opt-in demo seed created 2,453 records in 410 seconds, reported zero generator errors, and passed all generator validations. Read-only checks found 1,406 submitted GL voucher groups with zero imbalances and exact Bin quantity/value agreement with the latest Stock Ledger Entries; bins without ledger entries were empty. The isolated QA image's Bench suite passed 176 tests with 3 skips; the latest source's native Python suite passed 178 with 13 site-backed skips, and the frontend suite passed 19 tests. A real ERPNext integration acceptance test covers sales, purchases, both return paths, and journal cancellation with GL/stock/outstanding/dashboard/report assertions. Live rollback-scoped checks verified Company A-only listing, denial of Company B selection, dashboard/report denial, direct Company B document-read denial, and denial of Viewer taxonomy/item creation. New source regressions close a System Manager list-query scope gap and prevent personal settings from writing site-wide System Settings. A Playwright browser smoke verified login, unauthenticated deep-link redirection, and dashboard rendering at desktop and mobile sizes with no horizontal overflow or post-login errors. The comprehensive authorization gate remains open: every sensitive endpoint and mutation, exports, cache isolation/invalidation and adversarial role combinations have not all been tested. External DNS/TLS renewal, production hosting, off-host recovery, rollback, load and observability drills remain unproven.

**P0 remaining: 1 open release gate.** The accounting gate passes for rollback-scoped ERPNext integration flows A–E. System Manager transaction lists now honor explicit Company permissions and tenant boundaries, with regressions for tenant scope, explicit Company permission, and empty scope. Personal preferences no longer attempt privileged site-wide writes. P0-01 remains open until broad adversarial server authorization and multi-company isolation tests cover protected routes, sensitive reads and mutations, reports, exports and caches. The proven checks do not establish complete endpoint coverage.

**P1 remaining: 4**, listed under [Remaining Risks](#remaining-risks). **Complete critical E2E flows: 5/7** (flows A–E passed in ERPNext integration tests; F remains partial and G remains partial for the latest image).

| Gate | Result | Evidence summary |
|---|---|---|
| Security | **FAIL** | Concrete redirect, default credential, company permission, direct Company read, server-side module, admin API and internal-print checks are fixed/tested. Broad endpoint, mutation, export, cache and protected-route coverage remains incomplete. |
| Accounting | **PASS, scoped** | Rollback-scoped ERPNext tests complete sales, purchase, sales return, purchase return and journal cancellation; balances, GL, stock, dashboard and reports are asserted. Foreign currency/tax/rounding and browser journeys remain outside this evidence. |
| Multi-company isolation | **FAIL** | Restricted QA user is limited to Company A; selecting Company B, direct dashboard/report access and direct Company B document read are denied. Exhaustive endpoint, mutation, export and cache isolation remains unverified. |
| Backup/restore drill | **PASS, scoped, current QA snapshot** | A fresh backup from the final QA site restored into a separate site; 13 selected doctype counts matched exactly. Login, encrypted credentials, actual attachment content, off-host recovery and full host rebuild were not verified in this latest drill. |
| Production deployment dry run | **PASS, scoped, current QA image** | Current backend image was rebuilt and deployed in isolated QA. Clean site install, health checks, local proxy/API and authenticated dashboard were verified. Public DNS/TLS renewal, external firewall and hosted CI deployment were not tested. |

## Production Readiness Score

| Category | Score | Reason |
|---|---:|---|
| Security | 63 | Multiple authorization/session/redirect fixes, including live Viewer denial for taxonomy writes, have regression coverage and selected runtime proof; broad adversarial endpoint and export checks remain incomplete. |
| Functional correctness | 80 | Clean install, zero-error demo seed, ERPNext acceptance lifecycle and UI dashboard smoke pass; repeatable browser journeys are absent. |
| Accounting/data integrity | 82 | Sales, purchase, return and journal integration flows reconcile tested balances, GL and stock; currencies, tax edge cases and migration remain open. |
| Authorization/isolation | 71 | Live restricted-user checks cover company list, switching, dashboard, report, direct Company reads, and SKU taxonomy/item creation; the full endpoint/mutation/cache matrix remains open. |
| Frontend quality | 64 | Clean install, 19 tests, production build, and dashboard visual checks at desktop/mobile pass; lint warnings, accessibility sampling and business-flow browser tests remain. |
| Backend quality | 75 | Clean-site installation and 176-test Bench suite pass; broader operational and security tests remain. |
| Testing | 82 | Native, Bench, frontend and five ERPNext lifecycle integration flows pass; browser business journeys, recovery and broad security scenarios remain. |
| Performance | 25 | No realistic load, query or response-time measurements; charts chunk is about 421 KB before gzip. |
| Infrastructure | 78 | Current QA Compose stack is healthy on key services; worker/scheduler monitoring and failure/recovery drills remain open. |
| Deployment | 82 | Current image build, isolated Compose startup, clean site installation, proxy, health and login passed; public-host/CI/rollback rollout is not proven. |
| Backup/recovery | 78 | Current QA snapshot restored to a separate site with 13 matching counts; encrypted values, nonempty attachments, login to this restored copy, off-host recovery, RPO/RTO and rollback remain open. |
| Observability | 32 | Logs were usable for diagnosis and backup errors now fail loudly; monitoring, alerting, retention and redaction were not verified. |
| Maintainability | 64 | Deployment and recovery docs are updated; heuristic audit findings and parts of the operator process still need review. |
| **Overall** | **67/100** | Equal-weight average (876/13 = 67.38), rounded to a whole number. |

## Changes Made

All changes are in the current working tree and have not been committed.

| Problem / severity | Root cause | Files changed and fix | Test performed and result |
|---|---|---|---|
| Company-switch permission could bypass an explicit Company User Permission (**P0 security, remediated**) | Custom company listing relied on `frappe.get_all`, which bypasses DocType permission filters | `apps/trader_app/trader_app/api/company.py`; `apps/trader_app/trader_app/tests/test_tenant_isolation.py`; `apps/trader_app/trader_app/tests/test_tenant_guard.py`. Explicit Company permissions are now applied before listing or resolving a company; an explicitly empty permission set fails closed while no explicit permission preserves ERPNext's unrestricted semantics. | A restricted QA Sales User listed only Company A and could not select Company B; focused unit coverage passes. Broader endpoint/resource checks remain open. |
| Direct Company resource reads bypassed the custom tenant resolver (**P0 security, remediated for this DocType**) | Custom API checks did not protect a caller that requested a Company document directly through Frappe resource APIs | `apps/trader_app/trader_app/api/permissions.py` adds a Company document permission hook that resolves the active tenant and returns an explicit denial when the user lacks that Company. Hook is registered in `hooks.py`. | A live rollback-scoped restricted user was denied a direct `frappe.get_doc("Company", Company B).check_permission("read")`; the full Company/API surface still needs adversarial coverage. |
| Dashboard access denial appeared as a successful empty result (**P0 authorization/error handling, remediated**) | Four whitelisted dashboard reads resolved the requested company inside broad exception handlers that converted permission errors to HTTP 200 responses with empty data | `apps/trader_app/trader_app/api/dashboard.py`; `apps/trader_app/trader_app/tests/test_tenant_isolation.py`. The company is now authorized before entering each read's fallback handler, so denied requests propagate through Frappe's error response. | Reproduced all four endpoints returning HTTP 200/empty for Company B before the fix. After rebuilding the QA backend, all four returned HTTP 417; the permitted Company A KPI request returned HTTP 200. Four regression subcases pass. |
| Built-in super-admin identity/password fallback (**P1 security**) | Setup could create or disclose a known default credential | `apps/trader_app/trader_app/setup/seed_super_admin.py`; `apps/trader_app/trader_app/tests/test_seed_super_admin.py`. Seed now requires explicitly supplied paired credentials and does not print the password. | Focused seed/admin tests passed; test checks no static default identity/password. |
| Tenant-admin APIs could expose unassigned users, grant platform roles, list global role holders, and access global settings (**P0 security, remediated for these endpoints**) | Several admin endpoints checked a target user only when it had a non-empty tenant; other role operations lacked target scoping, and global settings/warehouses were not consistently platform/company guarded | `apps/trader_app/trader_app/api/admin.py`; `apps/trader_app/trader_app/tests/test_tenant_isolation.py`. Tenant user access now fails closed for blank or foreign tenant assignments; role lists are tenant-filtered and platform roles are hidden/blocked; global fiscal/accounting settings require platform admin; warehouse updates validate company and reject companyless records for tenant admins. | 12 direct admin-API authorization regressions pass within the 95-test focused suite. Current native suite has 178 passes and 13 skips; Bench suite has 173 passes and 3 skips. The broader adversarial authorization release gate remains open. |
| System Manager transaction list queries bypassed company isolation (**P0 security, fixed in source**) | Query filters treated every System Manager as globally unrestricted, even when assigned to one tenant or explicitly limited by Company User Permissions; direct document checks were scoped but built-in company transaction lists were not | `apps/trader_app/trader_app/api/permissions.py` now constrains System Manager transaction lists to `get_permitted_company_names()` (preserving unrestricted access when there are no limits) and fails closed for an empty company set. Three regressions cover tenant scope, explicit Company permission with multitenancy off, and empty scope. | All three regressions pass; the focused authorization/admin suite is 95/95 and native discovery is 191 tests (178 passed, 13 site-backed skipped). A live two-company built-in resource-list attempt still needs to be exercised. |
| Personal settings API attempted site-wide System Settings writes (**P0 security, fixed in source**) | The personal preferences endpoint used low-level `frappe.db.set_single_value`, which bypasses normal document permission checks | `apps/trader_app/trader_app/api/settings.py` now writes only the current user's defaults and cache; the user identity is passed explicitly. `apps/trader_app/trader_app/tests/test_tenant_isolation.py` verifies no singleton-setting write occurs. | Regression passes in the 95-test focused authorization/admin suite; live QA runtime was not rebuilt for this latest source change. |
| Shared-master direct-ID lookups and internal printing could bypass tenant or role checks (**P0 security, remediated in current image; broad runtime gate open**) | Credit-check, tax-preview, template, POS default and opportunity default queries used shared Customer/Item identifiers without consistently matching the selected company's tenant; `get_print_data` accepted `view_mode=internal` without applying the secure-print role rule | `apps/trader_app/trader_app/api/permissions.py`, `commercial_totals.py`, `templates.py`, `tax_policy.py`, `printing.py`, `pos.py`, `purchases.py`, `opportunity.py`, `trading_entity.py`, and `tests/test_tenant_isolation.py`. A shared-master company authorization helper now checks ordinary document permission plus company tenant; internal prints enforce the configured role rule; default selections and tenant-wide counts are scoped. | Focused regressions pass in the native suite and current 176-test Bench run. Current image is rebuilt; exhaustive adversarial direct-ID and internal-print role probes remain in the open P0 gate. |
| Direct API calls could bypass the frontend role-to-module capability map (**P0 security, remediated in current image; broad runtime gate open**) | Several whitelisted endpoints relied on UI navigation or only tenant/module feature gates, so a caller could invoke the API directly without the matching server-side role | `apps/trader_app/trader_app/api/_tenant_guard.py` now maps module capabilities to allowed roles and denies unknown module keys; guarded endpoints include sales, purchases, inventory, customers, suppliers, finance, reports, dashboard, settings, components, POS and trading entity. Additional source-document permission checks cover posting previews, grouped invoices, decision traces and process transitions; migration toolkit is guarded. | Current source was rebuilt and passes the native and 176-test Bench suites. Broad direct-API role and tenant probes remain part of the open P0 runtime gate. |
| SKU taxonomy writes and item resolution exceeded read-only access (**P0 security, fixed for these endpoints**) | The `components:view` module capability allowed a Trader Viewer to reach `ensure_taxonomy_values`, which wrote Company configuration without an endpoint-specific role check; Item Group creation also happened before Item create permission was checked, and metadata matches did not check Item read permission | `apps/trader_app/trader_app/api/catalog.py` now applies an explicit Trader Admin/System Manager guard to both taxonomy mutation APIs, checks Item create permission before creating groups, checks read permission for metadata matches, and leaves group creation inside the Item transaction. Regression coverage is in `apps/trader_app/trader_app/tests/test_tenant_isolation.py` and `test_live_company_isolation.py`. | Focused native suite: 95 passed. Live rollback-scoped Trader Viewer probe denied both taxonomy writes and Item creation, with no taxonomy writes or category Item Group left behind. Latest Bench suite passed 176 tests with 3 skips. The broad endpoint authorization gate remains open. |
| Dashboard KPI currency values were clipped at common widths (**P2 usability, fixed**) | Full-width currency strings and long titles were truncated inside narrow cards | `frontend/trader-ui/src/components/KPICard.tsx` and `frontend/trader-ui/src/lib/utils.ts` now show compact company-currency values, preserve the full amount in the accessible label and hover title, and wrap long KPI names. `utils.test.ts` covers compact/negative/currency formatting. | Frontend suite: 19 tests passed; production build passed. Live Playwright check at 1365px and 390px found all eight cards/values fit, full titles, and no horizontal overflow. Screenshots are in `.qa-evidence/production-readiness/`. |
| MariaDB runtime image drift (**P1 deployment reproducibility, fixed for DB image**) | Compose selected the floating 10.11 series tag while QA used 10.11.19 | `compose/docker-compose.yml` now pins `mariadb:10.11.19` and its official multi-platform manifest digest. | Current QA server binary was 10.11.19; merged Compose configuration validates. Other final image digests/scans and framework-v15's runtime warning above 10.8 remain open. |
| Print return path could navigate to an untrusted destination (**P1 security**) | Caller-provided path was not constrained to a local allowlist | `frontend/trader-ui/src/lib/navigation.ts`; `frontend/trader-ui/src/pages/DocumentPrintPage.tsx`; `frontend/trader-ui/src/lib/navigation.test.ts`. Return destination is allowlisted to the POS screen. | 8 open-redirect/navigation cases pass as part of 19 frontend tests. |
| GST template seeding referenced a missing cache-key helper (**P1 functional correctness, fixed**) | Template setup called `_gst_config_key`, which was undefined after GST settings moved to the durable config pack and legacy migration key | `apps/trader_app/trader_app/api/gst.py` now uses `_legacy_gst_config_key`; `settings.py` imports Frappe's translation helper used by its feature guard. A regression covers default template seed completion and the legacy cache key. | New regression passes; clean-site seed passed with zero generator errors and all validations; latest native suite is 191 discovered, 178 passed and 13 site-backed skips. Flake8 caught undefined names in the earlier CI run. |
| Test discovery and standalone suite setup (**P1 quality, remediated**) | Tests were outside the importable Frappe app package, and site-only tests ran under ordinary unittest discovery with no initialized Frappe site | Existing test modules were moved to `apps/trader_app/trader_app/tests`; site-backed modules now skip unless `frappe.local.site` is initialized. The commercial-totals arithmetic test temporarily supplies only the Frappe utility functions it needs when Frappe is absent. | Latest native discovery: 191 tests, 178 passed and 13 site-backed tests skipped. Bench discovered 176 tests, passed 173 and skipped 3 in the previous QA image. Both runs exited 0. |
| Demo seed failures were counted as warnings (**P1 data quality, fixed and verified**) | The installer ignored generator error counts when choosing success status, and several generated documents violated ERPNext checks | The installer now raises after generator errors or validation failures; linked purchase invoices use their posting date for the due date; supplier quotations link only to submitted material requests; failed payment entries roll back to a savepoint, and the first errors are printed. | Current clean site seeded 2,453 records in 410 seconds, with zero errors and all validations passing. Read-only reconciliation found zero unbalanced GL voucher groups and no Bin/SLE discrepancies. |
| Production router dependency had a known open-redirect advisory (**P1 dependency**) | Production used React Router v6 behavior affected by untrusted navigation paths | `frontend/trader-ui/package.json`; `package-lock.json`. Direct dependency upgraded to React Router 7.18.4, compatible with the React 18 app build. | `npm ci`, 19 tests and production build passed; production dependency audit reports zero findings. |
| Frontend build/test dependencies had known advisories (**P1 supply chain, remediated**) | Frontend used vulnerable Vite 5, Vitest 2, and Tailwind 3 dependency trees; Tailwind 3's transitive `braces` issue had no patched v3 release | `frontend/trader-ui/package.json`, `package-lock.json`, `vite.config.ts`, `src/index.css`, source class utilities, and removal of obsolete `postcss.config.js`. Upgraded to Vite 6.4.3, Vitest 4.1.11, Tailwind 4.3.3, and the official Tailwind Vite plugin; migrated changed utility names and preserved focus-ring widths. Vite JS/CSS targets and README now specify Chrome 111+, Edge 111+, Safari 16.4+, Firefox 128+. | Clean `npm ci`, 19 tests, build of 2,347 modules, lint (39 warnings; 0 errors), and full plus production `npm audit`: zero vulnerabilities. Generated CSS assertions passed; the dashboard also received a limited desktop/mobile Playwright pass. Cross-browser, keyboard, screen-reader and accessibility audits remain open. |
| Vite preview sent built assets to the development backend proxy (**P2 frontend delivery, fixed**) | Preview inherited the broad development /assets proxy even though production bundles are served from the local dist directory | frontend/trader-ui/vite.config.ts now limits preview proxying to /api while keeping the development /assets proxy unchanged. | Production build passed; local HTTP smoke returned 200 for the SPA shell and all four referenced JS/CSS bundles. This does not exercise browser behavior or the Frappe API. |
| Build image inputs and CI gates were stale (**P1 supply chain/release pipeline, partly remediated**) | Builder used `frappe/bench:latest`, frontend images used Node 20 and Nginx 1.25, CI skipped frontend lint/tests and native Python tests, and the frontend Docker job used a subdirectory context incompatible with its root-relative `COPY` paths | `infra/docker/backend.Dockerfile`, `infra/docker/frontend.Dockerfile`, `compose/docker-compose.yml`, `.env.example` files, `.dockerignore`, and `.github/workflows/build.yml`. Bench now uses released tag `v5.31.0`; frontend builder uses Node 24.21.0 and Nginx uses 1.30.5; CI runs audit/lint/unit/type/build and native Python tests, and image contexts use the repository root. Docker publishing remains limited to trusted pushes. Local QA/editor artifacts are excluded from image build contexts. | Current backend image built and passed clean-site/Bench validation; frontend clean install, tests and production build pass; required Compose secrets fail closed. Lint still reports 39 warnings. Hosted GitHub workflows, exact image digest pinning and final image scanning remain open. |
| Compose service health was only partially observable (**P2 operations, partly remediated**) | Redis, websocket, and proxy had no Compose health checks, and dependent services could start as soon as Redis processes existed | `compose/docker-compose.yml`: Redis uses `redis-cli ping`, websocket checks its listening port, proxy checks its local `/health`, and backend startup waits for healthy Redis. | Current QA reports database, Redis, backend, frontend, websocket and proxy healthy. Workers/scheduler still need meaningful health monitoring; failure/recovery drills remain open. |
| Frontend API inventory scanner reported zero methods (**P2 audit quality, fixed**) | The scanner only recognized direct `api.get/post/put/delete` calls, while current API namespaces use local `get()` / `call()` wrappers and direct Axios calls | `scripts/architecture-audit/scan-frontend-api.mjs` now scopes extraction to one namespace method at a time and recognizes wrapper and direct request calls. | Focused assertion reports 25 namespaces and 266 methods; full architecture audit reran successfully and refreshed all generated inventories and graphs. |
| Fresh startup depended on manual site setup and Compose startup ordering (**P1 deployment**) | Compose did not provide an idempotent, fail-fast site initialization stage | `scripts/init-site.sh`; `infra/docker/backend.Dockerfile`; `compose/docker-compose.yml`. Required config checks, site creation/app installation, and dependent service ordering added. | Clean isolated site initialization, app install and migrations passed; production overlay services became healthy/running. |
| Deployment could hide failed migration/health and take services down before replacement (**P1 reliability**) | Deployment scripts suppressed errors and used disruptive teardown/readiness behavior | `scripts/deploy.sh`; `.github/workflows/deploy.yml`; `scripts/redeploy-ec2.sh`; `scripts/setup-ec2-ubuntu.sh`. Failures propagate, deployment uses in-place Compose update, backup is required in CI, and SSH host key comes from a pinned secret. | Production Compose was deployed in isolated QA; workflow itself was not run against a hosted environment. |
| Legacy CDC provisioning could drop the site without backup and print fixed credentials (**P0 destructive behavior**) | Script contained destructive, non-repeatable and credential-disclosing operations | `scripts/deploy_cdc_server.sh` is now a fail-closed disabled stub directing operators to redesign CDC provisioning. | Bash syntax checked; destructive legacy script was not run. |
| Backup script assumed a hard-coded site and could hide failures (**P1 recovery**) | Compose invocation and copied backup paths did not reliably follow configured site/project | `scripts/backup.sh`. It loads an explicit env file, uses configured site and Compose project, invokes Frappe's site backup with files, copies site configuration and uploads, protects archive permissions, and propagates errors. | Isolated backup succeeded (about 1.8 MiB); restore drill passed within the documented scope. |
| HTTPS login cookie lacked `Secure` behind the TLS edge (**P1 session security**) | Frappe's proxied `sid` response did not receive a `Secure` flag from edge Nginx | `infra/nginx/ssl-reverse-proxy.conf` now adds `proxy_cookie_flags sid secure httponly samesite=lax`. | Adapted TLS config passed `nginx -t`; authenticated HTTPS request confirmed all three flags. |
| Local setup exposed risky demo behavior and stale operator instructions (**P2 operations**) | README and runbooks described old ports, startup steps, demo behavior and production status | `README.md`, `DEPLOYMENT_COMMANDS.md`, `docs/DEPLOYMENT_GUIDE.md`, `docs/SYSTEM_MASTER_CONTEXT.md`, `docs/audits/architecture-findings.md`, implementation tracker and generated audit documents. Current instructions, restore findings, stale-snapshot warnings and heuristic-audit warning added. | Production config/deployment/restore evidence updated in this report and test matrix. `progress:check` still exits 1 while its generated outputs differ from HEAD in this uncommitted worktree. |
| Windows working copy had mixed line endings in changed bash scripts (**P1 portability**) | PowerShell edits left CRLF and LF mixed in scripts executed on Linux | Seven changed shell scripts normalized to LF. | Linux Bash syntax check passed for all seven scripts. |

## Remaining Risks

### P0 — release gate still open (1)

1. **Authorization and company isolation have not passed the full adversarial runtime test.** In live rollback-scoped checks, a restricted user listed only Company A; selecting Company B, Company B dashboard/report queries, and direct Company B document read were denied. New code-level tests also constrain tenant-assigned System Manager list queries to their permitted companies and fail closed for an empty scope. Still test every sensitive API and mutation, direct route, export, cache isolation/invalidation, and additional role combinations against two companies, including a live built-in resource-list request. The proven checks do not close the full endpoint gate.

### P1 — critical correctness/reliability items (4)

1. **Database compatibility needs upstream confirmation for the exact Frappe 15 release.** QA clean-site install, migrations, ERPNext acceptance flows and the 176-test Bench suite passed on MariaDB 10.11.19, now pinned in Compose. Frappe 15.113.1 still warns that versions above 10.8 have not been tested. MariaDB 10.6 is used by an official Frappe CRM stable CI lane for v15, but MariaDB Community 10.6 reached end of life on 2026-07-06. Do not downgrade a production database to that unmaintained line to silence the warning; obtain upstream/vendor support confirmation for 10.11.19 or certify another maintained line before production. See the [official Frappe CRM CI workflow](https://github.com/frappe/crm/blob/develop/.github/workflows/server-tests.yml) and [MariaDB maintenance schedule](https://mariadb.org/about/#maintenance-policy).
2. **Recovery and rollback coverage is incomplete.** A fresh backup of the current QA site restored into a new separate site, and 13 selected company, customer, inventory, payment, journal, GL, stock-ledger and file-record counts matched. The source had no Email Accounts, no actual files in its public/private upload folders, and no configured encryption key; secret decryption and attachment-content recovery therefore remain unproven. Login against the restored site, off-host restore, full host/volume recreation, approved RPO/RTO and migration rollback still need a drill.
3. **Critical browser journeys lack a repeatable E2E suite.** Authenticated dashboard smoke passed, but sales, purchasing, finance, returns, denied operations, session expiry and recovery have not been automated in the browser. Responsive, keyboard, screen-reader and WCAG checks also remain open.
4. **Deployment provenance and hosted release gates remain incomplete.** Pin image digests, scan final images, and run the updated GitHub build/deploy workflows with protected environments. Production DNS/TLS renewal, firewall, rollback and the actual hosted target were not exercised.

### P2 — important follow-up

- Workers and scheduler still lack meaningful Compose health status; failure/restart and queued-job recovery were not tested. Other configured Compose health checks report healthy in QA.
- Accessibility and responsive checks at desktop/tablet/mobile, with keyboard and screen-reader sampling, were not performed. An authenticated dashboard screenshot exists, but it is not a complete usability review.
- Performance and query behavior are unmeasured. The chart bundle is about 421 KB before gzip. Establish response/load targets and test large lists, reports, searches and exports.
- External logs/metrics/alerts, log retention, secret redaction, disk alerts, backup age and off-host copy alerts need an operator-owned setup.
- Full lint exits successfully with 39 warnings. The complete workflow/security review did not exercise hosted GitHub secrets, branch protection, environment approvals, or external SSH deployment.
- The generator-backed architecture findings include heuristic candidates and some stale/false claims. They are now labeled as unverified; each candidate still needs manual validation.

## Known Deferred Features

| Feature | Current status | Release treatment |
|---|---|---|
| Tally/CSV accounting migration wizard | A `Migration Job` schema exists, but no user-facing Tally/CSV migration route/parser/import journey was verified. The `migration_toolkit` API relates to configuration packs and is not a Tally importer. | Unsupported. Do not advertise or expose it as an available production feature. Add it only with safe parsing, idempotency, rollback and adversarial file tests. |
| Native ERPNext approval workflows | `hooks.py` explicitly says the workflow fixture is omitted until workflow JSON is designed/exported. `Trader Process Profile` is a separate optional sales lifecycle state model, not a native approval workflow. | Unsupported. Do not imply role-based approvals are active. |
| CDC-specific provisioning | Legacy script performed unsafe destructive provisioning. | Deliberately disabled with a safe failure message until redesigned and reviewed. |
| Demo seed | Available as an explicitly opted-in development command for a fresh, empty site only; populated-site install and uninstall are blocked. Current clean-site run created 2,453 records with zero generator errors and all validations passing. | Never run against production or populated sites. Use the safety regression tests; do not invoke seed/uninstall on populated data. |

## Test Results

### Exact automated commands and results

| Command (working directory) | Result |
|---|---|
| `npm ci` (`frontend/trader-ui`) | Exit 0; 325 packages installed, 326 audited |
| `npm run lint` (`frontend/trader-ui`) | Exit 0; 39 warnings, 0 errors |
| `npm run test` (`frontend/trader-ui`) | Exit 0; 5 files, 19 tests passed |
| `npm run build` (`frontend/trader-ui`) | Exit 0; TypeScript and Vite build passed |
| `npm audit --omit=dev` (`frontend/trader-ui`) | Exit 0; 0 production dependency findings |
| `npm audit` (`frontend/trader-ui`) | Exit 0; 0 findings in the full dependency tree |
| `$env:PYTHONPATH='apps/trader_app'; python -m unittest discover -s apps/trader_app/trader_app/tests -p 'test_*.py'` (repository root) | Exit 0; 191 discovered, 178 passed and 13 site-backed tests skipped; 0 failures |
| CI backend quality gates (`flake8`, `black --check`, `isort --check-only`) | Earlier audit run passed all three gates. This follow-up host has no Black or Flake8 modules installed, so the latest two source edits were validated with `compileall`, unit tests, and `git diff --check` but not rerun through those format/lint tools |
| `python -m unittest trader_app.tests.test_tenant_isolation trader_app.tests.test_tenant_guard trader_app.tests.test_seed_super_admin -q` (repository root, `PYTHONPATH=apps/trader_app`) | Exit 0; 95 passed, including System Manager company-list scope, user-only settings writes, taxonomy/item authorization, module capability denial, internal-print role enforcement, company checks and 12 admin API authorization regressions |
| `python -m unittest trader_app.tests.test_sales_lifecycle -v` (repository root, `PYTHONPATH=apps/trader_app`) | Exit 0; 49 passed after relocation; overlaps the broad suite |
| `python -m compileall -q apps/trader_app/trader_app` | Exit 0; application Python files compiled successfully |
| `bench --site traders-qa.invalid run-tests --app trader_app` (current isolated QA backend) | Exit 0; 176 tests run, 3 skipped, 0 failed (173 passed); includes ERPNext business lifecycle and live Viewer authorization checks |
| `npm run audit:architecture`, `npm run audit:frontend`, `npm run audit:backend`, `npm run audit:workflows`, `npm run audit:graphs` (repository root) | All exited 0; generated findings are heuristic and need manual confirmation |
| `npm run progress:check` (repository root) | Exit 1 because it regenerated changed tracker/snapshot files and `git diff --exit-code` correctly detected their difference from baseline HEAD. The updated files are included in this uncommitted worktree. |
| `bash -n` on `scripts/backup.sh`, `setup.sh`, `deploy.sh`, `redeploy-ec2.sh`, `setup-ec2-ubuntu.sh`, `deploy_cdc_server.sh`, `init-site.sh` | All seven passed after LF normalization |
| `docker compose --env-file compose/.env.production.example -f compose/docker-compose.yml -f compose/docker-compose.prod.yml config --quiet` | Exit 0 with disposable `DB_ROOT_PASSWORD`/`DB_PASSWORD` validation values; the checked-in example's blank required database root password fails closed |

**Automated test executions:** native Python 178 passed / 13 skipped; Bench 173 passed / 3 skipped; frontend 19 passed. These three suite runs total 370 passed, 16 skipped and 0 failed in 386 executions. Native and Bench test cases overlap, so this is an execution count, not a unique-test count. The latest source-only security changes were covered by native tests; the isolated QA image was not rebuilt after those edits.

### Runtime checks completed

- Current working-tree backend image built and ran in isolated QA. Fresh site `traders-fresh-20261005.invalid` installed Frappe 15.113.1, ERPNext 15.114.0 and `trader_app` 1.0.0. Its demo seed created 2,453 records with zero errors and all validations passing in 410 seconds; dashboard verification reported AR PKR 5,054,911, AP PKR 63,586,563, and stock PKR 335,218,999.
- A direct seed/uninstall refusal check against the already-populated primary QA site was blocked by automatic review because it could modify or delete QA data if a guard failed. The commands did not run and no data changed; the non-destructive safety regression cases passed in the Bench suite.
- QA Compose reports healthy DB, backend, frontend, both Redis services, websocket and proxy; all three workers and scheduler are running. Current image built and started; no intentional dependency failure/recovery drill was performed.
- Proxy ping and authenticated dashboard returned HTTP 200. A restricted QA Viewer listed only Company A; Company B switch, direct dashboard/report access, and direct Company B document read were denied. The same live Viewer could not alter SKU taxonomy or create an Item, and left no category Item Group behind. Browser smoke verified login, unauthenticated protected deep-link redirection, and dashboard fit at desktop/mobile widths with no post-login errors.
- HTTP redirected to HTTPS. After the TLS cookie fix, `sid` had `Secure`, `HttpOnly`, and `SameSite=Lax` flags.
- Nginx syntax validation passed.
- A fresh current QA backup completed with database, public-file and private-file archives; restore into the new isolated `traders-restore-20261005.invalid` site succeeded. All 13 selected document counts matched exactly (Company 1, Customer 92, Supplier 54, Item 460, Sales Invoice 354, Purchase Invoice 192, Payment Entry 424, Journal Entry 72, GL Entry 2,699, Stock Ledger Entry 654, Bin 809, Email Account 0, File 2). The source had zero files in both actual upload folders and no `encryption_key`; encrypted-field and nonempty-attachment recovery were not demonstrated. Restored-site login was not confirmed. The restore target and source QA sites were preserved; the separate `poaljdw-erpnext` project was not touched.
- ERPNext acceptance tests exercised sales, purchase, sales return, purchase return and journal cancellation. Fresh-site read-only reconciliations found 1,406 GL voucher groups with zero unbalanced groups, 747 Bins with zero quantity/value mismatches, and zero nonempty bins without a matching Stock Ledger Entry. Broad adversarial API coverage, browser business journeys, load/performance, off-host recovery, failure injection, hosted CI deployment and migration rollback remain unverified.
- Docker Engine 29.8.1 and Compose 5.5.1 now respond normally; the isolated QA project is running. No restart or cleanup was performed on the separate `poaljdw-erpnext` project.

## Production Deployment Instructions

These steps were exercised on the isolated QA project using test-only secrets. A real production rollout still needs an operator-reviewed change and external ingress setup.

1. On a Linux host, check out a reviewed revision and enter `compose/`.
2. Copy `.env.production.example` to `.env`, set the required values in the environment matrix below, store secrets in an approved secret manager, and set file mode to `600`.
3. Configure DNS and host Nginx TLS using [`../infra/nginx/ssl-reverse-proxy.conf`](../infra/nginx/ssl-reverse-proxy.conf). Replace domain and certificate paths. Nginx must forward to the loopback-only `127.0.0.1:8080` Compose proxy; do not expose backend, websocket, database, Redis, or frontend ports directly.
4. Validate, build and start:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   docker compose logs -f site-init
   docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
   ```

5. Confirm site-init completed and DB, Redis, backend, frontend, websocket, and proxy health checks are healthy. Inspect worker/scheduler logs, then check HTTPS login, `/api/method/ping`, secure session cookies, and representative authorized/unauthorized requests.
6. For an existing site update, create and verify a pre-deploy backup before migration. CI's deploy workflow now makes a mandatory backup and deploys the tested SHA, but the hosted workflow and rollback were not executed in this audit.

## Rollback Instructions

**Rollback is not verified or automated.** A Git checkout rollback is not safe after a database migration because it does not reverse the schema/data changes.

1. Stop promotion/traffic through the operator's host-level change process; keep the failed deployment logs and pre-deploy backup.
2. Build the previously approved application image/revision in an isolated recovery stack, not against the migrated production database.
3. Restore the pre-deploy database/files backup to a separate recovery site, restore the protected encryption key, verify app versions and critical accounting/stock counts, and verify login.
4. Only after the recovery target passes owner-approved checks should traffic be switched using a reviewed operational procedure.

Steps 2–4 are a safe recovery outline, not an executed rollback runbook. Rehearse a complete migration rollback on the target hosting architecture before go-live.

## Backup / Restore Instructions

### Backup

The backup command was run successfully against the isolated QA project:

```bash
cd /opt/traders/compose
COMPOSE_ENV_FILE=/opt/traders/compose/.env \
COMPOSE_PROJECT_NAME=compose \
BACKUP_DIR=/secure/backups \
../scripts/backup.sh
```

The script invokes `bench --site "$SITE_NAME" backup --with-files`, then packages the database/files backups, public/private uploads and `site_config.json`. It fails on backup/copy errors, restricts local archive permissions, and applies `BACKUP_RETENTION_DAYS`. The archive includes sensitive configuration: keep it encrypted at rest and access-controlled, then copy it off-host. A cron schedule, encryption, off-host copy, and alerting must be configured by the operator; the repository does not establish an RPO/RTO.

### Restore to a separate site

Extract a protected archive to a restricted staging directory and copy its database, public-files and private-files archives into the backend container. Then create a separate target site and restore with the matching Bench version:

```bash
docker compose exec -T backend bench new-site restore-check.example \
  --db-host "$DB_HOST" --db-port "$DB_PORT" \
  --mariadb-root-password "$DB_ROOT_PASSWORD" \
  --admin-password "$ADMIN_PASSWORD" \
  --mariadb-user-host-login-scope='%'

docker compose exec -T backend bench --site restore-check.example restore \
  /tmp/restore/database.sql.gz \
  --db-root-password "$DB_ROOT_PASSWORD" \
  --admin-password "$ADMIN_PASSWORD" \
  --with-public-files /tmp/restore/files.tar \
  --with-private-files /tmp/restore/private-files.tar

docker compose restart backend
docker compose exec -T backend bench --site restore-check.example list-apps
```

The earlier QA drill used this Bench flow, then restarted backend so its startup process created the new site's log links; login succeeded and selected document counts matched. A fresh current-QA snapshot was also restored on 2026-10-05 to `traders-restore-20261005.invalid`, where all 13 selected document counts matched exactly. The latest source had no Email Accounts, no physical public/private uploaded files, and no `encryption_key`, so it did not validate encrypted-value decryption or nonempty attachment recovery. Keep the target site's DB credentials; if the source has an encryption key, merge only that key through a protected procedure rather than replacing the new site's full configuration. Verify login, encrypted fields, and actual attachment contents before production.

## Required Environment Variables

Set the following in `compose/.env` for production. Blank required secrets are deliberately rejected by Compose/site initialization. No real secret belongs in either sample env file.

| Name | Required | Service/use | Safe example or source | Secret? | Production handling / failure behavior |
|---|---|---|---|---|---|
| `SITE_NAME` | Yes | Site initialization and Bench commands | `trader.example.com` | No | Must match the real site/domain. Init exits if missing. |
| `DB_HOST` | Yes | Backend/site initialization DB host | `db` | No | Internal Compose service name; init exits if missing. |
| `DB_PORT` | Optional, default 3306 | MariaDB connection | `3306` | No | Keep internal; site init defaults to 3306. |
| `DB_ROOT_PASSWORD` | Yes | MariaDB root and site creation | Generated secret, no literal sample | Yes | Required interpolation; blank fails Compose config/startup. |
| `ADMIN_PASSWORD` | Yes | Frappe Administrator/site creation and restore target | Generated secret, no literal sample | Yes | Required by site init. Store outside source control. |
| `REDIS_CACHE` | Yes | Frappe cache URL | `redis-cache:6379` | No | Internal endpoint; init exits if missing. |
| `REDIS_QUEUE` | Yes | Frappe job queue URL | `redis-queue:6379` | No | Internal endpoint; init exits if missing. |
| `BENCH_VERSION` | Optional build default in Compose | Frappe Bench builder base image tag | `v5.31.0` | No | Released tag is explicit; pin its verified image digest before production promotion. |
| `FRAPPE_VERSION` | Optional build default in Compose | Backend image's Frappe branch/tag | `v15.113.1` | No | Keep on a reviewed release and align with ERPNext. |
| `ERPNEXT_VERSION` | Optional build default in Compose | Backend image's ERPNext branch/tag | `v15.114.0` | No | Keep aligned with the chosen Frappe release. |
| `PYTHON_VERSION` | Optional Docker build argument, Dockerfile default `python3.11` | Bench initialization in the backend build | `python3.11` | No | Build input, not a runtime `.env` setting; validate with pinned Frappe images. |
| `HTTP_PORT` | Optional, default 8080 | Host binding for internal HTTP proxy | `8080` | No | Proxy binds to loopback only; TLS edge forwards here. |
| `GUNICORN_WORKERS` | Optional, runtime default 4; prod example 8 | Backend process sizing | `4` or measured value | No | Set from host capacity/load testing; not tuned in this audit. |
| `GUNICORN_THREADS` | Optional, default 4 | Backend process sizing | `4` | No | Set from tested workload. |
| `TRADER_SUPER_ADMIN_EMAIL` | Optional paired value | Explicit platform super-admin seed command only | `ops@example.com` | No | Leave blank unless provisioning that feature; must pair with password. |
| `TRADER_SUPER_ADMIN_PASSWORD` | Optional paired value | Explicit platform super-admin seed command only | Generated secret | Yes | No default; command rejects missing paired credentials. |
| `BACKUP_DIR` | Optional | Host backup script destination | `/secure/backups` | No | Choose access-controlled encrypted storage with off-host copy. |
| `BACKUP_RETENTION_DAYS` | Optional, script default 30 | Backup script retention | `90` | No | Set based on approved retention policy and storage capacity. |
| `COMPOSE_ENV_FILE` | Optional, backup script default `compose/.env` | Backup script selects Compose env | `/opt/traders/compose/.env` | No | Use explicit absolute path for scheduled jobs. |
| `COMPOSE_PROJECT_NAME` | Optional, backup script default `compose` | Selects the Compose project for backup | `compose` | No | Must match deployment project name or backup cannot find the backend. |
| `DEPLOY_SSH_KEY` | Required for hosted deploy | GitHub Actions SSH authentication | Repository/environment secret | Yes | Store in Actions secret store; deployment workflow requires it. |
| `DEPLOY_KNOWN_HOSTS` | Required for hosted deploy | Pinned remote SSH host key | Exact reviewed `known_hosts` entry | Sensitive infrastructure config | Must be configured as a secret; workflow fails if blank. Do not use runtime `ssh-keyscan`. |
| `DEPLOY_HOST` | Required for hosted deploy | GitHub Actions remote host | Hostname in Actions variable | No | Configure per protected environment. |
| `DEPLOY_USER` | Required for hosted deploy | SSH account | Restricted deploy account | No | Configure least-privilege account. |
| `DEPLOY_PATH` | Optional, default `/opt/traders` | Remote checkout path | `/opt/traders` | No | Must be an owned checkout path for deployment user. |
| `DEPLOY_URL` | Required for hosted health step | External HTTPS health URL | `https://trader.example.com` | No | Must point to the deployed HTTPS edge. |
| `environment` workflow input | Optional, defaults to `staging` | GitHub environment selection | `staging` / `production` | No | Use protected GitHub environments and approvals for production. |

The workflow also sets `REGISTRY=ghcr.io` and derives `IMAGE_PREFIX` from the GitHub repository owner; `TARGET_SHA` is set from the successful build workflow's commit SHA (or `github.sha` for manual dispatch). These are generated workflow values, not secrets. `FRAPPE_ENV=production` is set by the production Compose overlay. Node 24.21.0, Nginx 1.30.5, and Bench v5.31.0 are explicit image/build versions. The GitHub Actions workflow changes have not yet been executed by GitHub.

`VITE_API_URL`, `VITE_SITE_NAME`, `MYSQL_DATABASE`, `ENCRYPTION_KEY`, and `SECRET_KEY` from the historical context doc are not consumed by the current Compose/frontend setup. The site's encryption key is generated and held in Frappe `site_config.json`, which the backup contains and must protect.

## Go-Live Checklist

- [ ] Close P0-01 with two-company tests for every sensitive endpoint and role, including direct resource IDs, mutations, reports, exports, cache isolation and protected UI routes.
- [ ] Obtain upstream/vendor compatibility confirmation for MariaDB 10.11.19 with the selected Frappe/ERPNext release, or certify another maintained database line before production.
- [ ] Restore a backup of the release candidate into a separate site; verify encrypted fields and attachment contents, then test off-host recovery and full infrastructure recreation.
- [ ] Define and measure approved RPO/RTO and rehearse rollback after a migration using the target hosting architecture.
- [ ] Add repeatable browser journeys for sales, purchasing, finance, returns, denied operations, session expiry, plus responsive and accessibility checks.
- [ ] Set performance targets and run realistic load, query, export and dependency-failure/recovery tests.
- [ ] Pin and scan final image digests; execute the hosted build/deploy workflows with production environment protection.
- [ ] Configure production DNS/TLS renewal, host firewall, health monitoring, log retention/redaction, backup-age/disk alerts and off-host backup delivery.
- [ ] Confirm production has unique secrets, demo seeding disabled, and a verified pre-deployment recovery point; never run seed/uninstall operations against populated production data.

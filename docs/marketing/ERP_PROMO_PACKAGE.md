# Traders ERP: Promotional Package

**Prepared:** 2026-10-16 · **Product:** Traders, a trader and distribution ERP built on ERPNext 15 · **Status:** Draft for owner review

This package answers the eight questions in the promo brief. Every answer carries one of three labels:

- **Supported**: the code, or a recorded test run, confirms it. Use it.
- **Caveat**: true, but limited. Use the wording given.
- **Owner decision**: not in the codebase. A recommended default is given and marked **[CONFIRM]**.

Sources are listed in the [appendix](#appendix-evidence). Where an older doc conflicts with the current code, this package follows the code and the [2026-10-05 readiness report](../PRODUCTION_READINESS_REPORT.md).

---

## Summary

**What we sell:** Traders, a web-based ERP for wholesale traders and distributors. It runs the whole chain from quotation to delivery challan to invoice to receipt, plus purchasing, stock across warehouses, receivables and payables, GST-style taxes, and 29 report screens. It is built on open-source ERPNext with a custom, trader-focused web interface.

**Who it is for:** Wholesale and distribution businesses in FMCG, hardware, electrical and consumables. Launch market: Pakistan (PKR, Punjab GST templates).

**Lead messages**

1. Quote to cash in one system. Quotation options carry through to the invoice.
2. Know who is late. The payment tracker shows due and expected dates.
3. Stock you can trace. Multi-warehouse stock, barcode lookup, serial validation and a serial trace report.
4. Built for trading, not generic ERP. Invoice types, grouped invoicing, withholding tax, FX snapshots.
5. Customize by configuration. Tax, FX, grouping and posting rules are data, not code forks.

**Do not publish yet:** "production-ready", "enterprise-grade security", "multi-company consolidation", "Tally import", "approval workflows", "manufacturing". See [section 9](#9-claims-guard-do-not-publish).

**Blockers before any post goes out:** prices and offers (section 7), a full logo (only a favicon exists), clean screenshots (section 6), and a decision on hosting claims (section 10).

---

## 1. Services we offer (Q1)

| Service | Offer it? | What it covers | Caveat |
|---|---|---|---|
| Business Management Systems | **Supported** | Sales, purchasing, inventory, receivables and payables, finance, reports | This is the core product. |
| Custom ERP Development | **Supported** | A custom Frappe app (`trader_app`) with about 300 API endpoints across 38 modules, plus custom doctypes and screens | Scope and price per project. |
| ERP Customization | **Supported, strongest offer** | Configuration packs for tax, grouping, FX, posting, print templates and process states. They are opt-in per company, so a client change is usually configuration, not code. | Packs stay inactive until enabled for a company. |
| Cloud-Based ERP Solutions | **Caveat** | Docker Compose deployment on a Linux server behind an HTTPS proxy, with backup scripts | Public hosting, DNS and TLS renewal, off-host backup and migration rollback are not yet proven (readiness report). Do not promise an uptime SLA. |
| Multi-Branch Management | **Caveat** | Several warehouses per company; multi-company switching exists in the app | Multi-company isolation is still in final security testing, and consolidated group reporting is not built. Offer "multi-warehouse branches" now; offer multi-company after the isolation gate passes. |
| Data migration | **Caveat, custom project only** | A scoped import of the client's spreadsheets, quoted per project | No Tally importer and no migration wizard exist. Never advertise Tally migration. |
| Training and support | **Owner decision** | Not in the codebase | **[CONFIRM]** what is included in each package. |

---

## 2. Target industries (Q2)

| Industry | Fit | Why | Promo use |
|---|---|---|---|
| FMCG distribution | **Strong** | The demo company is an FMCG and hardware distributor. Item bundles, multi-warehouse stock and grouped invoicing fit this model. | Lead |
| Hardware and electrical distribution | **Strong** | The demo catalogue covers hardware and electrical items. Barcode and serial tracking fit tagged goods. | Lead |
| General wholesale trading | **Strong** | Quote-to-cash, receivables tracking and trader invoice types. | Lead |
| Retail with counter sales | **Caveat** | A basic POS checkout (`sales/pos`) and barcode lookup exist. | Mention as an add-on after a live demo. |
| Dispatch-heavy distributors | **Caveat** | Delivery challans, grouped invoices and outward gate passes | Secondary |
| Manufacturing | **Not supported** | No bill of materials, work orders or production module | Do not target. |
| Healthcare, education, construction | **Not supported** | No domain modules | Do not target. |
| E-commerce and marketplaces | **Not supported** | No storefront or marketplace connector found in the codebase | Do not target. |
| Corporate enterprises | **Not yet** | Needs multi-company isolation and consolidation | Do not target yet. |

Market: Pakistan first, because the tax templates and demo data are PKR and Punjab GST. **[CONFIRM]** whether other countries are in scope.

---

## 3. Ideal clients (Q3)

- **Primary: small and medium wholesale distributors and traders.** One company, or a few related companies, with one main warehouse and a few branches or stores. Working model from the demo profile: 80 to 120 customers, 40 to 60 suppliers, 300 to 500 items, three warehouses.
- **Secondary: medium distributors with heavy dispatch.** These are the clients who use grouped invoicing and gate passes.
- **Not yet: large enterprises and multinationals.** They need multi-company consolidation, multi-step approvals and a passed security test. Revisit after the readiness gates close.
- **Decision makers to speak to:** owner or managing director, finance manager, sales manager, warehouse head.

**[CONFIRM]** the staff-size band for "small" and "medium". The codebase does not define one.

---

## 4. Features, benefits and the problems they solve (Q4)

| Business problem | What Traders does | Benefit line | Where in code |
|---|---|---|---|
| Quotes with several options get mixed up when they become orders | Quotation lines hold alternative options. The chosen option carries through the order, challan and invoice. **Supported.** | "Quote the options. Bill only the one the customer accepted." | `hierarchy.py`, `opportunity.py` |
| Partial deliveries need one clean invoice | Several delivery challans roll into one invoice, subject to policy checks (same customer, maximum documents). **Supported.** | "Invoice many deliveries at once, without double billing." | `grouped_invoicing.py` |
| Nobody knows who is overdue | Payment tracker: paid, part-paid, unpaid, days late, expected payment date. Receivable and payable aging reports. **Supported.** | "See who is late before they call you." | `ar_tracking.py`; reports "Receivable Aging" and "Payable Aging" |
| Small shortfalls leave invoices open forever | A write-off within a set tolerance closes the invoice in the same receipt. **Supported.** | "Close small shortfalls in the same receipt." | `ar_settlement.py` |
| One receipt covers several invoices | Receipt allocation across invoices. **Supported.** | "One payment, many invoices." | `finance.py` (`create_payment_entry`) |
| Stock figures disagree across warehouses | Stock balance and ledger by warehouse, transfers, stock take, stock aging, reorder report. **Supported.** | "Know the stock in each warehouse." | `inventory.py`; reports |
| Tagged goods are hard to trace | Serial validation on sales and purchases, plus a serial trace report. **Supported.** | "Trace any serial number from purchase to sale." | `inventory.py` (`validate_serial_for_item`), `reports.py` (`get_serial_trace_report`) |
| Scanning at the desk is slow | Barcode lookup adds items by scan. **Supported.** | "Scan to add items." | `inventory.py` (`lookup_item_by_barcode`) |
| Goods leave the gate with no record | Outward gate pass records vehicle, driver and receiver. It moves no stock and posts no ledger entry, so nothing is counted twice. **Supported.** | "A gate record for every dispatch." | `gate_pass.py` |
| Tax rules change by product, customer and date | Tax policies by goods or service, customer category and jurisdiction, with effective dates. Punjab GST templates. Withholding-tax policies. **Supported.** | "Tax that follows your rules, with a date." | `tax_policy.py`, `gst.py` |
| Foreign-currency invoices need a locked rate | FX snapshot taken at the trigger date, with validity days and a print clause. **Supported.** | "Rate locked at invoice time." | `fx_policy.py` |
| Cash desk closes by hand | Day book and day close summary. **Supported.** | "Close the day on one screen." | `daybook.py`; routes `finance/day-book` and `finance/day-close` |
| Customer wants a statement | Customer statement page. **Supported.** | "Statements in one click." | `reports.py` (`get_customer_statement`) |
| Owner wants the numbers at a glance | Dashboard with eight KPI cards (sales today, monthly revenue, receivables, payables, stock value, low stock, customers, today's orders). **Supported.** | "Start the day with the numbers that matter." | `dashboard.py` (`get_kpis`) |
| Each user sees only their own modules | Role-based access to each module, plus an audit log page. **Caveat:** module access is solid; company-level isolation is still in final testing. | "Each role sees its own screens." | `_tenant_guard.py`, `App.tsx` (`GatedRoute`), `settings/audit` |
| Discounts and purchases need a check before posting | Approval limits (for example, discounts above 10%, purchase orders above 50,000) with an approval panel. **Caveat:** this is a limit check, not a multi-step workflow. See [section 9](#9-claims-guard-do-not-publish). | Omit until a demo confirms it. | `approvals.py`, `ApprovalPanel.tsx` |
| Entries must be checked before they post | Balanced-voucher preview and decision trace exist on the backend. **Caveat:** there is no screen for them yet. | Do not market yet. | `posting.py` (`preview_posting`), `decision_log.py` (`get_decision_trace`) |

**Invoice types (Supported):** tax invoice, commercial invoice, non-GST invoice, bill of supply and credit note, all selectable on creation (`frontend/trader-ui/src/lib/invoiceTypes.ts`).

**Feature flag (Caveat):** the day book, day close, receivables and payables pages, stock take, opening stock, stock valuation and the component catalog sit behind a `requiresComponents` feature flag in `App.tsx`. They are real screens, but a client must have the flag on. Confirm it is on in any demo.

**Reports (Supported):** 29 report screens with CSV export. They include profit and loss, cash flow, trial balance, balance sheet, general ledger, customer and supplier ledgers, tax summary, and FX gain or loss. **Caveat:** the readiness report scopes the accounting tests to the flows it ran. Foreign-currency, tax and rounding edge cases are outside that evidence.

---

## 5. What makes us different (Q5)

No competitor data is in this repository, so none of the claims below compare us to named competitors. Owner: add a comparison only after checking each competitor's public product pages.

1. **Built for trading, not generic ERP.** Quote options, challans, grouped invoices, invoice types and trader masters are part of the main workflow. The quote-to-cash scenario passes 29 of 29 end-to-end checks on a fresh site (`docs/ENQUIRY_TO_CASH_CAPABILITIES.md`, 2026-10-14). *Use as "tested on sample data", not as a guarantee.*
2. **Pakistan tax built in.** Punjab GST templates, tax policies with effective dates, withholding-tax policies by party, PKR as the base currency.
3. **Customize by configuration.** Tax, grouping, FX, posting and template rules are data records, not code branches per client. Changes ship without forking the product.
4. **Open-source core.** Built on ERPNext, an open-source ERP. The repository is MIT-licensed. **[CONFIRM]** how client deployments are licensed before making any cost claim.
5. **A clean web interface, separate from the ERP desk.** Tested at 390, 768 and 1440 pixels wide (`.qa-evidence/ui-ux-2026-07-23/`). There is no native mobile app; say "works on phone and tablet browsers".

**Build before you market:** the decision trace and balanced-voucher preview. The backend exists, but no screen does yet. Once a screen exists, "see why the system posted this" becomes a strong differentiator.

**Migration note:** do not position against Tally switchers on data import. Offer a fresh start or a custom import project.

---

## 6. Visual assets (Q6)

**Answer: partly.** The repository has real screenshots, but they show test data. Re-shoot them before any post.

### What exists

| Asset | Location | Status |
|---|---|---|
| Login, dashboard, sales, customers, finance, inventory, purchases, reports, settings. Desktop 1440, tablet 768, mobile 390. | `.qa-evidence/ui-ux-2026-07-23/` | Reference only. Re-shoot for ads. |
| Dashboard, desktop and mobile | `.qa-evidence/production-readiness/` | This dashboard shows truncated values ("Rs 2,740...", "Rs 89,18...") and zero "today's sales". The readiness report says the KPI fix is in, so re-check on the current build. |
| Sales list | `ui-ux-2026-07-23/desktop-1440-03-sales.png` | Shows test names such as "mr ali" and small draft amounts. Do not use. |
| Logo | `frontend/trader-ui/public/favicon.svg` | Icon only: a blue rounded square with a bar chart. No full logo or wordmark exists. |
| Demo videos | None | Missing |
| Team photos, office photos, client testimonials, case studies | None | Missing |

### Re-shoot checklist

- Use a fresh, disposable demo site seeded from the `trader_app` demo (Global Trading Company Ltd). Never shoot on a client site.
- Fix test names so they read as real customers, or seed a cleaner dataset.
- Dashboard: populated KPIs, no truncation, at 1440 and 390 pixels.
- Shots to capture: a quotation with options, a grouped invoice, the payment tracker, stock with barcode and serial, the serial trace report, trial balance, day close, and the mobile dashboard.
- Redact everything. No real customer, supplier or client names. No pilot client name or switcher unless that client agrees in writing.

### Sizes for designers

- Feed post, portrait: 1080 × 1350
- LinkedIn or Facebook link image: 1200 × 627
- Story or Reel: 1080 × 1920
- YouTube video: 1920 × 1080

---

## 7. Offers and packages (Q7)

**Answer: not in the codebase.** The code has no prices, consultations or packages. These are recommended defaults. Every one is **[CONFIRM]**, and every price is a placeholder.

| Offer | Recommended default | Notes |
|---|---|---|
| Free discovery call | 30 minutes to review the client's stock, invoicing and receivables flow. | **[CONFIRM]** availability and who runs it. |
| Free guided demo | A live walkthrough on a disposable sandbox loaded with demo data. | Never run it on client data. The demo seeder refuses populated sites, so the sandbox must be fresh. |
| Customized solution | A written scope after discovery, priced per scope. | **[PRICE]** |
| Starter package | Single company, one warehouse, standard invoicing, payments, reports, setup and training. | **[PRICE]** |
| Growth package | Adds branches and warehouses, tax, withholding-tax and FX policies, grouped invoicing, gate passes, and configuration work. | **[PRICE]** |
| Custom package | Multi-company, data migration project, integrations. | Offer only after the isolation gate passes. **[PRICE]** |
| 30-day pilot | A dedicated site loaded with the client's own items and customers. | **[CONFIRM]** free or paid. |

**Do not offer:** free Tally migration, multi-step approval workflows, manufacturing, or consolidated group reporting.

---

## 8. Platforms and design (Q8)

### Platforms

| Priority | Platform | Audience | Formats | Why |
|---|---|---|---|---|
| 1 | **LinkedIn** | Owners, finance and operations heads, distributors | Single image, PDF carousel, short demo video, text posts with real numbers | Best B2B reach. The buyers are here. |
| 2 | **Facebook** | SME owners and traders in Pakistan | Image, short video, lead-form ads | Large local reach. Cheap to test. |
| 3 | **YouTube** | Evaluators, implementation teams | 16:9 walkthroughs, with Shorts cut from them | Searchable, and suits demos. |
| 4 | **Instagram** | SME owners, younger staff | Portrait carousels, Reels | Good for turning dashboards into visual stories. |
| Optional | **TikTok** | Broad audience | Short pain-point skits, 9:16 | Weak fit for B2B ERP buyers. Only with a dedicated content owner. |

**Recommendation:** start with LinkedIn, Facebook and YouTube. Add Instagram once there is a set of clean visuals. Deprioritize TikTok. **[CONFIRM]** the language mix: English only, or Urdu copy for Facebook and Instagram.

### Design direction: professional, modern, technology-focused corporate

Match the product, so posts look like the app they promote.

- **Typeface:** Inter. The app already uses it.
- **Primary, #1e40af:** headlines and the logo.
- **Secondary, #059669:** positive figures and calls to action.
- **Accent, #d97706:** sparingly, for highlights.
- **Dark background for video and hero shots, #172554.**
- **Neutrals:** slate greys, with #f8fafc or white backgrounds.
- **Layout:** plenty of white space. Product screenshots in clean frames. One message per post.
- **Avoid:** stock photos of handshakes and suits, neon gradients, dense text on images, and any number that has not been verified.

These colours come from the app's own theme (`frontend/trader-ui/tailwind.config.js`, `public/favicon.svg`).

### Starter post angles

1. "Quote three options. Invoice only the one the customer accepts." Carousel of the quotation flow.
2. "Who is late this week?" The payment tracker screen.
3. "Five delivery challans, one invoice." Grouped invoicing.
4. "Trace any serial number from purchase to sale." The serial trace report.
5. "Close the day on one screen." The day close summary.

---

## 9. Claims guard: do not publish

| Do not say | Why | Say instead |
|---|---|---|
| "Production-ready", "enterprise-grade", "bank-level security" | The 2026-10-05 readiness report scores the product 67 of 100 and says **not ready for production**. The security gate is open. | Omit, or say "role-based access, hardening in progress". |
| "Multi-company consolidation" | Multi-company isolation fails the readiness gate, and consolidated reporting is not built. | "Multiple branches and warehouses." |
| "Import from Tally" | Not implemented. | "Custom data import as a project." |
| "Multi-step approval workflows" | Native approval workflows are unsupported. The readiness report says not to imply role-based approvals are active. | Omit, or wait for owner confirmation (see [section 10](#10-owner-decisions-before-publishing)). |
| "Manufacturing", "production", "bill of materials" | Not implemented. | Omit. |
| "Bank reconciliation" | No bank reconciliation screen exists. | Omit. |
| "Decision trace", "see why each entry was posted" | Backend only, no screen yet. | Omit until a screen exists. |
| "99.9% uptime", "fast under load" | Load and performance are not measured. | Omit. |
| Test figures presented as client results (for example, "Rs 5,054,911 receivables" or "2,453 records") | Test data, not customers. | Only as "tested on sample data". |
| "Zero errors" as a promise | The result is from a QA run and is scoped to the flows tested. | "Accounting checks passed on sample data." |
| The pilot client's name, or screenshots that show it | No permission on record. | Only with written permission. |
| Named competitor comparisons | No competitor data in the repository. | Only after checking public pages. |
| "Mobile app" | No native app in the repository. | "Works in phone and tablet browsers." |

---

## 10. Owner decisions before publishing

1. **Prices and package tiers** for section 7.
2. **Discovery call and demo:** availability, format, who runs them.
3. **Logo and product name.** Only a favicon exists. The repository calls the product "Traders", so confirm that is the public name.
4. **Hosting claim:** will you offer managed hosting? The readiness report says production hosting, DNS and TLS renewal, and rollback are not yet proven.
5. **Pilot client as a case study:** only with written permission.
6. **Approval limits:** are they live and demonstrable in the UI? If yes, they can be marketed as "approval limits before posting". If not, drop them.
7. **Languages:** English only, or Urdu copy as well.
8. **Staff-size bands** for "small" and "medium" clients.

---

## Appendix: evidence

| Topic | Source |
|---|---|
| Production readiness, score, gates, known gaps | [`docs/PRODUCTION_READINESS_REPORT.md`](../PRODUCTION_READINESS_REPORT.md) and [`docs/PRODUCTION_READINESS_TEST_MATRIX.md`](../PRODUCTION_READINESS_TEST_MATRIX.md) |
| Quote-to-cash capabilities and the 29 of 29 end-to-end run | [`docs/ENQUIRY_TO_CASH_CAPABILITIES.md`](../ENQUIRY_TO_CASH_CAPABILITIES.md) |
| Demo company profile and scale | [`README.md`](../../README.md) |
| Routes and screens | `frontend/trader-ui/src/App.tsx` |
| Report screens (29) | `frontend/trader-ui/src/lib/reportDefinitions.ts` |
| Invoice types | `frontend/trader-ui/src/lib/invoiceTypes.ts` |
| Approval panel | `frontend/trader-ui/src/components/ApprovalPanel.tsx` |
| Brand colours and font | `frontend/trader-ui/tailwind.config.js`, `frontend/trader-ui/public/favicon.svg` |
| Real UI screenshots | `.qa-evidence/ui-ux-2026-07-23/`, `.qa-evidence/production-readiness/` |

**Stale documents, do not quote:** `docs/FEATURE_GAP_ANALYSIS.md` (May 2026) says trial balance, serial tracking and POS are missing. The code now has all three. `docs/SYSTEM_MASTER_CONTEXT.md` is marked as a historical snapshot. Use the readiness report for current status.

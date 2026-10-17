# ERP blueprint coverage: Sales Case → Quotation → OC → DC → GRB → Invoice

Checks the traders application against the reverse-engineering blueprint of the legacy SA Hamid
system (`F:\apps\sahamid\docs\erp-blueprint`: 01 capabilities, 02 findings F-01…F-37, 03 decisions
Q1…Q12 and checks S1…S17). For each item: is it present in traders, what was missing or defective, what
changed, and how it was verified. Traders is built on ERPNext 15 (Frappe), so several legacy defects
do not arise at all; those are marked **N/A (ERPNext)** with the reason.

Status: **Present** (works as specified) · **Fixed** (defect or gap closed in this change) · **Added**
(capability built in this change) · **Mitigated** (the risk is controlled by ERPNext or by a control
described here) · **Open** (needs a business decision or further work; see §5).

## 1. Summary

- The core chain already exists in traders: Project (Sales Case) → quotation with a Line → Option → Item
  hierarchy → Order Confirmation (OC) → Delivery Note (challan) → Sales Invoice, with ERPNext ledgers and
  stock. Prices are carried from quotation to invoice unchanged (no cost-based re-pricing, the source of
  legacy F-06).
- Testing against a live ERPNext site found **defects that the existing tests did not catch**. The most
  serious were in the handling of alternative options: the challan editor added every alternative to the
  delivery, the customer's accepted option was never stored (so challans and invoices billed the lowest
  option), and the option-consumption step of invoicing never ran.
- Gaps against the blueprint were also filled: finalisation rules, quick and duplicate quotations, goods
  return (GRB), revision numbering, PO requirement, credit-limit control for quotations, WHT consistency,
  template-based GST on the printed quotation, a document-chain reconciliation view, and the UI for the
  gate pass, payment tracker and fulfilment progress that the enquiry-to-cash notes listed as missing.
- Still open: decisions Q5, Q6, Q9 and Q10 (see §5), a page for the inward gate pass (the backend exists), and
  concurrency on the quotation editor.

## 2. Capability coverage (blueprint 01)

| Blueprint section | Traders implementation | Status | Evidence |
|---|---|---|---|
| §3.1–3.3 Sales Case create, close, reopen, priority, watchlist | `Trader Opportunity`; `api/opportunity.py` (`create_opportunity`, `close_opportunity`, `reopen_opportunity`, `add_customer_po`) | Present | `api/opportunity.py`; E2E `e2e_enquiry_to_cash` |
| §3.1 Sales Case access control per case (`salescase_permissions`) | Company and tenant scoping only, no per-case access list | Open | §5 (not a sahamid rule that traders needs by default) |
| §3.4 Workspace tabs | `OpportunityDetailPage` tabs | Added | New **Reconciliation** tab: document chain checks and ordered/delivered/invoiced table |
| §4.1 Line → Option → Item model | `Trader Commercial Option` child table with `items` | Present | `api/hierarchy.py` |
| §4.2–4.3 Lines and options; finalisation rules (every option needs an item; quantities above zero) | Rules enforced when a quotation is submitted | Added | `api/quotation_rules.finalization_errors`, `api/opportunity.validate_quotation_for_submit` (Quotation `before_validate`); tests `FinalizationRulesTests` |
| §4.3 Quick quotation (skips the rules) | `trader_quick_quotation` (Check on Quotation), allowed only when the profile enables it; still needs one priced item (ERPNext requires items on every quotation) | Added | `setup/custom_fields.py`; E2E step "quick quotation may leave an option unpriced" |
| §4.4 Group discount by brand | Editor action: discount by brand | Present | `components/CommercialHierarchyEditor.tsx` (`applyGroupDiscount`) |
| §4.4 "Will quote later" and "Regret" as fake stock items (F-24) | Stock-status presets (text) in the editor; no fake items | Present | `CommercialHierarchyEditor.tsx` (`STOCK_STATUS_PRESETS`) |
| §4.5 Pricing: discount from material cost; printed net ≠ typed rate (F-06) | Typed unit price and discount are stored; the quotation, OC, challan and invoice carry the same rate | N/A (ERPNext) | `hierarchy.flatten_commercial_options`; E2E figures unchanged |
| §4.6 Option quantity = number of sets | `package_qty × unit_qty` per item | Present | `hierarchy.effective_item_qty` |
| §4.7 Revisions R1, R2 | `create_quotation_revision`; label now the next free number | Fixed | `next_revision_number`; E2E "a deleted revision is not reused (R2 then R3)" |
| §4.7 Duplicate quotation | `duplicate_quotation_for_opportunity`, gated by profile flag `allow_duplicate_quotation` | Added | `api/opportunity.py`; E2E "duplicate quotation is a clean draft" |
| §4.8 One open draft per case | `_find_open_quotation_draft`; `force_new` to override | Present | `api/opportunity.py` |
| §4.9 Finalisation transaction (F-15) | Frappe runs each API request in one transaction | N/A (ERPNext) | Frappe request model |
| §4.10 Printed quotation totals | Net is the first option per line (as before); GST rate now follows the quotation's tax template | Fixed | `commercial_totals.template_tax_rate`; E2E "printed quotation uses the template rate" |
| §5 OC from a quotation; one OC per customer PO | Uniqueness per PO already enforced; PO number now mandatory when the profile requires it | Fixed | `create_order_confirmation`; profile flag `require_po_for_oc` (on for Electrence); E2E "refused without a customer PO" |
| §5 OC takes the option the customer accepted | Selection validated, stored as `is_selected` on the OC, and carried to the challan and invoice; picker in the OC panel | Fixed | `hierarchy.apply_selection`, `resolve_selection`; `OpportunityDetailPage` picker; E2E "OC orders the accepted premium option" |
| §6 Challan (DC) built from the OC | Built from the OC's accepted option; refused without an OC (no arbitrary stock item) | Fixed | `create_delivery_note_for_opportunity`; E2E "challan without an order confirmation is refused" |
| §6.2 Challan hierarchy save adds only the accepted option (F-01/F-05 class) | Sync bills the resolved selection for orders, challans and invoices; previously every alternative was flattened into stock lines | Fixed | `hierarchy.sync_flat_items_from_hierarchy`; E2E "saving the challan hierarchy does not add the alternative option" |
| §6.3 Challan price (re-keyed in the DC, F-06/Q3) | Challan rate equals the OC rate | Present | E2E "challan from the OC delivers the accepted option"; reconciliation `delivery_rates` |
| §6.4 Stock issue on challan (F-07) | ERPNext stock ledger reduces stock on submit | N/A (ERPNext) | E2E "challan 1 submits and moves stock"; reconciliation `stock_moved` |
| §6.5 Challan save, option-level concurrency (F-33) | Save refused when the document changed since it was opened (`expected_modified`) | Fixed (challan editor only) | `save_commercial_options`; E2E "stale hierarchy save is refused". Quotation editor still open (§5) |
| §7 GRB, goods return against a challan | `create_return_delivery_note`: ERPNext return challan (`is_return`), negative quantities, stock returns through the ledger; button on the challan page | Added | `api/opportunity.py`; E2E "goods return creates a return challan that puts stock back" |
| §8.1 Choosing challans; grouping | `create_grouped_invoice` (same debtor, max documents policy) | Present | `api/grouped_invoicing.py` |
| §8.2 Invoice from challan, partial | Remaining quantity per line; `per_billed` tracks partial billing | Present | `grouped_invoicing.create_grouped_invoice` |
| §8.4 Only the billed option is invoiced (F-04) | Billed option only; the alternative keeps its package quantity open. The old consumption step never ran (child-table field tested with `has_column`), now fixed | Fixed | E2E "the unbilled alternative is not marked invoiced" (billed 2.0, alternative 0.0) |
| §8.3 Invoice save transaction (F-08) | One Frappe transaction; commit only after the invoice is submitted | N/A (ERPNext) | `grouped_invoicing` |
| §9 Invoice return (credit note) | ERPNext credit note (`is_return`) from the sales return page | Present | `api/sales.py`; `CreateSalesReturnPage.tsx` |
| §10 Tax: templates, rates and cutoffs (F-03, F-12, F-13) | Tax templates per document; Trader Tax Policy; no hard-coded rates on the invoice; no "update GST" action | Present | `api/tax_policy.py`, `api/gst.py` |
| §10 Withholding 4.5% on every invoice (F-14) | Invoice withholding follows the WHT policy (by amount threshold); a quotation whose withholding differs is flagged | Mitigated | `grouped_invoicing._warn_on_withholding_mismatch`; reconciliation `withholding_consistent`; E2E "withholding differs ... is logged" |
| §11 Posting: accounts and COGS (F-10, F-11) | ERPNext GL on submit; COGS posted on the challan with perpetual inventory (enabled at provisioning); no hard-coded accounts | Mitigated | `api/super_admin.py`, `demo/generators/company.py`; reconciliation `ledger_balanced` |
| §12 Reconciliation view | `get_opportunity_reconciliation` and the Reconciliation tab: quotation totals, order selection, challan and invoice rates and quantities, stock moved, ledger balance, receivable ties to invoice, gate pass release, withholding | Added | `api/reconciliation.py`; tests `ReconciliationHelperTests`; E2E "document chain reconciles" |
| §13 Receipts, allocations, credit notes | Payment Entry allocation; write-off tolerance; tracker | Present | `api/finance.py`, `api/ar_settlement.py`, `api/ar_tracking.py` |
| §13 Outward gate pass (IGP/OGP) | `Trader Gate Pass`: issue, cancel, dispatch status; panel on the challan page | Added (UI) | `api/gate_pass.py`; `DeliveryChallanDetailPage.GatePassPanel`; E2E gate pass checks |
| §13 Inward gate pass (IGP) | `Trader Inward Gate Pass` against a submitted Purchase Receipt: create, cancel, list. Records arrival only; no stock or GL. No UI yet | Added (backend) | `trader/doctype/trader_inward_gate_pass`; `api/gate_pass.py`; E2E "inward gate pass records the arrival" |
| §13 Payment tracker and fulfilment progress | Backend existed; UI added as a view on Receivables and on the Project | Added (UI) | `components/InvoicePaymentTracker.tsx`; `pages/ReceivablesPage.tsx`; `pages/OpportunityDetailPage.tsx` |
| §13 Shop, POS, purchasing, stock transfers, production | Present in traders as separate modules | Present | `api/pos.py`, `api/purchases.py`, `api/inventory.py`, `api/bundling.py` |

## 3. Findings register (blueprint 02)

| ID | Legacy finding | Traders status | Evidence / note |
|---|---|---|---|
| F-01 | DC option delete reads and deletes OC tables | N/A (ERPNext) | No option-delete endpoint on challans; the hierarchy is saved as a whole |
| F-02 | Client-named column written by update endpoints | Not present | `opportunity.update_opportunity`, `admin.py` and `super_admin.py` write only to allow-listed fields |
| F-03 | "Update GST" writes the literal `update` | Not present | No such action; tax comes from templates |
| F-04 | Only option 0 billed but every option marked invoiced | Fixed | Accepted option only is billed and consumed (§2) |
| F-05 | Three totals disagree on multi-option lines | Mitigated | The editor shows "All options" (information) and "Billed"; the print and the invoice use the billed option |
| F-06 | Printed net is cost-based, not the typed rate | N/A (ERPNext) | Typed rates are carried unchanged |
| F-07 | Challan does not reduce quantity on hand | N/A (ERPNext) | Stock ledger on submit; reconciliation `stock_moved` |
| F-08 | Invoice commits before the GL error check | N/A (ERPNext) | Single transaction per request |
| F-09 | Invoice return not transactional; GL reversal type | N/A (ERPNext) | Credit note is one ERPNext document |
| F-10 | No COGS or inventory posting on the invoice path | Mitigated | COGS on challan submit (perpetual inventory) |
| F-11 | Hard-coded accounts (1, 1100, 2310) | Not present | Accounts come from company defaults and profiles |
| F-12 | Hard-coded tax rates and 20% split | Fixed (printed quotation) | Quotation print uses the template rate (`commercial_totals.template_tax_rate`). The editor's on-screen estimate still assumes 18% / 16%: open, see §5 |
| F-13 | One tax treatment per invoice | Mitigated | ERPNext item tax templates and per-document templates |
| F-14 | Quote withholding and invoice withholding unrelated | Mitigated | Warning, decision-log entry and reconciliation check. Policy decision Q5 open |
| F-15 | Finalisation not transactional | N/A (ERPNext) | Single request transaction |
| F-16 | Audit rows keep temporary number | N/A (ERPNext) | Document version history |
| F-17 | Price and quantity endpoints without session check | Not present | Whitelisted Frappe methods require login; module guards on sales APIs |
| F-18 | SQL built by concatenation | Not present in reviewed code | Dynamic SQL in `bundling.py`, `customers.py`, `catalog.py` binds user input as parameters |
| F-19 | Database credentials in source | Not present | Secrets live in git-ignored `compose/.env`, `cookies.txt`, `auth_cookies.txt` |
| F-20 | Double submit posts twice | Mitigated | ERPNext over-billing check and timestamp check on submit |
| F-21 | Stock lookup ignores the document | N/A (ERPNext) | Stock per warehouse (Bin) |
| F-22 | Discard leaves in-progress rows | N/A (ERPNext) | Discarding a draft deletes the document |
| F-23 | Location hard-coded to one warehouse | Fixed (preference) | The main warehouse of the company is preferred; the first warehouse by name is only a fallback. A per-customer default is open (Q10) |
| F-24 | Placeholder items with fixed codes | N/A | Text presets, no fake items |
| F-25 | Option price stored but never read | Fixed | `package_price` is derived from the items on every write |
| F-26 | Item-level invoiced quantity counts per set | Mitigated | Billed quantity tracked per challan line (`trader_qty_invoiced`) |
| F-27 | Invoice numbers used at draft creation | Open | ERPNext naming on insert. Decision Q9 |
| F-28 | Credit-limit warning is client-side only | Fixed | Quotations: Warn or Block with decision-log entries (`api/credit_control.py`). Orders and invoices: ERPNext blocks unless the user holds the credit-controller role. The old invoice-draft warning was removed so the check runs once |
| F-29 | No foreign keys; comma-separated challan list | N/A (ERPNext) | Child tables and links |
| F-30 | Revision label count-based | Fixed | `next_revision_number` (highest existing + 1) |
| F-31 | `GetNextTransNo` commits open transactions | N/A | Not used |
| F-32 | Legacy copies and stray files | N/A | Traders has one code base; hygiene note: `commit_msg.txt` is tracked |
| F-33 | One shared in-progress quotation, no lock | Partly fixed | Challan hierarchy saves refuse stale writes; quotation editor not yet (§5) |
| F-34 | `lastquotationdate` only written by legacy flows | N/A | ERPNext `transaction_date` |
| F-35 | Unrelated sample SQL | N/A | Not present |
| F-36 | Discarding a draft invoice hard-deletes it | Open | ERPNext draft deletion; decision with Q9 |
| F-37 | Warnings endpoint returns counters | N/A | Not present |

## 4. Decisions Q1…Q12 (blueprint 03)

| Question | Traders position |
|---|---|
| Q1 What does an option mean? | Options are alternatives within a line. Exactly one is billed per line: the one the customer accepted, or the lowest-numbered one when none is recorded. Confirmed by the code and the tests. |
| Q2 Cost basis for quotes | Typed prices, no cost basis. Confirm with the business. |
| Q3 Which document sets the invoice price? | The accepted quotation and OC rate, carried through the challan. The challan no longer re-prices. |
| Q4 Who reduces stock? | The challan, on submit, through the ERPNext stock ledger. Positive or negative sign follows ERPNext. |
| Q5 What tax applies? | Open: rates and the 4.5% withholding need a tax review. Traders uses templates and the WHT policy. |
| Q6 Is the credit limit enforced? | Quotations: Warn by default, Block on the company's AR profile. Orders and invoices: blocked by ERPNext. Decision: whether quotations should default to Block. |
| Q7 When is cost of sales posted? | On challan submit (perpetual inventory). Confirmed. |
| Q8 Which accounts? | Company defaults and the AR profile, not hard-coded codes. Confirm the chart. |
| Q9 Gapless invoice numbers? | Open. ERPNext numbers on insert, so discarded drafts leave gaps. |
| Q10 Default location? | Open. The main warehouse is preferred; a per-customer default is not built. |
| Q11 "Will quote later" and "Regret" | Stock-status presets, not fake items. Closed. |
| Q12 Which API paths are reachable without login? | Traders endpoints require login (no guest endpoints). Confirm the reverse proxy in production. |

## 5. Open items

1. **Q5, tax and withholding.** Confirm the GST rates, the 4.5% WHT and the 20% split with the tax rules in force.
2. **Q6, credit default.** Decide whether quotation finalisation should default to Block. The setting exists on each company's AR profile; the Electrence template keeps Warn.
3. **Q9 and F-36, invoice numbering.** Decide whether gaps are acceptable. Gapless numbering would need numbers assigned at submit.
4. **Q10 and F-23, default location per customer.** Warehouse is chosen per company today.
5. **F-33, quotation editor concurrency.** The quotation editor saves its header before its hierarchy, which changes `modified`. A stale-save check there needs the header save to return the new stamp.
6. **Editor estimate.** `frontend/trader-ui/src/lib/commercialTotals.ts` still assumes 18% / 16% for the on-screen estimate. The printed quotation uses the template rate.
7. **Inward gate pass UI.** The backend is built (`Trader Inward Gate Pass`, linked to a submitted Purchase Receipt). No page or panel calls it yet; add one on the purchase receipt or purchase order screens.
8. **Flags with no effect.** `partial_invoicing`, `oc_maps_to`, `hierarchy_on_*` and `require_opportunity_for_quotation` are stored in the profile but nothing reads them. They are presets only; enforcing them is a product decision.

## 6. What changed

**Backend** (`apps/trader_app/trader_app`)
- `trader/doctype/trader_commercial_option`: `is_selected` (accepted option per line).
- `trader/doctype/trader_ar_profile`: `credit_limit_action` (Warn or Block; default Warn).
- `trader/doctype/trader_inward_gate_pass` (new): inward gate pass against a submitted Purchase Receipt; `api/gate_pass.py` gains `create_inward_gate_pass`, `cancel_inward_gate_pass`, `list_inward_gate_passes`.
- `trader/doctype/trader_opportunity_profile`: `require_po_for_oc`.
- `setup/custom_fields.py`: `Quotation.trader_quick_quotation`.
- `api/hierarchy.py`: selection resolution (`resolve_selection`, `apply_selection`, `selected_rows`, `invalid_selections`), derived `package_price`, selection-aware sync for orders, challans and invoices.
- `api/opportunity.py`: OC validation and stored selection, PO requirement, no placeholder items, challan from OC only, stale-save check, revision numbering, duplicate and quick quotation, quotation submit rules, goods return, default-warehouse preference.
- `api/grouped_invoicing.py`: bills and consumes only the accepted option; hierarchy copy fixed; withholding warning.
- `api/commercial_totals.py`: template GST rate for the printed quotation.
- `api/credit_control.py` (new): quotation credit control.
- `api/quotation_rules.py` (new, pure): revision numbering, finalisation rules, credit decision, withholding comparison.
- `api/reconciliation.py` (new): document-chain reconciliation endpoint.
- `api/sales.py`: credit warning moved out of invoice drafts.
- `hooks.py`: Quotation `before_validate` (rules) and `before_submit` (credit).

**Frontend** (`frontend/trader-ui/src`)
- `lib/commercialOptions.ts` (new) with tests; `lib/api.ts` wrappers for the new endpoints.
- `components/CommercialHierarchyEditor.tsx`: accepted option kept, "Mark as accepted", billed total by selection, stale-save stamp.
- `components/InvoicePaymentTracker.tsx` (new), `pages/ReceivablesPage.tsx`: "By invoice" view.
- `pages/OpportunityDetailPage.tsx`: accepted-option picker for the OC, Reconciliation tab.
- `pages/DeliveryChallanDetailPage.tsx`: goods return, gate pass panel, stale-save stamp.
- `pages/QuotationDetailPage.tsx`: Duplicate action.

**Tests and tooling**
- `trader_app/tests/test_sahamid_chain.py` (new, 38 tests): selection, package price, revisions, finalisation, credit decisions, withholding, template GST, reconciliation helpers.
- `trader_app/scripts/e2e_sahamid_chain.py` (new): live scenario, one check per behaviour, run on a disposable site.
- `docs/implementation-progress.manifest.json`: `qw-sales-credit-except` now verifies the credit module (the check moved); tracker re-synced.

## 7. Verification

| What | Result |
|---|---|
| Pure-logic unit tests (`python -m unittest discover -s trader_app/tests -t .`) | 264 run, 13 skipped, all pass (226 before this change) |
| Live E2E, enquiry-to-cash (`e2e_enquiry_to_cash`) on disposable site `traders-e2e-20261014.invalid` | 29 / 29 on the baseline run; 29 / 29 on the final code (final run) |
| Live chain scenario (`e2e_sahamid_chain`), before the fixes | 1 / 21 passed. This first run had a setup error in the scenario (the customer PO was not registered), so every check after the OC was blocked by it. The checks that reached the code showed: an order accepted with no quotation, a repeated revision label (R2, R2), a crash on a challan with no source, a crash on a quotation option with no items, no quick quotation, no duplicate, no goods return, no reconciliation. The accepted-option defects (§2) were confirmed from the code and by the post-fix run, which tests them directly; the baseline run could not reach those steps |
| Live chain scenario, after the fixes | 24 / 24 checks passed (final run, including the inward gate pass step) |
| Frontend unit tests (`vitest run`) | 27 pass (8 new in `commercialOptions.test.ts`) |
| Type check (`tsc -b`) | Pass |
| Lint (`eslint .`) | 0 errors; warnings pre-existing in unchanged code |
| Production build (`vite build`) | Pass |
| Progress tracker (`npm run progress:sync`) | 11 / 11 verified |

Notes on the live runs:
- They ran on a disposable site created in the QA stack's backend container. The existing QA sites were not written to.
- The Frappe integration suites (`test_sales_lifecycle_integration`, `test_daybook_integration`) look for a company named "Electrence". The disposable site has the demo company, so they skip. The scenarios above cover the same ground on the demo company.
- The UI was checked by type checking, unit tests and build. It was not exercised in a browser in this session.

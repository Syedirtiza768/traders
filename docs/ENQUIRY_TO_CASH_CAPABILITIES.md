# Enquiry-to-Cash — capability coverage

Source: the sahamid walkthrough (`F:\apps\sahamid\docs\walkthrough\README.md`) — a new customer, three
quotations with alternative options, an Order Confirmation, two partial delivery challans, two invoices,
three receipts and payment tracking, with the double-entry ledger checked at every step.

This document records how each capability maps onto Traders, what was added, what was fixed, and how it was
verified. Built on the existing Commercial Opportunity (`OPP`) and Customer AR (`AR-DOC`) packs.

## 1. Coverage

| # | Walkthrough capability | Traders implementation | Status |
|---|---|---|---|
| 0 | New customer with payment terms and an expected-payment lead time | ERPNext Customer + payment terms template; **`trader_payment_expected_days`** (new custom field) | **Added** |
| 1 | Enquiry recorded in a salescase | `Trader Opportunity` (`api/opportunity.py`: `create_opportunity`, comments, watchlist) | Existing |
| 2 | Several quotations, each with lines → alternative options → items; revisions R1/R2 | `Quotation` + `Trader Commercial Option` hierarchy, `create_quotation_for_opportunity`, `create_quotation_revision` | Existing |
| 3 | Customer PO → one OC per PO, copied from a chosen quotation | `add_customer_po`, `create_order_confirmation` | Existing — **fixed** (see §2.1, §2.3) |
| 4 | Partial delivery challans against the OC | `create_delivery_note_for_opportunity`, `save_commercial_options` | Existing — **fixed** (see §2.2) |
| 4b | Outward gate pass (physical release record, vehicle/driver/receiver) | **`Trader Gate Pass`** DocType + `api/gate_pass.py` | **Added** (was *Missing*, FEATURE_COVERAGE I5) |
| 5 | Invoice raised from delivery challans, partial / grouped | `create_invoice_for_opportunity` → `create_grouped_invoice` | Existing — **fixed** (see §2.3, §2.4) |
| 6 | Receipts with explicit, multi-invoice allocation | `finance.create_payment_entry` + allocations | Existing |
| 6b | Invoice closes when a receipt is short by no more than the settle tolerance | **`api/ar_settlement.py`** — write-off deduction inside the Payment Entry | **Added** |
| 7 | Invoice payment tracking: paid / part paid / unpaid, due and *expected* dates, days late, payment history | **`api/ar_tracking.py`** (`get_invoice_payment_tracker`, `get_invoice_payment_history`) | **Added** |
| 7b | Ordered vs delivered vs invoiced per opportunity | **`api/fulfilment.py`** (`get_fulfilment_progress`, also embedded in `get_opportunity`) | **Added** |
| 8 | Double-entry integrity across the whole chain | ERPNext GL + stock ledger; verified by the scenario | Verified |

## 2. Defects found and fixed while verifying

Each was reproduced on a real ERPNext site by the end-to-end scenario before being fixed.

1. **Every alternative on a quotation became an order line.** `create_order_confirmation` flattened *all*
   options of every line into stock lines, so the Order Confirmation ordered the economy *and* the branded UPS
   (value ≈ 2× what was quoted). Fix: only **one option per line** becomes ordered stock lines —
   `selected_options` (`{line_no: option_no}`) chooses it, lines not mentioned default to their lowest option
   (the rule quotations already use). The full hierarchy is still kept on the OC. A challan created from the OC
   follows the same rule. New pure helper `hierarchy.select_options`.
2. **Challans created from an OC could not be submitted.** Rows carried `against_sales_order` without the
   order-line reference (`so_detail`), which ERPNext rejects ("Against Sales Order Item is not set"). New
   Delivery Note validate hook `order_linking.link_delivery_note_to_order` matches each row to a submitted OC
   line of the same Opportunity (item match, remaining quantity first), so the order's delivered qty and
   status update natively. Rows with no match are left cleanly unlinked.
3. **Invoices raised from challans carried no tax.** The tax-policy hook stamped a template *after* ERPNext had
   calculated totals, so nothing was taxed. `apply_tax_policy` now expands the template and recalculates;
   `create_grouped_invoice` additionally uses the tax template of the order being delivered against, and the OC
   now inherits the quotation's template.
4. **Back-dated invoice dates were ignored.** `create_grouped_invoice(posting_date=…)` was reset to today by
   ERPNext; it now sets `set_posting_time` when a date is passed.

## 3. Deliberate differences from the legacy system

The walkthrough also exposed behaviours in the legacy ledger that are **not** reproduced here:

| Legacy behaviour | Traders |
|---|---|
| A part payment posted a bank debit with no matching receivable credit, leaving the GL unbalanced until the invoice settled | Payment Entries are balanced vouchers; the receivable is credited with every receipt |
| An invoice "settled" within tolerance but the shortfall was posted nowhere (GL out by the shortfall) | The shortfall is a **write-off deduction** on the same Payment Entry (Dr write-off account), so the voucher balances and the invoice's outstanding is exactly 0 |
| Customer sub-ledger and GL AR disagreed by the residual | Same document, same number: outstanding and GL receivable agree |
| Gate pass decremented stock; no inventory/COGS journal existed | Delivery Note posts stock + COGS; a **gate pass moves no stock and posts no GL** (it would double count) |
| GL account codes and GST rates hard-coded | Resolved from the AR profile and Trader Tax Policy |

## 4. New configuration (all opt-in)

| Setting | Where | Effect when unset |
|---|---|---|
| `write_off_account` | Trader AR Profile | Settle-tolerance write-off disabled |
| `settle_tolerance` | Trader AR Profile (existing field) | `0` → disabled |
| `trader_payment_expected_days` | Customer | No expected-payment date is stamped |
| `trader_expected_payment_date` | Sales Invoice (stamped on validate; editable) | — |

The tolerance write-off only touches a Payment Entry that is a customer *Receive*, only for invoices short by
`0 < shortfall ≤ tolerance`, is idempotent across re-saves of a draft (rows carry a `TRADER-TOLERANCE|invoice|amount`
marker), and logs a `posting` decision in the Decision Log.

## 5. API added

| Endpoint | Purpose |
|---|---|
| `trader_app.api.ar_tracking.get_invoice_payment_tracker(company, customer, opportunity, as_of, status, include_settled)` | Rows + summary, status/bucket (`settled` / `current` / `expected_missed` / `overdue`) |
| `trader_app.api.ar_tracking.get_invoice_payment_history(invoice)` | Receipt allocations against one invoice |
| `trader_app.api.fulfilment.get_fulfilment_progress(opportunity)` | Ordered / delivered / invoiced by item with pending and % |
| `trader_app.api.gate_pass.create_gate_pass / cancel_gate_pass / list_gate_passes / get_dispatch_status` | Outward gate pass lifecycle |
| `trader_app.api.opportunity.create_order_confirmation(…, selected_options)` | New optional argument |

New DocTypes: `Trader Gate Pass`, `Trader Gate Pass Item`. Run `bench migrate` to create them and the custom fields.

## 6. Verification

| What | Result |
|---|---|
| Pure-logic tests `tests/test_walkthrough_capabilities.py` (35) + existing `test_sales_lifecycle` (49) | 84 / 84 pass, locally and under `bench run-tests` |
| End-to-end scenario `scripts/e2e_enquiry_to_cash.py` on a fresh ERPNext 15 site seeded with `install_demo` | **29 / 29 checks pass** (run 2026-10-14) |

The scenario uses the walkthrough's figures: option‑0 quotation totals 1,044,000 / 1,197,700 / 1,161,400; OC 1,161,400;
INV 1 = 615,600 + 18 % = 726,408; INV 2 = 545,800 + 18 % = 644,044; receipts 300,000 / 526,405 (split 426,405 + 100,000) / 400,000;
INV 1 closed with a 3.00 write-off; INV 2 left with 144,044 open and 6 days past its expected date. It also asserts that every
voucher balances (Dr = Cr, including the delivery notes' stock/COGS vouchers) and that the customer sub-ledger equals the GL receivable.

Re-run:

```bash
# disposable site only — it creates real documents
bench --site <site> execute trader_app.scripts.e2e_enquiry_to_cash.run \
      --kwargs "{'company': '<company>', 'run_tag': 'R1'}"
```

`run_tag` keeps the customer PO number unique when the scenario is repeated on the same site.

## 7. Not done / follow-ups

- **UI added.** Payment tracker: Receivables → *By invoice*. Fulfilment and document-chain reconciliation: Project →
  *Reconciliation* tab. Outward gate pass: panel on the delivery challan. Accepted option: picker in the Project's
  *Make OC* panel, and *Mark as accepted* in the commercial editor (the accepted option is stored on the document and
  is what the challan and invoice bill).
- A follow-up audit against the sahamid ERP blueprint found and fixed defects in the option handling (a challan saved
  from the editor added every alternative; the accepted option was not stored, so challans billed the lowest option; the
  option counter on invoicing was never written). See [ERP_BLUEPRINT_COVERAGE.md](ERP_BLUEPRINT_COVERAGE.md) for the full
  mapping, the findings closed, and the decisions still open.
- The AR profile form shows the new `write_off_account` field, but provisioning templates leave it empty — set it per company.
- Inward gate passes (FEATURE_COVERAGE H5): the backend is built (`Trader Inward Gate Pass` against a submitted Purchase
  Receipt, arrival only, no stock or GL). No UI yet.
- The quotation WIP / `quotationmodifications` audit rows of the legacy system have no equivalent; ERPNext versioning and the
  Decision Log cover auditability.
- `withhold_reporting_enabled` (WHT / GST-withhold journal on settlement, existing) was left **off** in the scenario to keep
  the figures identical to the walkthrough; it is unchanged by this work.
- Working tree note: `hooks.py`, `opportunity.py`, `ar.py` and others already had uncommitted changes before this work; nothing was committed.

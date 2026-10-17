# Case mapping: sahamid MT-2595-2022-02-21--030817 → Traders

End-to-end map of one complex sales case from the legacy sahamid ERP (salesperson Muhammad Bilal) onto
Traders (ERPNext 15 + `trader_app`). Each legacy step is traced to the Traders document or API that carries
it, the record is reconciled line by line, and the gaps found on the way are listed with their status.

Evidence: `F:\apps\sahamid\sahamid_data.zip` (`sahamid_data.sql`, snapshot dated 2026-07-07). Legacy tables are
named as they appear there. Nothing was written to any live site.

## 1. Why this case

Selected from the 6,505 sales cases where Muhammad Bilal is salesman. Filter: closed (`closed = 1`) at stage **DC**.
Ranking: linked quotations, OCs and challans (score = quotations + 2 × OCs + 2 × challans). This case scored highest
among his closed DC cases: one quotation, two OCs, seven challans. The snapshot does not record who closed it, so
"completed by" is read as salesman of record.

| Legacy fact | Value |
|---|---|
| Salescase | `MT-2595-2022-02-21--030817`, index 52096 |
| Customer | Bulleh Shah Packaging (Private) Limited (debtor `MT-2595`) |
| Subject | RFQ #6-109215 (Hensel boxes, P+F sensors, splicing connector) |
| Salesman | Muhammad Bilal |
| Commenced | 2022-02-21 15:11 |
| Customer POs | **two**: `4500075386` and `4500075421` |
| Quotation | order `42215` (`ocs.quotationno`), 14 option-0 lines, 1 alternative |
| Order Confirmations | `13786` for PO …386 (2022-03-14 13:03), `13789` for PO …421 (2022-03-14 15:03) |
| Challans (DC) | **7**: 2 against PO …386, 5 against PO …421, 2022-03-15 to 2022-08-06 |
| Closed | 2022-08-10 11:43, reason `Case Closed`, stage `DC` |
| Closed by | not recorded in the snapshot (no `closed_by` equivalent) |

## 2. Step-by-step map

| # | Legacy step (table / screen) | Traders equivalent | Status |
|---|---|---|---|
| 1 | Enquiry opens a case (`salescase`, `selectsalescase`) | `Trader Opportunity` via `create_opportunity` | Present |
| 2 | Salesman, debtor, branch, priority, watchlist (`salescase`, `salescase_watchlist`) | Owner, customer, branch, priority, watchlist | Present |
| 3 | Dated comments with user (`salescasecomments`: "PENDING ML50.102 1 PC", "Pending Material PO …421", "Material Delivered") | Opportunity comments via `add_opportunity_comment` (`commented_by`, `commented_at`) | Present |
| 4 | Per-item case remarks (`salescaseremarks`, 14 rows, all blank) | Line text on the commercial option (`client_requirements`) | Present (no separate remark store needed) |
| 5 | Customer PO register (`salescasepo`: `pono`, `povalue`, `pocount`) | `Trader Opportunity.customer_pos` via `add_customer_po` (PO no must be unique) | Present |
| 6 | Quotation with lines → alternatives → items (`salesorders`, `salesorderlines`, `salesorderdetails`, `salesorderoptions`) | `Quotation` with `trader_commercial_options` (`api/hierarchy.py`) | Present |
| 7 | Accepted option per line (line 13 has KF 0400 B as option 0 and KF 0600 B as option 1) | `is_selected` on the OC, one option per line (`hierarchy.resolve_selection`) | Present |
| 8 | Quotation edit audit (`quotationmodifications`: item added, price 98,500, stock status "6 ~ 8 Weeks", description, quantity) | ERPNext Version on the Quotation and the Decision Log; no typed per-line change log | Partly (see §5, G-7) |
| 9 | Payment terms: 0 / 0 / 0 / **100% after 45 days**, validity 15 (`salesorders.after`, `afterdays`, `validity`) | Payment Terms Template on the customer/quotation; `trader_payment_expected_days` on the customer | Partly (confirm the template is seeded for this terms type) |
| 10 | Tax clause `exclusive`, GST text (`freightclause`, `gst`) | Tax template per document (`api/tax_policy.py`, `commercial_totals.template_tax_rate`) | Present |
| 11 | Currency snapshot: `rate_clause = usd`, `clause_rates` JSON (AED 45, USD 170, EUR 192, GBP 235), `rate_validity` 2022-03-08 | None. Multi-currency is listed as missing in `CRITICAL_GAPS_ACTION_PLAN.md` §6 | Open (G-6) |
| 12 | OC per customer PO (`ocs`: `pono`, `quotationno`, `customerref`) | `create_order_confirmation(customer_po_no, selected_options)`: one OC per PO, `so.po_no` set | Present |
| 13 | Challan header per delivery (`dcs`: `orderno` = challan no, `customerref` = PO text, `deliverto`, `despatchdate`) | `Delivery Note` via `create_delivery_note_for_opportunity` | Fixed: PO now carried (G-2) |
| 14 | Challan lines (`dcdetails`: `orderlineno`, `stkcode`, `quantity`, `unitprice`, `discountpercent`) | Delivery Note items, rebuilt from the OC's selected option (`sync_flat_items_from_hierarchy`) | Present (no link to the quote line number, see G-4) |
| 15 | Challan option text, stock status, option price (`dcoptions`, `dclines`) | Delivery Note hierarchy (`trader_commercial_options`) | Present |
| 16 | Which challan is for which PO | Delivery Note `po_no` and `source_oc` | Fixed (G-1, G-2) |
| 17 | Case closure (`salescase.closed`, `closingreason`, `closingremarks`, `stage`, `closingdate`) | `close_opportunity(close_stage, close_reason)`; stage map: Enquiry, Quotation, PO → Customer PO, DC → Delivery | Fixed: reason kept, guarded (G-3) |
| 18 | Invoice per challan (`dcdetails.qtyinvoiced = 1`, `dcs.invoicedate` stamped) | `create_grouped_invoice` / `create_invoice_for_opportunity`, `per_billed` | Present, but no invoice found in the snapshot (see §4) |
| 19 | Gate pass (`igp`, `igpitems`) | `Trader Gate Pass` (`api/gate_pass.py`) | Present |
| 20 | Per-case access list (`salescase_permissions`) | Company and tenant scoping only | Open (ERP blueprint §3.1) |

## 3. Reconciliation: quotation → Order Confirmations → challans

Net = unit price × (1 − discount). Legacy challan lines are the `dcdetails` rows whose `orderno` is one of the seven
challan numbers.

| Quote line (option 0) | Net on quote | Delivered on challan | Challan | Result |
|---|---:|---|---|---|
| KV 9112 junction box | 15,050 | yes | 71427 (PO …421) | Net matches |
| KV 9106 junction box | 8,507 | **no** | — | **Not delivered; case closed anyway** |
| SMPS 30102 | 37,660 | yes | 71423 (PO …386) | Net matches |
| SMPS 50102 | 46,061 | yes | 72646 (PO …386) | Net matches; list re-grossed (102,006 at 54.8%) |
| RIPS 194784 sensor | 26,510 | yes | 71423 | Net matches |
| CIPS 085567 sensor | 10,175 | yes | 71423 | Net matches |
| CIPS 800735 sensor | 7,700 | yes | 71427 | Net matches |
| CIPS 800734 sensor | 7,700 | yes | 71427 | Net matches |
| SPLCON 221-612 splicing connector | 100 | **no** | — | Replaced on 71427 by **221-412 (not on the quote)** at the same net 100 |
| MIPS 264855 | 57,780 | yes | 72390 (PO …421) | Net matches; list re-grossed (114,114 at 49.4%) |
| RDMPES 183068 (quoted twice) | 16,910 × 2 | yes, ×2 | 71436, 72390 | Matches |
| KF 0600 B (line 12) | 4,782 | yes, **×2** | 71427, 71590 | **Second unit delivered; see G-5** |
| KF 0400 B (line 13, option 0, accepted) | 3,225 | yes | 72685 (PO …421) | Net 3,228 (list 6,654 at 51.5%) |
| KF 0600 B (line 13, option 1, alternative) | not billed | — | (counted in the ×2 above) | Alternative delivered |

Totals: quoted option-0 net **259,070** (list 475,472). Delivered net **255,345** across 14 challan lines:
PO …386 **120,406**, PO …421 **134,939**. Gap of 3,725 = open KV 9106 (8,507) − extra KF 0600 B (4,782).

Two things in the reconciliation matter for the design:

- Legacy challans re-gross the list price and discount but hold the **net** rate, so the net reconciles on every
  challan line that matches an OC line. Traders holds the typed rate from the OC to the challan and invoice, so it
  cannot drift. Good.
- Every legacy challan line has `lineoptionno = 0`. The challan therefore cannot show which alternative was delivered.
  Traders keeps the selection on the OC, which is why it can answer that question.

## 4. Invoices

The challan lines carry `qtyinvoiced = 1`, and the challan headers carry `invoicedate`. The snapshot has **no**
`debtortrans` row that points at the quotation, the two OCs or the seven challan numbers. Either the invoices were
raised in another record set, or they were never posted. This needs a finance check before the mapping is used
as a reference for billing.

## 5. Gaps found and their status

| ID | Gap | Evidence | Status |
|---|---|---|---|
| G-1 | Challan built without an OC named used the most recently modified OC. With two POs open it could deliver against the wrong PO. The button on the Project page never named one. | `create_delivery_note_for_opportunity` (old lookup); `OpportunityDetailPage` "Make Delivery Note" | **Fixed.** `api/sales_case_rules.pick_source_order`: several open OCs refuse a guess and list the POs. The page shows a PO picker when more than one is open. Fully delivered and draft OCs are not offered. |
| G-2 | The challan did not carry the customer PO. Legacy challans always did (`customerref`). | `dn.po_no` never set | **Fixed.** `dn.po_no = oc.po_no`. |
| G-3 | Closing reason and remarks had no home. The legacy case closed with `Case Closed`; Traders could only store a stage. Nothing stopped a case closing at Delivery while a quoted line was still undelivered. | `close_opportunity`; `CLOSE_STAGES` | **Fixed.** New `close_reason` field and API argument. A reason is required for stage Other, and for stage Delivery while any submitted OC still has undelivered quantity. Covered by `test_sales_case_rules`. |
| G-4 | Challan lines link to order lines by item code and remaining quantity (`order_linking.match_order_lines`, greedy). For duplicate lines of one item (RDMPES 183068 quoted twice) the link can take either line, and the challan does not show the quote line number the legacy record keeps (`orderlineno`). | `order_linking.py` | Open. Low severity; matters for the reconciliation view. |
| G-5 | **Accepted option vs delivered option.** The accepted option on line 13 was KF 0400 B. The legacy challans delivered KF 0600 B twice (once for line 12, once more) and KF 0400 B once. A Traders challan copies every OC option, and its selection can be changed on the challan. `save_commercial_options` does not compare that selection with the OC's accepted option. | `dcdetails`, `dcoptions`; `save_commercial_options` | Open (decision). Proposed control: a challan whose selected option differs from the OC's accepted option needs an approval reason, or is refused. |
| G-6 | **Currency snapshot.** The legacy quote priced in USD with a per-currency rate snapshot and a rate validity date. Traders has no currency or rate-validity field on the quotation. | `salesorders.rate_clause`, `clause_rates`, `rate_validity` | Open. Part of `CRITICAL_GAPS_ACTION_PLAN.md` §6. |
| G-7 | **Typed per-line quotation audit.** Legacy keeps who changed which line (`quotationmodifications`). Traders relies on ERPNext Version on the document and the Decision Log, which does not record per-line typed changes. | `docs/ENQUIRY_TO_CASH_CAPABILITIES.md` §7 | Open (decision). |
| G-8 | **Partial delivery needs manual quantities.** A second challan on an OC is built with the full OC quantities. ERPNext blocks the over-delivery on submit, but the user must correct every line by hand. Seven challans on two POs make this the main cost of the case. | `create_delivery_note_for_opportunity` copies the OC hierarchy unchanged | **Built, live check pending.** `api/sales_case_rules.challan_option_rows` cuts each billed item to `ordered − delivered` (from `Sales Order Item.delivered_qty`, submitted challans only) in the hierarchy and the flat items, so a save re-sync keeps it. `lines` on `create_delivery_note_for_opportunity` picks the OC lines a challan covers; `get_delivery_plan_for_opportunity` feeds the picker on the Project page. Pure tests in `test_sales_case_rules` and `test_sahamid_chain`. The two-challan partial case in `scripts/e2e_sahamid_chain.py` (section 4b) has not run on a disposable site yet. Draft challans do not reduce the remaining quantity, so two drafts opened together both start from the same remaining; ERPNext's over-delivery check on submit is still the control. |
| G-9 | **Substitution on a challan.** A challan line that is not on the OC is left unlinked by `order_linking` without any signal. The legacy challan substituted 221-412 for 221-612 at the same net. | `order_linking.link_delivery_note_to_order` ("left cleanly unlinked") | Open (decision). Proposed: a required "substitutes" reference on unlinked challan rows. |
| G-10 | **Case closed with a quoted line open.** Covered by G-3. The legacy case closed with KV 9106 (8,507 net) undelivered and no record that it was cancelled. | §3 | Partly fixed by G-3 (reason required). Whether the line should be cancelled on the OC is open. |

## 6. Understanding of the legacy flow

1. An RFQ becomes a salescase. The salesman builds a quotation of lines, each with alternatives (options).
   Prices are list less a discount, and the net is what the customer pays.
2. Each customer PO is registered on the case. The sales order (OC) is raised **per PO** from the quotation. The
   legacy OC rows carry only a header (no lines in the snapshot), so which quote lines each PO covers is not recorded.
3. Challans follow the POs. A challan is a dispatch of some lines for one PO. The legacy dispatch record keeps the
   PO text, delivery address and courier/invoice/GRB dates. Every challan line carries `qtyinvoiced`.
4. The case stays open while material is pending. Comments record the state. It is closed with a reason and a
   stage.
5. The quotation is changed in place during the case, and the audit table records each change. Challan lines
   carry `lineoptionno = 0` throughout, so the delivered option cannot be recovered from the challan.

The Traders chain covers steps 1 to 4 with stronger control: one selected option per line, typed rates carried
unchanged, one OC per PO, and an explicit PO on each challan. The weaknesses that remain are the ones in §5:
manual partial-delivery quantities (G-8), substitution and alternative delivery control (G-5, G-9), and currency
on the quotation (G-6).

## 7. What changed in this pass

| Area | Change |
|---|---|
| `apps/trader_app/trader_app/api/sales_case_rules.py` (new, pure) | `pick_source_order`, `is_open_for_delivery`, `close_reason_error` |
| `api/opportunity.py` | Challan source OC by rule (G-1); challan carries `po_no` (G-2); `close_opportunity(close_reason)` with the reason guard (G-3); `close_reason` cleared on reopen; `per_delivered` on the OC list |
| `trader/doctype/trader_opportunity` | `close_reason` (Small Text), shown when Closed |
| `frontend/trader-ui` | Close reason input and detail row; PO picker beside "Make Delivery Note" when several OCs are open |
| `trader_app/tests/test_sales_case_rules.py` (new, 15 tests) | Source OC choice, draft and fully delivered OCs, close reasons |

## 8. Verification

| What | Result |
|---|---|
| `python -m unittest trader_app.tests.test_sales_case_rules` | new tests pass |
| `test_sahamid_chain` (38), `test_walkthrough_capabilities` (35) | still pass (88 in total with the new module) |
| `npx tsc -b` in `frontend/trader-ui` | passes |
| Live ERPNext run (`e2e_sahamid_chain`, `e2e_enquiry_to_cash`) | **not run**: needs a disposable site with `bench migrate` for `close_reason`. Run both before release. |

The legacy reconciliation in §3 was computed from the snapshot with scripts kept outside the repo. The figures can be
re-checked against the record ids in §1.

## 9. Open decisions

1. G-5: may a challan deliver an alternative option that was not accepted, and who approves it?
2. G-9: how should a substitution be recorded on a challan?
3. G-6: currency and rate validity on the quotation (scope and timing).
4. G-7: is ERPNext Version enough for the per-line quotation audit?
5. G-8: is the partial-delivery prefill in scope before go-live?
6. §4: the invoice trail for the seven challans must be confirmed by finance.

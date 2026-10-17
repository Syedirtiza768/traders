# -*- coding: utf-8 -*-
"""End-to-end check of the Sales Case → Quotation → OC → DC → GRB → Invoice chain.

Runs the rules the legacy Sahamid system was reverse-engineered for (see the ERP
blueprint, documents 01–03) against a live site. Each step records its own result,
so one failing feature does not hide the others.

Disposable sites only: the script creates real documents.

    bench --site <site> execute trader_app.scripts.e2e_sahamid_chain.run \
        --kwargs "{'run_tag': 'S1'}"

Returns ``{"checks": [...], "passed": n, "failed": m}``.
"""

from __future__ import unicode_literals

import json
import traceback

import frappe
from frappe.utils import add_days, flt, getdate, nowdate

from trader_app.api.opportunity import _default_warehouse
from trader_app.scripts.e2e_enquiry_to_cash import (
    ITEMS,
    L_BAT,
    L_UPS,
    _account,
    _ensure_customer,
    _ensure_fiscal_year,
    _ensure_items,
    _ensure_opening_stock,
    _ensure_tax_policy,
    _provision_packs,
    _row,
)

CREDIT_TEST_LIMIT = 1000


def run(company=None, run_tag=None):
    from trader_app.api import opportunity as opp
    from trader_app.api.commercial_totals import commercial_totals_for_quotation
    from trader_app.api.hierarchy import serialize_commercial_options
    from trader_app.setup.custom_fields import ensure_custom_fields

    ensure_custom_fields()
    company = company or frappe.db.get_value("Company", {}, "name")
    if not company:
        frappe.throw("No Company on this site; seed one first (trader_app.demo.install_demo).")
    run_tag = run_tag or nowdate()
    today = getdate(nowdate())

    results = []
    state = {}

    def step(label, fn):
        """Run one check. A raised error is a failure of this check only."""
        try:
            outcome = fn()
            ok, detail = (outcome if isinstance(outcome, tuple) else (bool(outcome), ""))
        except Exception as exc:  # noqa: BLE001 - a failing feature must not abort the run
            frappe.db.rollback()
            where = [line.strip() for line in traceback.format_exc().splitlines() if "trader_app" in line][-1:]
            ok, detail = False, "{0}: {1} {2}".format(type(exc).__name__, str(exc)[:300], " ".join(where))
        results.append({"check": label, "pass": bool(ok), "detail": str(detail)[:600]})
        return ok

    def expect_refusal(fn, must_contain=None):
        """True when ``fn`` raises (optionally with ``must_contain`` in the message)."""
        try:
            fn()
        except Exception as exc:  # noqa: BLE001
            message = str(exc)
            if must_contain and must_contain.lower() not in message.lower():
                return False, "refused for another reason: " + message[:200]
            return True, message[:200]
        return False, "accepted (no refusal)"

    # ── master data (same helpers as the enquiry-to-cash scenario) ──────────
    _ensure_fiscal_year(add_days(today, -120), today)
    _ensure_items(company)
    warehouse = _default_warehouse(company)
    _ensure_opening_stock(company, warehouse, add_days(today, -110))
    customer = _ensure_customer(company)
    template, tax_account = _ensure_tax_policy(company, add_days(today, -100))
    write_off = _account(company, root_type="Expense", account_type="Round Off") or _account(
        company, root_type="Expense"
    )
    _provision_packs(company, write_off)
    # The rules under test are the Electrence profile's: one OC per customer PO, and the
    # quick / duplicate quotation features switched on.
    profile = frappe.db.get_value("Trader Opportunity Profile", {"company": company, "is_active": 1}, "name")
    if profile and frappe.db.has_column("Trader Opportunity Profile", "require_po_for_oc"):
        frappe.db.set_value(
            "Trader Opportunity Profile",
            profile,
            {"require_po_for_oc": 1, "allow_quick_quotation": 1, "allow_duplicate_quotation": 1},
        )
        frappe.clear_document_cache("Trader Opportunity Profile", profile)
        frappe.db.commit()
    po_no = "SAHAMID-PO-{0}".format(run_tag)

    # ── 1. quotation with two alternatives on line 1 ───────────────────────
    order_details = {"validity_days": 15, "pay_advance_pct": 30, "pay_delivery_pct": 70, "gst_mode": "exclusive"}
    quote_rows = [
        _row(1, 1, L_UPS, "Economy UPS", 2, [("WT-UPS-3K-B", 1, 0)]),
        _row(1, 2, L_UPS, "Premium UPS", 2, [("WT-UPS-3K", 1, 0)]),
        _row(2, 1, L_BAT, "Batteries", 2, [("WT-BAT-100", 4, 0)]),
    ]
    hub = opp.create_opportunity(
        data={
            "title": "Sahamid chain check {0}".format(run_tag),
            "customer": customer,
            "enquiry_date": str(add_days(today, -30)),
            "enquiry_value": 1000000,
            "priority": "Normal",
            "description": "Automated chain check {0}".format(run_tag),
        },
        company=company,
    )
    opportunity = hub["opportunity"]["name"]
    state["opportunity"] = opportunity
    for po in (po_no, po_no + "-X"):
        opp.add_customer_po(opportunity, data={"customer_po_no": po}, company=company)

    def create_quote(rows, **extra):
        created = opp.create_quotation_for_opportunity(
            opportunity,
            data={
                "transaction_date": str(today),
                "valid_till": str(add_days(today, 15)),
                "order_details": order_details,
                "taxes_and_charges": template,
                "commercial_options": rows,
                "force_new": 1,
                **extra,
            },
            company=company,
        )
        return created["name"]

    def submit_quote(name):
        quote = frappe.get_doc("Quotation", name)
        quote.submit()
        frappe.db.commit()
        return quote.name

    q1 = None

    def _quote_one():
        nonlocal q1
        q1 = submit_quote(create_quote(quote_rows))
        state["q1"] = q1
        return bool(q1)

    step("quotation with two options on line 1 is created and submitted", _quote_one)

    # ── 2. order confirmation for the option the customer accepted ─────────
    def _oc_accepts_premium():
        oc = opp.create_order_confirmation(
            opportunity, source_quotation=q1, customer_po_no=po_no, company=company, selected_options={"1": 2}
        )
        so = frappe.get_doc("Sales Order", oc["name"])
        so.submit()
        frappe.db.commit()
        state["oc"] = so.name
        ordered = {r.item_code: flt(r.qty) for r in so.items}
        ok = ordered == {"WT-UPS-3K": 2.0, "WT-BAT-100": 8.0}
        return ok, str(ordered)

    step("OC orders the accepted premium option, not every alternative", _oc_accepts_premium)

    step(
        "OC rejects an option the quotation does not offer",
        lambda: expect_refusal(
            lambda: opp.create_order_confirmation(
                opportunity, source_quotation=q1, customer_po_no=po_no + "-X", company=company,
                selected_options={"1": 9},
            ),
            must_contain="not on the quotation",
        ),
    )

    step(
        "OC refused without a customer PO when the profile requires one",
        lambda: expect_refusal(
            lambda: opp.create_order_confirmation(opportunity, source_quotation=q1, company=company),
            must_contain="PO number is required",
        ),
    )

    # ── 3. challan from the OC bills the accepted option (legacy F-04) ─────
    so_name = state.get("oc")
    dn1 = None

    def _dn_from_oc():
        nonlocal dn1
        dn1 = opp.create_delivery_note_for_opportunity(opportunity, source_oc=so_name, company=company)["name"]
        state["dn1"] = dn1
        items = {r.item_code: flt(r.qty) for r in frappe.get_doc("Delivery Note", dn1).items}
        return items == {"WT-UPS-3K": 2.0, "WT-BAT-100": 8.0}, str(items)

    step("challan from the OC delivers the accepted option", _dn_from_oc)

    def _dn_save_keeps_selection():
        dn = frappe.get_doc("Delivery Note", dn1)
        # The challan editor sends every option of the hierarchy, as the UI does.
        rows = serialize_commercial_options(dn)
        opp.save_commercial_options("Delivery Note", dn1, rows, company=company, expected_modified=str(dn.modified))
        items = {r.item_code: flt(r.qty) for r in frappe.get_doc("Delivery Note", dn1).items}
        return items == {"WT-UPS-3K": 2.0, "WT-BAT-100": 8.0}, str(items)

    step("saving the challan hierarchy does not add the alternative option (legacy F-01/F-05)", _dn_save_keeps_selection)

    def _stale_save_refused():
        dn = frappe.get_doc("Delivery Note", dn1)
        rows = serialize_commercial_options(dn)
        return expect_refusal(
            lambda: opp.save_commercial_options(
                "Delivery Note", dn1, rows, company=company, expected_modified="2000-01-01 00:00:00"
            ),
            must_contain="changed by someone else",
        )

    step("stale hierarchy save is refused (legacy F-33)", _stale_save_refused)

    def _submit_dn1():
        dn = frappe.get_doc("Delivery Note", dn1)
        dn.submit()
        frappe.db.commit()
        return dn.docstatus == 1

    step("challan 1 submits and moves stock", _submit_dn1)

    # ── 4. invoice bills only the accepted option; alternatives stay open ──
    inv1 = None

    def _invoice_accepted_only():
        nonlocal inv1
        result = opp.create_invoice_for_opportunity(
            opportunity, delivery_notes=[dn1], posting_date=str(today), auto_submit=1, company=company
        )
        inv1 = result["name"]
        state["inv1"] = inv1
        items = {r.item_code: flt(r.qty) for r in frappe.get_doc("Sales Invoice", inv1).items}
        return items == {"WT-UPS-3K": 2.0, "WT-BAT-100": 8.0}, str(items)

    step("invoice bills the accepted option only", _invoice_accepted_only)

    def _alternative_stays_open():
        rows = frappe.get_all(
            "Trader Commercial Option",
            filters={"parent": dn1, "parenttype": "Delivery Note"},
            fields=["option_no", "line_no", "qty_invoiced", "package_qty"],
        )
        by_option = {(r.line_no, r.option_no): r for r in rows}
        billed = by_option.get((1, 2))
        alternative = by_option.get((1, 1))
        ok = bool(billed) and bool(alternative) and flt(billed.qty_invoiced) >= 2 and flt(alternative.qty_invoiced) == 0
        return ok, "billed={0} alternative={1}".format(
            billed and billed.qty_invoiced, alternative and alternative.qty_invoiced
        )

    step("the unbilled alternative is not marked invoiced (legacy F-04)", _alternative_stays_open)

    # ── 4b. partial deliveries on one PO: challans are pre-filled with what is left (gap G-8) ─
    # A quotation of its own, so the first PO's order is already fully delivered by now. Legacy
    # sahamid shipped this PO in several challans; each one used to open at the full order quantity.
    partial_po = po_no + "-P"
    partial = {}

    def _partial_order_ordered():
        quote = submit_quote(
            create_quote(
                [
                    _row(1, 1, L_UPS, "Premium UPS", 3, [("WT-UPS-3K", 1, 0)]),
                    _row(2, 1, L_BAT, "Batteries", 2, [("WT-BAT-100", 4, 0)]),
                ]
            )
        )
        oc = opp.create_order_confirmation(
            opportunity, source_quotation=quote, customer_po_no=partial_po, company=company
        )
        so = frappe.get_doc("Sales Order", oc["name"])
        so.submit()
        frappe.db.commit()
        partial["oc"] = so.name
        ordered = {r.item_code: flt(r.qty) for r in so.items}
        return ordered == {"WT-UPS-3K": 3.0, "WT-BAT-100": 8.0}, str(ordered)

    step("second PO's order confirmation orders UPS 3 and batteries 8", _partial_order_ordered)

    def _challan_covers_chosen_line_only():
        result = opp.create_delivery_note_for_opportunity(
            opportunity, source_oc=partial["oc"], company=company, lines=[1]
        )
        partial["dn_a"] = result["name"]
        items = {r.item_code: flt(r.qty) for r in frappe.get_doc("Delivery Note", result["name"]).items}
        return items == {"WT-UPS-3K": 3.0}, str(items)

    step("challan A covers only the line picked, at its full remaining quantity", _challan_covers_chosen_line_only)

    def _submit_partial_a():
        dn = frappe.get_doc("Delivery Note", partial["dn_a"])
        dn.submit()
        frappe.db.commit()
        return dn.docstatus == 1

    step("challan A submits and the UPS line is fully delivered", _submit_partial_a)

    def _plan_shows_what_is_left():
        from trader_app.api.opportunity import get_delivery_plan_for_opportunity

        plan = get_delivery_plan_for_opportunity(opportunity, source_oc=partial["oc"], company=company)
        left = {line["line_no"]: flt(line["remaining_qty"]) for line in plan["lines"]}
        return left == {1: 0.0, 2: 8.0}, str(left)

    step("line picker plan shows UPS done and batteries 8 still to deliver", _plan_shows_what_is_left)

    def _challan_b_prefills_what_is_left():
        result = opp.create_delivery_note_for_opportunity(opportunity, source_oc=partial["oc"], company=company)
        partial["dn_b"] = result["name"]
        items = {r.item_code: flt(r.qty) for r in frappe.get_doc("Delivery Note", result["name"]).items}
        return items == {"WT-BAT-100": 8.0}, str(items)

    step("challan B is pre-filled with the batteries left, not the full order", _challan_b_prefills_what_is_left)

    def _partial_edit_survives_save():
        # The clerk ships 4 of the 8 batteries: the batteries row is cut to 2 sets of 2.
        dn = frappe.get_doc("Delivery Note", partial["dn_b"])
        rows = serialize_commercial_options(dn)
        for row in rows:
            for item in row["items"]:
                if item["item_code"] == "WT-BAT-100":
                    item["unit_qty"] = 2
        opp.save_commercial_options("Delivery Note", partial["dn_b"], rows, company=company, expected_modified=str(dn.modified))
        items = {r.item_code: flt(r.qty) for r in frappe.get_doc("Delivery Note", partial["dn_b"]).items}
        return items == {"WT-BAT-100": 4.0}, str(items)

    step("challan B's partial quantity survives the hierarchy save (re-sync)", _partial_edit_survives_save)

    def _submit_partial_b():
        dn = frappe.get_doc("Delivery Note", partial["dn_b"])
        dn.submit()
        frappe.db.commit()
        return dn.docstatus == 1

    step("challan B submits 4 batteries", _submit_partial_b)

    def _challan_c_prefills_the_rest():
        result = opp.create_delivery_note_for_opportunity(opportunity, source_oc=partial["oc"], company=company)
        partial["dn_c"] = result["name"]
        items = {r.item_code: flt(r.qty) for r in frappe.get_doc("Delivery Note", result["name"]).items}
        return items == {"WT-BAT-100": 4.0}, str(items)

    step("challan C is pre-filled with the 4 batteries still owed after the partial challan", _challan_c_prefills_the_rest)

    step(
        "a challan for a line already fully delivered is refused",
        lambda: expect_refusal(
            lambda: opp.create_delivery_note_for_opportunity(
                opportunity, source_oc=partial["oc"], company=company, lines=[1]
            ),
            must_contain="Nothing is left",
        ),
    )

    if partial.get("dn_c"):
        frappe.delete_doc("Delivery Note", partial["dn_c"], ignore_permissions=True, force=1)
        frappe.db.commit()

    # ── 5. blank documents never seed an arbitrary stock item (legacy F-24) ─
    empty_opp = opp.create_opportunity(
        data={"title": "Sahamid empty check {0}".format(run_tag), "customer": customer, "enquiry_value": 1},
        company=company,
    )["opportunity"]["name"]
    opp.add_customer_po(empty_opp, data={"customer_po_no": "X-" + run_tag}, company=company)

    step(
        "order confirmation needs a quotation (no placeholder item)",
        lambda: expect_refusal(
            lambda: opp.create_order_confirmation(empty_opp, customer_po_no="X-" + run_tag, company=company),
            must_contain="quotation",
        ),
    )

    step(
        "challan without an order confirmation is refused (no arbitrary stock item)",
        lambda: expect_refusal(
            lambda: opp.create_delivery_note_for_opportunity(empty_opp, company=company),
            must_contain="Order Confirmation",
        ),
    )

    # ── 6. quotation finalisation rules and quick quotations (blueprint 4.3) ─
    def _empty_option_refused():
        # Line 1 is priced; line 2 has an option with no items, which the finalisation rules refuse.
        bad = create_quote(
            [
                _row(1, 1, L_UPS, "Priced", 1, [("WT-UPS-3K-B", 1, 0)]),
                _row(2, 1, L_BAT, "Bare option", 1, []),
            ]
        )
        try:
            return expect_refusal(lambda: submit_quote(bad), must_contain="add at least one item")
        finally:
            frappe.delete_doc("Quotation", bad, ignore_permissions=True, force=1)
            frappe.db.commit()

    step("quotation with an option that has no items cannot be finalised", _empty_option_refused)

    def _quick_with_incomplete_option_submits():
        rows = [
            _row(1, 1, L_UPS, "Priced option", 1, [("WT-UPS-3K-B", 1, 0)]),
            _row(1, 2, L_UPS, "Option still to be priced", 1, []),
        ]
        name = create_quote(rows, quick_quotation=1)
        return bool(submit_quote(name)), name

    step("quick quotation may leave an option unpriced and is still finalised", _quick_with_incomplete_option_submits)

    step(
        "quick quotation still needs one priced item",
        lambda: expect_refusal(
            lambda: submit_quote(create_quote([], quick_quotation=1)),
            must_contain="at least one priced item",
        ),
    )

    # ── 7. revisions never reuse a label (legacy F-30) ─────────────────────
    def _revision_labels():
        r1 = opp.create_quotation_revision(q1, company=company)["name"]
        r2 = opp.create_quotation_revision(q1, company=company)["name"]
        frappe.delete_doc("Quotation", r1, ignore_permissions=True, force=1)
        r3 = opp.create_quotation_revision(q1, company=company)["name"]
        labels = [frappe.db.get_value("Quotation", r, "trader_revision_label") for r in (r2, r3)]
        return labels == ["R2", "R3"], str(labels)

    step("a deleted revision is not reused (R2 then R3)", _revision_labels)

    # ── 8. duplicate quotation keeps the hierarchy and clears revision lineage ─
    def _duplicate_quote():
        result = opp.duplicate_quotation_for_opportunity(q1, company=company, force_new=1)
        dup = frappe.get_doc("Quotation", result["name"])
        original = frappe.get_doc("Quotation", q1)
        ok = (
            dup.docstatus == 0
            and len(dup.trader_commercial_options or []) == len(original.trader_commercial_options or [])
            and not dup.trader_revision_label
            and flt(dup.net_total) == flt(original.net_total)
        )
        state["dup"] = dup.name
        return ok, dup.name

    step("duplicate quotation is a clean draft with the same hierarchy", _duplicate_quote)

    def _duplicate_template_rate():
        dup = frappe.get_doc("Quotation", state["dup"])
        totals = commercial_totals_for_quotation(dup)
        return flt(totals.get("gst_rate")) == 18.0, "gst_rate={0}".format(totals.get("gst_rate"))

    step("printed quotation uses the template rate (18%)", _duplicate_template_rate)

    # ── 9. withholding on the quotation vs the invoice (legacy F-14) ───────
    def _wht_mismatch_is_flagged():
        if not state.get("dup"):
            return False, "duplicate quotation missing"
        dup = frappe.get_doc("Quotation", state["dup"])
        dup.trader_wht_percent = 99  # far from any policy rate, so the mismatch is certain
        dup.save()
        q2 = submit_quote(dup.name)
        opp.add_customer_po(opportunity, data={"customer_po_no": "WHT-" + run_tag}, company=company)
        oc2 = opp.create_order_confirmation(
            opportunity, source_quotation=q2, customer_po_no="WHT-" + run_tag, company=company,
            selected_options={"1": 2},
        )["name"]
        so2 = frappe.get_doc("Sales Order", oc2)
        so2.submit()
        frappe.db.commit()
        dn3 = opp.create_delivery_note_for_opportunity(opportunity, source_oc=oc2, company=company)["name"]
        frappe.get_doc("Delivery Note", dn3).submit()
        frappe.db.commit()
        si = opp.create_invoice_for_opportunity(
            opportunity, delivery_notes=[dn3], posting_date=str(today), auto_submit=0, company=company
        )["name"]
        logged = frappe.db.count("Trader Decision Log", {"decision_type": "wht", "reference_name": si, "outcome": "warn"})
        return logged > 0, "invoice {0} wht warnings {1}".format(si, logged)

    step("quote and invoice withholding differ and the difference is logged", _wht_mismatch_is_flagged)

    # ── 10. credit limit enforced at submit (legacy F-28) ──────────────────
    def _set_ar_action(value):
        name = frappe.db.get_value("Trader AR Profile", {"company": company, "is_active": 1}, "name")
        frappe.db.set_value("Trader AR Profile", name, "credit_limit_action", value)
        frappe.clear_document_cache("Trader AR Profile", name)
        frappe.db.commit()

    def _restricted_sales_user():
        email = "sahamid.sales.e2e@example.test"
        if not frappe.db.exists("User", email):
            user = frappe.get_doc(
                {"doctype": "User", "email": email, "first_name": "Sales E2E", "send_welcome_email": 0,
                 "roles": [{"role": "Sales User"}]}
            )
            user.insert(ignore_permissions=True)
            frappe.db.commit()
        return email

    def _credit_test_customer():
        # A fresh customer with a small limit: no existing balance to work around.
        name = "Credit Check {0}".format(run_tag)
        if not frappe.db.exists("Customer", name):
            cust = frappe.get_doc(
                {
                    "doctype": "Customer",
                    "customer_name": name,
                    "customer_type": "Company",
                    "customer_group": frappe.db.get_single_value("Selling Settings", "customer_group")
                    or frappe.db.get_value("Customer Group", {"is_group": 0}, "name"),
                    "territory": frappe.db.get_single_value("Selling Settings", "territory")
                    or frappe.db.get_value("Territory", {"is_group": 0}, "name"),
                    "credit_limits": [{"company": company, "credit_limit": CREDIT_TEST_LIMIT}],
                }
            )
            cust.insert(ignore_permissions=True)
            frappe.db.commit()
        return name

    def _over_limit_document(doctype, **extra):
        values = {
            "doctype": doctype,
            "company": company,
            "customer": _credit_test_customer(),
            "transaction_date": str(today),
            "items": [{"item_code": "WT-UPS-3K-B", "qty": 5, "rate": ITEMS["WT-UPS-3K-B"][1], "warehouse": warehouse}],
        }
        if doctype == "Sales Order":
            values["delivery_date"] = str(add_days(today, 7))
        values.update(extra)
        return frappe.get_doc(values)

    def _quotation_over_limit_blocked():
        # Quotations are checked by traders: Block refuses finalisation for a user without an override role.
        _set_ar_action("Block")
        try:
            quote = _over_limit_document("Quotation", valid_till=str(add_days(today, 15)), quotation_to="Customer",
                                         party_name=_credit_test_customer())
            quote.insert(ignore_permissions=True)
            frappe.set_user(_restricted_sales_user())
            try:
                refused, message = expect_refusal(lambda: quote.submit(), must_contain="credit limit")
            finally:
                frappe.set_user("Administrator")
            logged = frappe.db.count(
                "Trader Decision Log",
                {"decision_type": "validation", "outcome": "block", "reference_name": quote.name},
            )
            return refused and logged > 0, "{0}; decision log blocks {1}".format(message[:120], logged)
        finally:
            _set_ar_action("Warn")

    step("quotation over the customer credit limit is refused when the profile blocks", _quotation_over_limit_blocked)

    def _order_over_limit_refused_by_erpnext():
        # Orders and invoices are checked by ERPNext against the same limit (credit-controller role overrides).
        order = _over_limit_document("Sales Order", po_no="CREDIT-" + run_tag)
        order.insert(ignore_permissions=True)
        frappe.set_user(_restricted_sales_user())
        try:
            return expect_refusal(lambda: order.submit(), must_contain="credit limit")
        finally:
            frappe.set_user("Administrator")

    step("order over the customer credit limit is refused for a user without the credit controller role",
         _order_over_limit_refused_by_erpnext)

    # ── 11. goods return against a challan (legacy GRB) ────────────────────
    def _grb_restores_stock():
        ret = opp.create_return_delivery_note(dn1, company=company)["name"]
        ret_doc = frappe.get_doc("Delivery Note", ret)
        negative = all(flt(i.qty) < 0 for i in ret_doc.items) and bool(ret_doc.items)
        ret_doc.submit()
        frappe.db.commit()
        moved = frappe.db.count("Stock Ledger Entry", {"voucher_no": ret, "is_cancelled": 0})
        return negative and ret_doc.is_return == 1 and moved > 0, "return {0}, stock entries {1}".format(ret, moved)

    step("goods return creates a return challan that puts stock back", _grb_restores_stock)

    # ── 11b. inward gate pass against a purchase receipt (legacy IGP) ──────
    def _inward_gate_pass():
        from trader_app.api import gate_pass as gate_pass_api

        supplier = frappe.db.get_value("Supplier", {}, "name")
        if not supplier:
            return False, "no supplier on this site"
        receipt = frappe.get_doc(
            {
                "doctype": "Purchase Receipt",
                "company": company,
                "supplier": supplier,
                "posting_date": nowdate(),
                "set_warehouse": warehouse,
                "items": [
                    {"item_code": "WT-CAB-CAT6", "qty": 1, "rate": ITEMS["WT-CAB-CAT6"][2], "warehouse": warehouse}
                ],
            }
        )
        receipt.insert(ignore_permissions=True)
        receipt.submit()
        frappe.db.commit()
        result = gate_pass_api.create_inward_gate_pass(
            receipt.name, vehicle_no="KHI-9", driver_name="Driver", received_by="Store keeper"
        )
        recorded = frappe.get_doc("Trader Inward Gate Pass", result["name"])
        cancelled = gate_pass_api.cancel_inward_gate_pass(result["name"])["status"] == "Cancelled"
        ok = recorded.purchase_receipt == receipt.name and recorded.supplier == supplier and cancelled
        return ok, "{0} for {1}".format(result["name"], receipt.name)

    step("inward gate pass records the arrival against a submitted purchase receipt", _inward_gate_pass)

    # ── 12. reconciliation view (blueprint §12) ────────────────────────────
    def _reconciliation():
        from trader_app.api.reconciliation import get_opportunity_reconciliation

        result = get_opportunity_reconciliation(opportunity, company=company)
        failing = [c["id"] for c in result["checks"] if c["status"] == "fail"]
        return not failing, json.dumps({"summary": result["summary"], "failing": failing})

    step("document chain reconciles (no failing checks)", _reconciliation)

    passed = sum(1 for r in results if r["pass"])
    failed = len(results) - passed
    return {"checks": results, "passed": passed, "failed": failed, "opportunity": state.get("opportunity")}

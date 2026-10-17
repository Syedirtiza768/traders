# -*- coding: utf-8 -*-
"""Document-chain reconciliation for one Opportunity (blueprint §12, controls S13/S14).

Checks that the documents of one sale tie to each other: quotation totals to the
option hierarchy, the order to the option the customer accepted, the challan and the
invoice to the order's rates and quantities, and the ledgers to the documents.

Every check reports ``pass``, ``fail`` or ``warn`` with the documents that break it,
so a finance user can see where a sale does not tie out instead of trusting totals.
"""

from __future__ import unicode_literals

from collections import defaultdict

import frappe
from frappe import _
from frappe.utils import flt

from trader_app.api.commercial_totals import first_option_net_from_doc
from trader_app.api.hierarchy import flatten_commercial_options, resolve_selection, serialize_commercial_options

AMOUNT_TOLERANCE = 0.01
QTY_TOLERANCE = 0.001
MAX_REFERENCES = 20


def amounts_agree(expected, actual, tolerance=AMOUNT_TOLERANCE):
    return abs(flt(expected) - flt(actual)) <= tolerance


def over_limit_refs(expected_by_key, actual_by_key, tolerance=QTY_TOLERANCE):
    """Keys whose actual quantity exceeds the expected quantity (over-delivery / over-billing)."""
    return sorted(key for key, actual in actual_by_key.items() if flt(actual) > flt(expected_by_key.get(key)) + tolerance)


def rates_disagree(source_rates, target_rates, tolerance=AMOUNT_TOLERANCE):
    """Keys whose rate on the target document differs from the source document."""
    return sorted(
        key
        for key, rate in target_rates.items()
        if key in source_rates and not amounts_agree(source_rates[key], rate, tolerance)
    )


def ledger_out_of_balance(rows):
    """``voucher_no -> difference`` for vouchers whose debits and credits do not match.

    ``rows`` are ``(voucher_no, debit, credit)`` tuples.
    """
    totals = defaultdict(float)
    for voucher_no, debit, credit in rows:
        totals[voucher_no] += flt(debit) - flt(credit)
    return {voucher: round(diff, 2) for voucher, diff in totals.items() if abs(diff) > AMOUNT_TOLERANCE}


def _check(check_id, label, failures, ok_detail, fail_detail, warn=False):
    failures = sorted(set(failures))
    status = "pass" if not failures else ("warn" if warn else "fail")
    return {
        "id": check_id,
        "label": label,
        "status": status,
        "detail": ok_detail if not failures else fail_detail,
        "references": failures[:MAX_REFERENCES],
        "count": len(failures),
    }


def _opportunity_documents(opportunity, company):
    filters = {"trader_opportunity": opportunity}
    quotations = frappe.get_all(
        "Quotation",
        filters={**filters, "docstatus": 1},
        fields=["name", "net_total", "company"],
    )
    orders = frappe.get_all(
        "Sales Order",
        filters={**filters, "docstatus": 1},
        fields=["name", "net_total", "company", "customer"],
    )
    notes = frappe.get_all(
        "Delivery Note",
        filters={**filters, "docstatus": 1},
        fields=["name", "company", "customer", "posting_date"],
    )
    invoices = frappe.get_all(
        "Sales Invoice",
        filters={**filters, "docstatus": 1},
        fields=["name", "company", "customer", "grand_total", "net_total"],
    )
    return quotations, orders, notes, invoices


def _quotation_totals_check(quotations):
    failures, mismatch = [], []
    for row in quotations:
        quote = frappe.get_doc("Quotation", row.name)
        expected = first_option_net_from_doc(quote)
        if not amounts_agree(expected, quote.net_total):
            failures.append(row.name)
            mismatch.append("{0}: {1} vs {2}".format(row.name, quote.net_total, round(expected, 2)))
    return _check(
        "quotation_totals",
        "Quotation total equals its first options (the basis the print uses)",
        failures,
        "All quotations tie to their hierarchy.",
        "Quotation totals differ from the hierarchy: " + "; ".join(mismatch),
    )


def _order_selection_check(orders):
    """The OC's items must be the accepted option per line, valued at the quoted rates."""
    failures, detail = [], []
    for row in orders:
        order = frappe.get_doc("Sales Order", row.name)
        rows = serialize_commercial_options(order)
        if not rows:
            continue
        chosen = resolve_selection(rows)
        expected = flatten_commercial_options(rows, selected_options=chosen)
        expected_value = sum(flt(e["qty"]) * flt(e["rate"]) for e in expected)
        expected_qty = {}
        for e in expected:
            expected_qty[e["item_code"]] = expected_qty.get(e["item_code"], 0) + flt(e["qty"])
        actual_qty = {}
        for item in order.items:
            actual_qty[item.item_code] = actual_qty.get(item.item_code, 0) + flt(item.qty)
        if not amounts_agree(expected_value, order.net_total) or any(
            not amounts_agree(expected_qty.get(code, 0), qty, QTY_TOLERANCE) for code, qty in actual_qty.items()
        ):
            failures.append(row.name)
            detail.append("{0}: order {1} vs accepted options {2}".format(row.name, order.net_total, round(expected_value, 2)))
    return _check(
        "order_accepted_options",
        "Order lines are the accepted option per line, at quoted value",
        failures,
        "Every order carries exactly its accepted options.",
        "Order lines do not match the accepted options: " + "; ".join(detail),
    )


def _delivery_checks(orders, notes):
    """Challan rates equal order rates; challans never deliver more than was ordered."""
    order_rates, order_qty = {}, defaultdict(float)
    for row in frappe.get_all(
        "Sales Order Item",
        filters={"parent": ["in", [o.name for o in orders] or [""]], "parenttype": "Sales Order"},
        fields=["name", "rate", "qty"],
    ):
        order_rates[row.name] = flt(row.rate)
        order_qty[row.name] = flt(row.qty)

    delivered = defaultdict(float)
    delivery_rates = {}
    for row in frappe.get_all(
        "Delivery Note Item",
        filters={"parent": ["in", [n.name for n in notes] or [""]], "parenttype": "Delivery Note"},
        fields=["name", "so_detail", "qty", "rate"],
    ):
        if row.so_detail:
            delivered[row.so_detail] += flt(row.qty)
            delivery_rates[row.name] = (row.so_detail, flt(row.rate))

    rate_failures = []
    for dn_item, (so_detail, rate) in delivery_rates.items():
        if so_detail in order_rates and not amounts_agree(order_rates[so_detail], rate):
            rate_failures.append(dn_item)
    over = over_limit_refs(order_qty, delivered)
    return [
        _check(
            "delivery_rates",
            "Challan rates equal the order rates",
            rate_failures,
            "Every challan line is priced at its order rate.",
            "Challan lines priced differently from the order: " + ", ".join(sorted(rate_failures)[:MAX_REFERENCES]),
        ),
        _check(
            "delivery_quantity",
            "Challans deliver no more than the order quantity",
            over,
            "No order line is over-delivered.",
            "Over-delivered order lines: " + ", ".join(over[:MAX_REFERENCES]),
        ),
    ]


def _invoice_checks(notes, invoices):
    if not invoices:
        return []
    invoice_names = [i.name for i in invoices]
    billed = defaultdict(float)
    billed_rates = {}
    for row in frappe.get_all(
        "Sales Invoice Item",
        filters={"parent": ["in", invoice_names], "parenttype": "Sales Invoice"},
        fields=["name", "dn_detail", "qty", "rate"],
    ):
        if row.dn_detail:
            billed[row.dn_detail] += flt(row.qty)
            billed_rates[row.name] = (row.dn_detail, flt(row.rate))

    dn_qty, dn_rates = {}, {}
    for row in frappe.get_all(
        "Delivery Note Item",
        filters={"parent": ["in", [n.name for n in notes] or [""]], "parenttype": "Delivery Note"},
        fields=["name", "qty", "rate"],
    ):
        dn_qty[row.name] = flt(row.qty)
        dn_rates[row.name] = flt(row.rate)

    rate_failures = []
    for si_item, (dn_detail, rate) in billed_rates.items():
        if dn_detail in dn_rates and not amounts_agree(dn_rates[dn_detail], rate):
            rate_failures.append(si_item)
    over = over_limit_refs(dn_qty, billed)
    return [
        _check(
            "invoice_rates",
            "Invoice rates equal the challan rates",
            rate_failures,
            "Every invoice line is priced at its challan rate.",
            "Invoice lines priced differently from the challan: " + ", ".join(sorted(rate_failures)[:MAX_REFERENCES]),
        ),
        _check(
            "invoice_quantity",
            "Invoices bill no more than the challan quantity",
            over,
            "No challan line is over-billed.",
            "Over-billed challan lines: " + ", ".join(over[:MAX_REFERENCES]),
        ),
    ]


def _stock_check(notes):
    if not notes:
        return None
    note_names = [n.name for n in notes]
    moved = {
        row.voucher_no
        for row in frappe.get_all(
            "Stock Ledger Entry",
            filters={"voucher_type": "Delivery Note", "voucher_no": ["in", note_names], "is_cancelled": 0},
            fields=["voucher_no"],
        )
    }
    missing = [n for n in note_names if n not in moved]
    return _check(
        "stock_moved",
        "Every submitted challan has moved stock",
        missing,
        "Each challan has stock ledger entries.",
        "Challans without stock ledger entries: " + ", ".join(missing),
    )


def _ledger_checks(notes, invoices):
    checks = []
    vouchers = [("Delivery Note", n.name) for n in notes] + [("Sales Invoice", i.name) for i in invoices]
    by_type = defaultdict(list)
    for voucher_type, name in vouchers:
        by_type[voucher_type].append(name)

    balance_rows, unposted = [], []
    for voucher_type, names in by_type.items():
        gl = frappe.get_all(
            "GL Entry",
            filters={"voucher_type": voucher_type, "voucher_no": ["in", names], "is_cancelled": 0},
            fields=["voucher_no", "debit", "credit"],
        )
        balance_rows.extend((row.voucher_no, row.debit, row.credit) for row in gl)
        posted = {row.voucher_no for row in gl}
        # An invoice always posts to the ledger; a challan of non-stock items may not.
        if voucher_type == "Sales Invoice":
            unposted.extend(name for name in names if name not in posted)
    off = ledger_out_of_balance(balance_rows)
    unbalanced = sorted(set(unposted) | set(off))
    checks.append(
        _check(
            "ledger_balanced",
            "Every voucher balances (debits equal credits)",
            unbalanced,
            "All linked vouchers balance.",
            "Unbalanced or unposted vouchers: " + ", ".join("{0} ({1})".format(v, off.get(v, "no GL")) for v in unbalanced[:MAX_REFERENCES]),
        )
    )

    receivable_failures = []
    for invoice in invoices:
        ar = frappe.db.sql(
            """
            SELECT COALESCE(SUM(debit - credit), 0)
            FROM `tabGL Entry`
            WHERE voucher_type = 'Sales Invoice' AND voucher_no = %s
              AND party_type = 'Customer' AND party = %s AND is_cancelled = 0
            """,
            (invoice.name, invoice.customer),
        )[0][0]
        if not amounts_agree(ar, invoice.grand_total):
            receivable_failures.append(invoice.name)
    checks.append(
        _check(
            "receivable_ties_to_invoice",
            "Receivable posted for each invoice equals its grand total",
            receivable_failures,
            "Ledger receivable equals the invoice on every invoice.",
            "Receivable differs from the invoice total: " + ", ".join(receivable_failures[:MAX_REFERENCES]),
        )
    )
    return checks


def _gate_pass_check(notes):
    if not notes or not frappe.db.exists("DocType", "Trader Gate Pass"):
        return None
    note_names = [n.name for n in notes]
    passes = frappe.get_all(
        "Trader Gate Pass",
        filters={"delivery_note": ["in", note_names], "status": ["!=", "Cancelled"]},
        pluck="name",
    )
    released = defaultdict(float)
    if passes:
        for row in frappe.get_all(
            "Trader Gate Pass Item",
            filters={"parenttype": "Trader Gate Pass", "parent": ["in", passes]},
            fields=["item_code", "qty"],
        ):
            released[row.item_code] += flt(row.qty)
    challan_qty = defaultdict(float)
    for row in frappe.get_all(
        "Delivery Note Item",
        filters={"parent": ["in", note_names], "parenttype": "Delivery Note"},
        fields=["item_code", "qty"],
    ):
        challan_qty[row.item_code] += flt(row.qty)
    over = over_limit_refs(challan_qty, released)
    return _check(
        "gate_pass_release",
        "Gate passes release no more than the challans carry",
        over,
        "Released quantities are within the challans.",
        "Released more than the challans carry: " + ", ".join(over[:MAX_REFERENCES]),
    )


def _withholding_check(orders, invoices, company):
    from trader_app.api.quotation_rules import wht_mismatch
    from trader_app.api.tax_policy import resolve_wht

    if not invoices:
        return None
    quotations = set()
    for order in orders:
        source = frappe.db.get_value("Sales Order", order.name, "trader_source_quotation")
        if source:
            quotations.add(source)
    mismatched = []
    for invoice in invoices:
        policy = resolve_wht(company, "customer", invoice.grand_total, log=False)
        policy_rate = flt(policy["rate"]) if policy else 0.0
        for quotation in quotations:
            if wht_mismatch(frappe.db.get_value("Quotation", quotation, "trader_wht_percent") or 0, policy_rate):
                mismatched.append("{0} vs {1}".format(quotation, invoice.name))
    return _check(
        "withholding_consistent",
        "Withholding on the invoices matches the quotation",
        mismatched,
        "Invoices withhold the rate the quotation shows.",
        "Withholding differs from the quotation: " + "; ".join(mismatched[:MAX_REFERENCES]),
        warn=True,
    )


def build_reconciliation(opportunity, company):
    """Run every check for ``opportunity``. Returns checks and a summary."""
    quotations, orders, notes, invoices = _opportunity_documents(opportunity, company)
    checks = []
    if quotations:
        checks.append(_quotation_totals_check(quotations))
    if orders:
        checks.append(_order_selection_check(orders))
    if notes:
        checks.extend(_delivery_checks(orders, notes))
    checks.extend(c for c in _invoice_checks(notes, invoices) if c)
    stock = _stock_check(notes)
    if stock:
        checks.append(stock)
    if notes or invoices:
        checks.extend(_ledger_checks(notes, invoices))
    gate = _gate_pass_check(notes)
    if gate:
        checks.append(gate)
    wht = _withholding_check(orders, invoices, company)
    if wht:
        checks.append(wht)

    summary = {"pass": 0, "fail": 0, "warn": 0}
    for check in checks:
        summary[check["status"]] += 1
    return {
        "opportunity": opportunity,
        "company": company,
        "documents": {
            "quotations": [q.name for q in quotations],
            "order_confirmations": [o.name for o in orders],
            "delivery_notes": [n.name for n in notes],
            "invoices": [i.name for i in invoices],
        },
        "checks": checks,
        "summary": summary,
        "status": "fail" if summary["fail"] else ("warn" if summary["warn"] else "pass"),
    }


@frappe.whitelist()
def get_opportunity_reconciliation(opportunity, company=None):
    """Document-chain reconciliation for one Opportunity (read-only)."""
    from trader_app.api.opportunity import _load_opportunity

    doc = _load_opportunity(opportunity, company)
    result = build_reconciliation(doc.name, doc.company)
    result["title"] = _("Reconciliation for {0}").format(doc.name)
    return result


from trader_app.api._tenant_guard import apply_module_guards

apply_module_guards(globals(), "sales")

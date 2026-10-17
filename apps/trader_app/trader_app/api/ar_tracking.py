# -*- coding: utf-8 -*-
"""Trader App — Invoice payment tracking (AR-DOC, walkthrough step 7).

Answers "which invoices are paid, part-paid or late, and by how much?" for a
company, a customer or one Commercial Opportunity.

Two dates drive the status:

  * ``due_date``  — ERPNext's own payment-terms due date (contractual); and
  * ``trader_expected_payment_date`` — when the customer is *expected* to pay
    (commercial promise). Stamped on Sales Invoice validate from the customer's
    ``trader_payment_expected_days`` (opt-in: no days configured → no stamp).

Nothing here posts to the ledger. Paid/outstanding come from ERPNext's own
``outstanding_amount`` so the tracker can never disagree with the GL sub-ledger.
"""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import add_days, cint, flt, getdate, nowdate
from trader_app.api.company import (
    assert_document_company_access,
    resolve_active_company,
)

STATUS_PAID = "Paid"
STATUS_PART = "Part Paid"
STATUS_UNPAID = "Unpaid"


# ── Pure helpers (unit-tested, no database) ───────────────────────


def compute_expected_payment_date(posting_date, expected_days):
    """Posting date + expected days, or None when no expectation is configured."""
    days = cint(expected_days)
    if days <= 0 or not posting_date:
        return None
    return add_days(posting_date, days)


def classify_invoice_payment(
    grand_total,
    outstanding,
    due_date=None,
    expected_date=None,
    as_of=None,
    tolerance=0.0,
):
    """Classify one invoice.

    ``tolerance`` mirrors the AR profile settle tolerance: a residual not above
    it is reported as Paid (the same rule the posting side uses to settle).
    Returns paid amount, status, and how many days past each date (0 if not late
    or already settled).
    """
    total = flt(grand_total)
    open_amount = max(flt(outstanding), 0.0)
    paid = max(total - open_amount, 0.0)
    settled = open_amount <= max(flt(tolerance), 0.0)

    if settled:
        status = STATUS_PAID
    elif paid > 0:
        status = STATUS_PART
    else:
        status = STATUS_UNPAID

    today = getdate(as_of) if as_of else getdate(nowdate())

    def _days_past(value):
        if settled or not value:
            return 0
        return max((today - getdate(value)).days, 0)

    days_past_due = _days_past(due_date)
    days_past_expected = _days_past(expected_date)

    if settled:
        bucket = "settled"
    elif days_past_due > 0:
        bucket = "overdue"
    elif days_past_expected > 0:
        bucket = "expected_missed"
    else:
        bucket = "current"

    return {
        "paid_amount": round(paid, 2),
        "outstanding_amount": round(open_amount, 2),
        "status": status,
        "days_past_due": days_past_due,
        "days_past_expected": days_past_expected,
        "bucket": bucket,
    }


def summarize_tracker(rows):
    """Totals + counts per status/bucket for tracker rows."""
    out = {
        "invoice_count": len(rows),
        "receivable": 0.0,
        "paid": 0.0,
        "outstanding": 0.0,
        "by_status": {STATUS_PAID: 0, STATUS_PART: 0, STATUS_UNPAID: 0},
        "by_bucket": {"settled": 0, "current": 0, "expected_missed": 0, "overdue": 0},
    }
    for r in rows:
        out["receivable"] += flt(r.get("grand_total"))
        out["paid"] += flt(r.get("paid_amount"))
        out["outstanding"] += flt(r.get("outstanding_amount"))
        out["by_status"][r["status"]] = out["by_status"].get(r["status"], 0) + 1
        out["by_bucket"][r["bucket"]] = out["by_bucket"].get(r["bucket"], 0) + 1
    for key in ("receivable", "paid", "outstanding"):
        out[key] = round(out[key], 2)
    return out


# ── Hook: stamp expected payment date ────────────────────────────


def stamp_expected_payment_date(doc, method=None):
    """Sales Invoice validate hook. No-op unless the customer carries expected days."""
    if not doc.meta.has_field("trader_expected_payment_date"):
        return
    if doc.get("is_return") or doc.get("trader_expected_payment_date"):
        return
    if not doc.get("customer") or not doc.get("posting_date"):
        return
    if not frappe.db.has_column("Customer", "trader_payment_expected_days"):
        return
    days = frappe.db.get_value("Customer", doc.customer, "trader_payment_expected_days")
    expected = compute_expected_payment_date(doc.posting_date, days)
    if expected:
        doc.trader_expected_payment_date = expected


# ── API ───────────────────────────────────────────────────────────


def _tolerance_for(company):
    try:
        from trader_app.api.ar import resolve_ar_settings

        profile = resolve_ar_settings(company).get("profile") or {}
        return flt(profile.get("settle_tolerance") or 0)
    except Exception:
        return 0.0


@frappe.whitelist()
def get_invoice_payment_tracker(
    company=None,
    customer=None,
    opportunity=None,
    as_of=None,
    status=None,
    include_settled=1,
    limit=500,
):
    """Per-invoice payment status with days-late, for a company/customer/opportunity."""
    company = resolve_active_company(company)
    tolerance = _tolerance_for(company)

    has_opp = frappe.db.has_column("Sales Invoice", "trader_opportunity")
    has_exp = frappe.db.has_column("Sales Invoice", "trader_expected_payment_date")

    filters = {"company": company, "docstatus": 1, "is_return": 0}
    if customer:
        filters["customer"] = customer
    if opportunity:
        if not has_opp:
            frappe.throw(_("Opportunity tracking is not enabled on this site."))
        filters["trader_opportunity"] = opportunity

    fields = [
        "name",
        "customer",
        "customer_name",
        "posting_date",
        "due_date",
        "grand_total",
        "outstanding_amount",
        "currency",
    ]
    if has_exp:
        fields.append("trader_expected_payment_date")
    if has_opp:
        fields.append("trader_opportunity")

    invoices = frappe.get_list(
        "Sales Invoice",
        filters=filters,
        fields=fields,
        order_by="posting_date asc, name asc",
        limit_page_length=min(cint(limit) or 500, 2000),
    )

    rows = []
    for inv in invoices:
        verdict = classify_invoice_payment(
            inv.get("grand_total"),
            inv.get("outstanding_amount"),
            due_date=inv.get("due_date"),
            expected_date=inv.get("trader_expected_payment_date"),
            as_of=as_of,
            tolerance=tolerance,
        )
        row = {
            "invoice": inv["name"],
            "customer": inv.get("customer"),
            "customer_name": inv.get("customer_name"),
            "opportunity": inv.get("trader_opportunity"),
            "posting_date": inv.get("posting_date"),
            "due_date": inv.get("due_date"),
            "expected_payment_date": inv.get("trader_expected_payment_date"),
            "currency": inv.get("currency"),
            "grand_total": flt(inv.get("grand_total")),
            **verdict,
        }
        if status and row["status"] != status:
            continue
        if not cint(include_settled) and row["status"] == STATUS_PAID:
            continue
        rows.append(row)

    return {
        "as_of": str(getdate(as_of) if as_of else getdate(nowdate())),
        "settle_tolerance": tolerance,
        "rows": rows,
        "summary": summarize_tracker(rows),
    }


@frappe.whitelist()
def get_invoice_payment_history(invoice):
    """Every submitted Payment Entry allocation against one Sales Invoice."""
    inv = frappe.get_doc("Sales Invoice", invoice)
    inv.check_permission("read")
    assert_document_company_access(inv.company)

    refs = frappe.get_all(
        "Payment Entry Reference",
        filters={
            "reference_doctype": "Sales Invoice",
            "reference_name": invoice,
            "parenttype": "Payment Entry",
        },
        fields=["parent", "allocated_amount"],
    )
    history = []
    for ref in refs:
        pe = frappe.db.get_value(
            "Payment Entry",
            ref["parent"],
            ["posting_date", "mode_of_payment", "reference_no", "paid_amount", "docstatus"],
            as_dict=True,
        )
        if not pe or pe.docstatus != 1:
            continue
        history.append(
            {
                "payment_entry": ref["parent"],
                "posting_date": pe.posting_date,
                "mode_of_payment": pe.mode_of_payment,
                "reference_no": pe.reference_no,
                "receipt_amount": flt(pe.paid_amount),
                "allocated_to_invoice": flt(ref["allocated_amount"]),
            }
        )
    history.sort(key=lambda h: (str(h["posting_date"]), h["payment_entry"]))
    return {
        "invoice": invoice,
        "grand_total": flt(inv.grand_total),
        "outstanding_amount": flt(inv.outstanding_amount),
        "payments": history,
    }


from trader_app.api._tenant_guard import apply_module_guards

apply_module_guards(globals(), "finance")

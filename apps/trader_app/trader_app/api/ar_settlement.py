# -*- coding: utf-8 -*-
"""Trader App — settle-tolerance write-off on customer receipts (AR-DOC FR-ALC-03).

Business rule (from the walkthrough): a receipt that leaves an invoice short by
no more than the AR profile's ``settle_tolerance`` closes the invoice. The legacy
system flagged the invoice *settled* but posted no entry for the shortfall, which
left its general ledger out of balance by exactly that shortfall.

Here the shortfall is written off explicitly, inside the same Payment Entry,
through ERPNext's native *deductions* table:

    Dr Bank                    received
    Dr Write-off account       shortfall      (the deduction row)
    Cr Accounts Receivable     received + shortfall  (= invoice outstanding)

Every voucher therefore balances by construction and the customer sub-ledger and
the GL agree. Opt-in: nothing happens unless the company's AR profile is active,
has ``settle_tolerance`` > 0 *and* a ``write_off_account``.
"""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import flt
from trader_app.api.decision_log import log_decision

MARKER = "TRADER-TOLERANCE"


# ── Pure helpers (unit-tested, no database) ───────────────────────


def plan_tolerance_writeoffs(refs, tolerance):
    """Which references fall short by a write-off-able amount.

    ``refs`` — iterable of dicts ``{"name", "outstanding", "allocated"}``.
    Returns ``[{"name", "delta"}]`` for refs where ``0 < outstanding - allocated
    <= tolerance`` and something is actually being allocated.
    """
    tol = flt(tolerance)
    plan = []
    if tol <= 0:
        return plan
    for ref in refs:
        allocated = flt(ref.get("allocated"))
        if allocated <= 0:
            continue
        remaining = round(flt(ref.get("outstanding")) - allocated, 2)
        if 0 < remaining <= tol:
            plan.append({"name": ref["name"], "delta": remaining})
    return plan


def encode_marker(reference_name, delta):
    return "{0}|{1}|{2:.2f}".format(MARKER, reference_name, flt(delta))


def decode_marker(text):
    """Return (reference_name, delta) or None when ``text`` is not an auto row."""
    parts = (text or "").split("|")
    if len(parts) != 3 or parts[0] != MARKER:
        return None
    try:
        return parts[1], flt(parts[2])
    except (TypeError, ValueError):
        return None


# ── Hook ──────────────────────────────────────────────────────────


def apply_settle_tolerance(doc, method=None):
    """Payment Entry ``before_validate``: absorb a within-tolerance shortfall.

    Idempotent across repeated saves of the same draft: rows added by an earlier
    pass are reversed first (they carry a marker in ``description``), then the
    plan is recomputed from the current allocations.
    """
    if doc.docstatus != 0:
        return
    if doc.get("payment_type") != "Receive" or doc.get("party_type") != "Customer":
        return
    company = doc.get("company")
    if not company:
        return

    try:
        from trader_app.api.ar import get_active_ar_profile

        profile = get_active_ar_profile(company)
    except Exception:
        return
    if not profile:
        return
    tolerance = flt(profile.get("settle_tolerance") or 0)
    account = profile.get("write_off_account")
    if tolerance <= 0 or not account:
        return

    refs = [r for r in (doc.get("references") or []) if r.get("reference_doctype") == "Sales Invoice"]
    if not refs and not doc.get("deductions"):
        return

    # 1. Reverse anything a previous pass added to this draft.
    kept = []
    for row in list(doc.get("deductions") or []):
        decoded = decode_marker(row.get("description"))
        if not decoded:
            kept.append(row)
            continue
        ref_name, delta = decoded
        for ref in refs:
            if ref.reference_name == ref_name:
                ref.allocated_amount = round(flt(ref.allocated_amount) - delta, 2)
                break
    if len(kept) != len(doc.get("deductions") or []):
        doc.set("deductions", kept)

    # 2. Plan from the live outstanding of each submitted invoice.
    candidates = []
    for ref in refs:
        if not ref.get("reference_name"):
            continue
        invoice = frappe.db.get_value(
            "Sales Invoice",
            ref.reference_name,
            ["outstanding_amount", "docstatus", "is_return"],
            as_dict=True,
        )
        if not invoice or invoice.docstatus != 1 or invoice.is_return:
            continue
        candidates.append(
            {
                "name": ref.reference_name,
                "outstanding": flt(invoice.outstanding_amount),
                "allocated": flt(ref.allocated_amount),
                "row": ref,
            }
        )

    plan = plan_tolerance_writeoffs(candidates, tolerance)
    if not plan:
        return

    cost_center = frappe.get_cached_value("Company", company, "cost_center")
    by_name = {c["name"]: c["row"] for c in candidates}
    applied = []
    for step in plan:
        row = by_name[step["name"]]
        row.allocated_amount = round(flt(row.allocated_amount) + step["delta"], 2)
        doc.append(
            "deductions",
            {
                "account": account,
                "cost_center": cost_center,
                "amount": step["delta"],
                "description": encode_marker(step["name"], step["delta"]),
            },
        )
        applied.append({"invoice": step["name"], "written_off": step["delta"]})

    log_decision(
        "posting",
        company=company,
        outcome="applied",
        message=_("Settle tolerance: wrote off {0} invoice shortfall(s) within {1}").format(
            len(applied), tolerance
        ),
        inputs={"tolerance": tolerance, "write_off_account": account},
        output={"write_offs": applied},
        reference_doctype="Payment Entry",
        reference_name=doc.get("name"),
        policy="ar_profile",
    )

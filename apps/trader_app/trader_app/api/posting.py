# -*- coding: utf-8 -*-
"""Trader App — configurable posting profiles + dry-run preview (PRD FR-8).

ERPNext already posts the GL on Sales Invoice submit. This layer makes the
account mapping *configuration* (a `Trader Posting Profile`) and — critically —
adds a **dry-run preview** so the ledger impact can be reviewed *before* the
irreversible submit, satisfying the PRD's fail-fast + preview requirement.

Nothing here is enforced unless a company has an active posting profile.
"""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import flt

from trader_app.api.company import resolve_active_company
from trader_app.api.decision_log import log_decision


def get_posting_profile(company, event="sales_invoice"):
    name = frappe.db.get_value(
        "Trader Posting Profile", {"company": company, "event": event, "is_active": 1}, "name"
    )
    return frappe.get_cached_doc("Trader Posting Profile", name) if name else None


def apply_posting_profile(doc, method=None):
    """validate hook — stamp configured accounts onto the invoice when unset. Opt-in."""
    if doc.doctype != "Sales Invoice":
        return
    profile = get_posting_profile(getattr(doc, "company", None), "sales_invoice")
    if not profile:
        return

    changed = {}
    if profile.receivable_account and not doc.get("debit_to"):
        doc.debit_to = profile.receivable_account
        changed["debit_to"] = profile.receivable_account
    for it in doc.get("items", []):
        if profile.income_account and not it.get("income_account"):
            it.income_account = profile.income_account
        if profile.cost_center and not it.get("cost_center"):
            it.cost_center = profile.cost_center
    if changed:
        log_decision(
            "posting", company=doc.company, outcome="applied",
            message="Posting profile accounts applied",
            output=changed, reference_doctype=doc.doctype,
            reference_name=doc.name or "(unsaved)", policy=profile.name,
        )


def build_posting_preview(doc):
    """Pure double-entry preview from a document's computed totals (no side effects)."""
    entries = []
    grand = flt(doc.get("grand_total"))

    # Optional WHT (reduces the receivable, debits the WHT account)
    wht_amount = 0.0
    wht_account = None
    try:
        from trader_app.api.tax_policy import resolve_wht

        wht = resolve_wht(doc.get("company"), "customer", grand, log=False)
        if wht:
            wht_amount = flt(wht["wht_amount"])
            profile = get_posting_profile(doc.get("company"), "sales_invoice")
            wht_account = (profile and profile.wht_account) or wht.get("account") or "(WHT account)"
    except Exception:
        wht_amount = 0.0

    debtors = doc.get("debit_to") or "(receivable)"
    entries.append({"account": debtors, "debit": round(grand - wht_amount, 2), "credit": 0.0})
    if wht_amount:
        entries.append({"account": wht_account, "debit": round(wht_amount, 2), "credit": 0.0})

    income = {}
    for it in doc.get("items", []):
        acc = it.get("income_account") or "(income)"
        income[acc] = income.get(acc, 0.0) + flt(it.get("net_amount") or it.get("amount"))
    for acc, amt in income.items():
        entries.append({"account": acc, "debit": 0.0, "credit": round(amt, 2)})

    for tx in doc.get("taxes", []):
        amt = flt(tx.get("tax_amount") or tx.get("base_tax_amount_after_discount_amount"))
        if amt:
            entries.append({"account": tx.get("account_head"), "debit": 0.0, "credit": round(amt, 2)})

    total_debit = round(sum(e["debit"] for e in entries), 2)
    total_credit = round(sum(e["credit"] for e in entries), 2)
    return {
        "entries": entries,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "balanced": total_debit == total_credit,
        "wht_amount": round(wht_amount, 2),
    }


@frappe.whitelist()
def preview_posting(doctype, name):
    """Dry-run: show the GL impact a document would post, without submitting it."""
    doc = frappe.get_doc(doctype, name)
    from trader_app.api.company import assert_document_company_access

    assert_document_company_access(doc.get("company"))
    preview = build_posting_preview(doc)
    log_decision(
        "posting", company=doc.get("company"), outcome="applied",
        message="Dry-run posting preview ({0})".format("balanced" if preview["balanced"] else "UNBALANCED"),
        output={"total_debit": preview["total_debit"], "total_credit": preview["total_credit"],
                "balanced": preview["balanced"]},
        reference_doctype=doctype, reference_name=name,
    )
    return preview

# -*- coding: utf-8 -*-
"""Trader App — FX rate-clause / snapshot engine (PRD FR-6).

For foreign-currency documents, a `Trader FX Policy` controls:
  * WHEN the exchange rate is snapshotted (on create, on finalize, or both);
  * HOW LONG the quoted rate stays valid (the rate-clause validity window);
  * HOW amounts print (local only / both / foreign only).

The snapshot is written to custom fields on the document so the rate that was
agreed is preserved even if the market rate later moves. Local-currency
documents (currency == company currency) are ignored.
"""

from __future__ import unicode_literals

import frappe
from frappe.utils import add_days, cint, flt, nowdate

from trader_app.api.decision_log import log_decision

SNAP_RATE = "trader_fx_rate_snapshot"
SNAP_DATE = "trader_fx_snapshot_date"
SNAP_VALID = "trader_fx_clause_valid_until"
SNAP_MODE = "trader_fx_print_mode"


def get_fx_policy(company):
    name = frappe.db.get_value("Trader FX Policy", {"company": company, "is_active": 1}, "name")
    if not name:
        return None
    doc = frappe.get_cached_doc("Trader FX Policy", name)
    return {
        "policy": doc.name,
        "snapshot_trigger": doc.snapshot_trigger or "finalize",
        "validity_days": cint(doc.validity_days),
        "print_mode": doc.print_mode or "both",
    }


def _is_foreign(doc):
    company = getattr(doc, "company", None)
    ccy = getattr(doc, "currency", None)
    if not company or not ccy:
        return False, None
    base = frappe.get_cached_value("Company", company, "default_currency")
    return (ccy != base), base


def snapshot_fx(doc, event):
    """Snapshot the FX rate + clause onto ``doc`` when the policy trigger matches
    ``event`` ('create' or 'finalize'). Returns True if a snapshot was written."""
    if not frappe.get_meta(doc.doctype).has_field(SNAP_RATE):
        return False
    foreign, _base = _is_foreign(doc)
    if not foreign:
        return False
    company = doc.company
    policy = get_fx_policy(company)
    if not policy:
        return False

    trigger = policy["snapshot_trigger"]
    if trigger != "both" and trigger != event:
        return False
    # 'create' is idempotent — do not re-stamp if already snapshotted.
    if event == "create" and getattr(doc, SNAP_DATE, None):
        return False

    rate = flt(getattr(doc, "conversion_rate", 0)) or 1.0
    today = nowdate()
    doc.set(SNAP_RATE, rate)
    doc.set(SNAP_DATE, today)
    doc.set(SNAP_VALID, add_days(today, policy["validity_days"]))
    doc.set(SNAP_MODE, policy["print_mode"])

    log_decision(
        "fx", company=company, outcome="applied",
        message="FX rate {0} snapshotted ({1}); clause valid {2} days".format(
            rate, event, policy["validity_days"]),
        inputs={"currency": doc.currency, "event": event},
        output={"rate": rate, "valid_until": getattr(doc, SNAP_VALID), "print_mode": policy["print_mode"]},
        reference_doctype=doc.doctype, reference_name=doc.name or "(unsaved)",
        policy=policy["policy"],
    )
    return True


def snapshot_on_create(doc, method=None):
    """validate hook — snapshot on the 'create' trigger."""
    snapshot_fx(doc, "create")


def snapshot_on_finalize(doc, method=None):
    """before_submit hook — snapshot on the 'finalize' trigger (authoritative lock)."""
    snapshot_fx(doc, "finalize")

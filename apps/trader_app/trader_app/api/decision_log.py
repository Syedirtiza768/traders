# -*- coding: utf-8 -*-
"""Trader App — decision logging for configurable policy execution.

Every configurable rule / tax / WHT / FX / grouping / posting decision writes a
Trader Decision Log row capturing the inputs, the policy that matched, and the
output — the human-readable "why this amount/state/posting occurred" trace
required by the Sales Lifecycle Extension (PRD FR-10).

Logging must never break a business flow: failures here are swallowed and sent
to the Frappe error log instead of propagating.
"""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import cint

DECISION_TYPES = frozenset(
    {"validation", "tax", "wht", "fx", "grouping", "posting", "state", "other"}
)


def log_decision(
    decision_type,
    company=None,
    outcome=None,
    message=None,
    inputs=None,
    output=None,
    reference_doctype=None,
    reference_name=None,
    policy=None,
    tenant=None,
):
    """Append a Trader Decision Log row. Returns the record name, or None on failure."""
    try:
        if decision_type not in DECISION_TYPES:
            decision_type = "other"

        doc = frappe.get_doc(
            {
                "doctype": "Trader Decision Log",
                "company": company,
                "tenant": tenant,
                "decision_type": decision_type,
                "outcome": outcome,
                "message": message,
                "inputs": inputs or {},
                "output": output or {},
                "reference_doctype": reference_doctype,
                "reference_name": reference_name,
                "policy": policy,
                "actor": frappe.session.user,
            }
        )
        doc.insert(ignore_permissions=True)
        return doc.name
    except Exception:
        frappe.log_error(frappe.get_traceback(), "log_decision failed")
        return None


@frappe.whitelist()
def get_decision_trace(reference_doctype, reference_name, limit=200):
    """Explainability trace (PRD FR-10) — every logged decision for a document,
    oldest first, so the SPA can answer 'why this amount/state/posting occurred'.

    Tenant-scoped: a user may only read traces for a document in a company they
    can access, and rows are additionally filtered to permitted companies so a
    trace can never leak another tenant's decisions.
    """
    from trader_app.api.company import get_permitted_company_names, user_can_access_company

    user = frappe.session.user

    # Enforce access to the referenced document's company (when it has one).
    if frappe.db.exists(reference_doctype, reference_name) and frappe.get_meta(
        reference_doctype
    ).has_field("company"):
        doc_company = frappe.db.get_value(reference_doctype, reference_name, "company")
        if doc_company and not user_can_access_company(doc_company, user):
            frappe.throw(
                _("You do not have permission to view decisions for {0}.").format(reference_name),
                frappe.PermissionError,
            )

    rows = frappe.get_all(
        "Trader Decision Log",
        filters={"reference_doctype": reference_doctype, "reference_name": reference_name},
        fields=["name", "decision_type", "outcome", "message", "policy",
                "inputs", "output", "actor", "timestamp", "company"],
        order_by="timestamp asc, creation asc",
        limit_page_length=cint(limit),
    )

    # Defense in depth: drop any row for a company the user cannot access.
    if user != "Administrator":
        permitted = set(get_permitted_company_names(user))
        rows = [r for r in rows if not r.get("company") or r["company"] in permitted]
    return rows

# -*- coding: utf-8 -*-
"""Trader App — configurable document template resolution (PRD FR-9 / AR-DOC).

A `Trader Template Map` picks the Frappe Print Format for a document based on
(company, doctype, customer profile, optional print persona). Falls back to the
existing invoice-type default resolver so nothing breaks when no map is configured.
"""

from __future__ import unicode_literals

import frappe

from trader_app.api.company import resolve_active_company


def resolve_template(target_doctype, company=None, customer=None, persona=None):
    """Return the mapped Print Format name, or None if no map applies.

    When ``persona`` is set, prefer maps with that persona; otherwise prefer
    blank-persona (legacy) rows. Customer profile match still beats default.
    """
    company = resolve_active_company(company)
    profile = frappe.db.get_value("Customer", customer, "customer_group") if customer else None
    persona = (persona or "").strip().lower() or None

    fields = ["print_format", "customer_profile", "priority"]
    # persona column may be absent until migrate — fail soft.
    has_persona = frappe.db.has_column("Trader Template Map", "persona")
    if has_persona:
        fields.append("persona")

    rows = frappe.get_all(
        "Trader Template Map",
        filters={"company": company, "target_doctype": target_doctype, "is_active": 1},
        fields=fields,
        order_by="priority asc, creation asc",
    )

    def _persona_of(row):
        if not has_persona:
            return None
        return (row.get("persona") or "").strip().lower() or None

    def _pick(want_persona):
        # Profile-specific match wins over the default (blank profile) row.
        for r in rows:
            if _persona_of(r) != want_persona:
                continue
            if r.customer_profile and r.customer_profile == profile:
                return r.print_format
        for r in rows:
            if _persona_of(r) != want_persona:
                continue
            if not r.customer_profile:
                return r.print_format
        return None

    if persona:
        fmt = _pick(persona)
        if fmt:
            return fmt
        # Fall back to legacy blank-persona maps for the same doctype.
        return _pick(None)

    return _pick(None)


@frappe.whitelist()
def get_document_template(target_doctype, company=None, customer=None, persona=None):
    """SPA helper — resolve the print format for a document, with graceful fallback."""
    fmt = resolve_template(target_doctype, company, customer, persona=persona)
    return {"print_format": fmt, "mapped": bool(fmt), "persona": persona}

# -*- coding: utf-8 -*-
"""Trader App — configurable document template resolution (PRD FR-9).

A `Trader Template Map` picks the Frappe Print Format for a document based on
(company, doctype, customer profile). Falls back to the existing invoice-type
default resolver so nothing breaks when no map is configured.
"""

from __future__ import unicode_literals

import frappe

from trader_app.api.company import resolve_active_company


def resolve_template(target_doctype, company=None, customer=None):
    """Return the mapped Print Format name, or None if no map applies."""
    company = resolve_active_company(company)
    profile = frappe.db.get_value("Customer", customer, "customer_group") if customer else None

    rows = frappe.get_all(
        "Trader Template Map",
        filters={"company": company, "target_doctype": target_doctype, "is_active": 1},
        fields=["print_format", "customer_profile", "priority"],
        order_by="priority asc, creation asc",
    )
    # Profile-specific match wins over the default (blank profile) row.
    for r in rows:
        if r.customer_profile and r.customer_profile == profile:
            return r.print_format
    for r in rows:
        if not r.customer_profile:
            return r.print_format
    return None


@frappe.whitelist()
def get_document_template(target_doctype, company=None, customer=None):
    """SPA helper — resolve the print format for a document, with graceful fallback."""
    fmt = resolve_template(target_doctype, company, customer)
    return {"print_format": fmt, "mapped": bool(fmt)}

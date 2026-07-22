# -*- coding: utf-8 -*-
"""Trader App — Customer master pack (SA Hamid customer-entity subset).

Opt-in per company via ``Company.trader_customer_pack_enabled`` and an active
``Trader Customer Profile``. Electrance is a template key, not a runtime branch.
"""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import cint

from trader_app.api.company import resolve_active_company
from trader_app.api.decision_log import log_decision


PROFILE_TEMPLATES = {
    "minimal": {
        "extended_master_fields": 0,
        "require_tax_id": 0,
        "require_billing_address": 0,
        "require_payment_terms": 0,
        "contacts_enabled": 0,
        "ship_to_sites_enabled": 0,
        "notes_enabled": 0,
        "require_customer_po": 0,
        "credit_limit_enabled": 0,
        "enforce_credit_hold": 0,
    },
    "electrance": {
        "extended_master_fields": 1,
        "require_tax_id": 0,
        "require_billing_address": 1,
        "require_payment_terms": 1,
        "contacts_enabled": 1,
        "ship_to_sites_enabled": 0,
        "notes_enabled": 1,
        "require_customer_po": 1,
        "credit_limit_enabled": 1,
        "enforce_credit_hold": 0,
    },
}

DEFAULT_INACTIVE_PROFILE = dict(PROFILE_TEMPLATES["minimal"])


def build_profile_defaults(template="minimal"):
    key = (template or "minimal").strip().lower()
    if key not in PROFILE_TEMPLATES:
        raise ValueError("Unknown Customer pack template: {0}".format(template))
    out = dict(PROFILE_TEMPLATES[key])
    out["template_key"] = key
    return out


def is_customer_pack_enabled(company=None):
    company = resolve_active_company(company)
    return bool(
        cint(frappe.db.get_value("Company", company, "trader_customer_pack_enabled") or 0)
    )


def get_active_customer_profile(company=None):
    company = resolve_active_company(company)
    if not is_customer_pack_enabled(company):
        return None
    name = frappe.db.get_value(
        "Trader Customer Profile",
        {"company": company, "is_active": 1},
        "name",
    )
    if not name:
        return None
    return frappe.get_cached_doc("Trader Customer Profile", name).as_dict()


def resolve_customer_pack_settings(company=None):
    company = resolve_active_company(company)
    enabled = is_customer_pack_enabled(company)
    profile = get_active_customer_profile(company) if enabled else None
    effective = dict(DEFAULT_INACTIVE_PROFILE)
    if profile:
        for key in DEFAULT_INACTIVE_PROFILE:
            if key in profile:
                effective[key] = profile.get(key)
        effective["name"] = profile.get("name")
        effective["profile_name"] = profile.get("profile_name")
        effective["template_key"] = profile.get("template_key")
        effective["is_active"] = 1
    else:
        effective["name"] = None
        effective["profile_name"] = None
        effective["template_key"] = None
        effective["is_active"] = 0
    return {
        "company": company,
        "customer_pack_enabled": enabled,
        "profile": effective,
    }


def validate_customer_payload(data, company=None):
    """Pure-ish validation against active pack rules. ``data`` is a dict."""
    settings = resolve_customer_pack_settings(company)
    profile = settings["profile"]
    if not settings["customer_pack_enabled"] or not cint(profile.get("extended_master_fields")):
        return

    if cint(profile.get("require_tax_id")) and not (data.get("tax_id") or "").strip():
        frappe.throw(_("Tax ID is required for this company."))
    if cint(profile.get("require_payment_terms")) and not (data.get("payment_terms") or "").strip():
        frappe.throw(_("Payment Terms are required for this company."))
    if cint(profile.get("require_billing_address")):
        addr = data.get("billing_address") or {}
        if not (addr.get("address_line1") or "").strip():
            frappe.throw(_("Billing address line 1 is required for this company."))
        if not (addr.get("city") or "").strip():
            frappe.throw(_("Billing city is required for this company."))


@frappe.whitelist()
def get_customer_pack_settings(company=None):
    return resolve_customer_pack_settings(company)


@frappe.whitelist()
def set_customer_pack_enabled(enabled=0, company=None):
    roles = set(frappe.get_roles())
    if frappe.session.user != "Administrator":
        if not roles.intersection({"System Manager", "Trader Admin", "Trader Super Admin"}):
            frappe.throw(_("Only Trader Admin may change feature flags."))

    company = resolve_active_company(company)
    enabled = cint(enabled)
    frappe.db.set_value("Company", company, "trader_customer_pack_enabled", enabled)

    log_decision(
        "other",
        company=company,
        outcome="applied",
        message="Customer pack master switch set to {0}".format(enabled),
        output={"customer_pack_enabled": bool(enabled)},
        policy="customer_pack_flag",
    )
    frappe.db.commit()
    return {"ok": True, "company": company, "customer_pack_enabled": bool(enabled)}

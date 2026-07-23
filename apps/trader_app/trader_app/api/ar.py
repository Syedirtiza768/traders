# -*- coding: utf-8 -*-
"""Trader App — Customer AR & Document Prints (AR-DOC PRD).

Opt-in per company via ``Company.trader_ar_enabled`` and an active
``Trader AR Profile``. Electrence is a *template key* for seeding, not a
runtime company-name branch.
"""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import cint, flt

from trader_app.api.company import resolve_active_company
from trader_app.api.decision_log import log_decision


PROFILE_TEMPLATES = {
    "minimal": {
        "settle_tolerance": 0.01,
        "auto_allocate_on_receipt": 0,
        "require_explicit_allocation": 1,
        "allow_unallocate": 1,
        "block_return_if_allocated": 1,
        "withhold_reporting_enabled": 0,
        "default_wht_percent": 0,
        "default_gst_withhold_percent": 0,
        "post_exchange_diff_on_allocation": 0,
        "exchange_gain_loss_account": None,
        "wht_account": None,
        "gst_withhold_account": None,
        "print_personas_enabled": 0,
        "secure_internal_prints": 1,
        "shop_sale_enabled": 0,
    },
    # Project-led AR + print personas (Electrence go-live shape).
    "electrence": {
        "settle_tolerance": 5.0,
        "auto_allocate_on_receipt": 0,
        "require_explicit_allocation": 1,
        "allow_unallocate": 1,
        "block_return_if_allocated": 1,
        "withhold_reporting_enabled": 1,
        "default_wht_percent": 4.5,
        "default_gst_withhold_percent": 20,
        "post_exchange_diff_on_allocation": 0,
        "exchange_gain_loss_account": None,
        "wht_account": None,
        "gst_withhold_account": None,
        "print_personas_enabled": 1,
        "secure_internal_prints": 1,
        "shop_sale_enabled": 0,
    },
}

DEFAULT_INACTIVE_PROFILE = dict(PROFILE_TEMPLATES["minimal"])

PRINT_PERSONAS = ("internal", "external", "commercial", "tax")

INTERNAL_PRINT_ROLES = frozenset({
    "Administrator",
    "System Manager",
    "Trader Admin",
    "Trader Super Admin",
    "Trader Finance Manager",
    "Trader Sales Manager",
})


_TEMPLATE_ALIASES = {"electrance": "electrence"}


def build_profile_defaults(template="minimal"):
    key = _TEMPLATE_ALIASES.get((template or "minimal").strip().lower(), (template or "minimal").strip().lower())
    if key not in PROFILE_TEMPLATES:
        raise ValueError("Unknown AR template: {0}".format(template))
    out = dict(PROFILE_TEMPLATES[key])
    out["template_key"] = key
    return out


def is_ar_enabled(company=None):
    company = resolve_active_company(company)
    return bool(cint(frappe.db.get_value("Company", company, "trader_ar_enabled") or 0))


def assert_ar_enabled(company=None):
    company = resolve_active_company(company)
    if not is_ar_enabled(company):
        frappe.throw(
            _("Customer AR module is not enabled for company {0}.").format(company),
            frappe.PermissionError,
        )
    return company


def get_active_ar_profile(company=None):
    company = resolve_active_company(company)
    if not is_ar_enabled(company):
        return None
    name = frappe.db.get_value(
        "Trader AR Profile",
        {"company": company, "is_active": 1},
        "name",
    )
    if not name:
        return None
    return frappe.get_cached_doc("Trader AR Profile", name).as_dict()


def resolve_ar_settings(company=None):
    company = resolve_active_company(company)
    enabled = is_ar_enabled(company)
    profile = get_active_ar_profile(company) if enabled else None
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
        "ar_enabled": enabled,
        "profile": effective,
    }


def is_within_settle_tolerance(remaining, tolerance):
    """Pure: True when abs(remaining) is within tolerance (FR-ALC-03)."""
    return abs(flt(remaining)) <= flt(tolerance)


def reported_outstanding(posted_amount, allocated_amount, wht_amount=0, gst_withhold_amount=0,
                         apply_withhold=False):
    """Pure: outstanding for aging; withhold pots only affect reporting when flagged."""
    base = flt(posted_amount) - flt(allocated_amount)
    if apply_withhold:
        base = base - flt(wht_amount) - flt(gst_withhold_amount)
    return base if base > 0 else 0.0


def can_access_internal_print(user_roles=None):
    roles = set(user_roles or [])
    return bool(roles.intersection(INTERNAL_PRINT_ROLES)) or "Administrator" in roles


@frappe.whitelist()
def get_ar_settings(company=None):
    return resolve_ar_settings(company)


@frappe.whitelist()
def set_ar_enabled(enabled=0, company=None):
    roles = set(frappe.get_roles())
    if frappe.session.user != "Administrator":
        if not roles.intersection({"System Manager", "Trader Admin", "Trader Super Admin"}):
            frappe.throw(_("Only Trader Admin may change feature flags."))

    company = resolve_active_company(company)
    enabled = cint(enabled)
    frappe.db.set_value("Company", company, "trader_ar_enabled", enabled)

    tenant = frappe.db.get_value("Company", company, "trader_tenant")
    if tenant and frappe.db.exists("Trader Tenant", tenant):
        rows = frappe.get_all(
            "Trader Tenant Module",
            filters={"parent": tenant, "parenttype": "Trader Tenant", "module_key": "ar"},
            fields=["name"],
        )
        if rows:
            for row in rows:
                frappe.db.set_value(
                    "Trader Tenant Module", row.name, "enabled", enabled, update_modified=False
                )
        elif enabled:
            tdoc = frappe.get_doc("Trader Tenant", tenant)
            tdoc.append("enabled_modules", {"module_key": "ar", "enabled": 1})
            tdoc.save(ignore_permissions=True)

    log_decision(
        "other",
        company=company,
        outcome="applied",
        message="Customer AR master switch set to {0}".format(enabled),
        output={"ar_enabled": bool(enabled)},
        policy="ar_flag",
    )
    frappe.db.commit()
    return {"ok": True, "company": company, "ar_enabled": bool(enabled)}


@frappe.whitelist()
def list_print_personas(doctype, company=None):
    """Personas available for a document kind when AR print pack is on."""
    company = resolve_active_company(company)
    settings = resolve_ar_settings(company)
    profile = settings["profile"]
    if not settings["ar_enabled"] or not cint(profile.get("print_personas_enabled")):
        return {"company": company, "personas": [], "enabled": False}

    personas = []
    roles = frappe.get_roles()
    for persona in PRINT_PERSONAS:
        if persona == "internal" and cint(profile.get("secure_internal_prints")):
            if not can_access_internal_print(roles):
                continue
        personas.append(persona)
    return {"company": company, "doctype": doctype, "personas": personas, "enabled": True}


@frappe.whitelist()
def resolve_print_persona(doctype, persona=None, company=None, customer=None, name=None):
    """Resolve Print Format for a persona; enforces Internal security."""
    from trader_app.api.templates import resolve_template

    company = resolve_active_company(company)
    settings = resolve_ar_settings(company)
    profile = settings["profile"]
    persona = (persona or "").strip().lower() or None

    if persona == "internal" and cint(profile.get("secure_internal_prints")):
        if not can_access_internal_print(frappe.get_roles()):
            frappe.throw(
                _("You do not have permission to open Internal prints."),
                frappe.PermissionError,
            )

    fmt = None
    if settings["ar_enabled"] and cint(profile.get("print_personas_enabled")) and persona:
        fmt = resolve_template(doctype, company=company, customer=customer, persona=persona)
    if not fmt:
        fmt = resolve_template(doctype, company=company, customer=customer, persona=None)

    return {
        "doctype": doctype,
        "name": name,
        "persona": persona,
        "print_format": fmt,
        "mapped": bool(fmt),
    }

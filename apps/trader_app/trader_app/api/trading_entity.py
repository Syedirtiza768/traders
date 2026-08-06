# -*- coding: utf-8 -*-
"""Trader App — Trading Entity (DBA) API.

Maintain commercial identities under one Company: letterhead branding + customer scoping.
"""

from __future__ import unicode_literals

import json

import frappe
from frappe import _
from frappe.utils import cint

from trader_app.api.company import resolve_active_company
from trader_app.api.tenant import (
    get_enabled_module_keys,
    get_tenant_module_config,
    is_multitenant_enabled,
    resolve_active_tenant,
)


def _parse(data):
    if data is None:
        return {}
    if isinstance(data, dict):
        return data
    if isinstance(data, str):
        data = data.strip()
        if not data:
            return {}
        return json.loads(data)
    return {}


def _require_admin():
    if frappe.session.user == "Administrator":
        return
    roles = set(frappe.get_roles(frappe.session.user))
    if not roles.intersection({"System Manager", "Trader Admin", "Trader Super Admin"}):
        frappe.throw(_("Administrator access required."), frappe.PermissionError)


def is_trading_entity_enabled(company=None):
    """True when tenant module or company flag is on."""
    company = company or resolve_active_company()
    if company and frappe.db.has_column("Company", "trader_trading_entity_enabled"):
        if cint(frappe.db.get_value("Company", company, "trader_trading_entity_enabled")):
            return True

    if is_multitenant_enabled():
        tenant = resolve_active_tenant()
        if tenant and "trading_entity" in get_enabled_module_keys(tenant):
            return True
    return False


def assignment_required(company=None):
    """Require customer assignment when module on and at least one active entity exists."""
    if not is_trading_entity_enabled(company):
        return False
    company = resolve_active_company(company)
    if is_multitenant_enabled():
        tenant = resolve_active_tenant()
        if tenant:
            cfg = get_tenant_module_config(tenant, "trading_entity") or {}
            if cfg.get("assignment_required") is False:
                return False
    active = cint(
        frappe.db.count(
            "Trader Trading Entity",
            {"company": company, "is_active": 1},
        )
    )
    return active > 0


def _serialize(doc):
    usage = 0
    if frappe.db.has_column("Customer", "trader_trading_entity"):
        usage = cint(
            frappe.db.count("Customer", {"trader_trading_entity": doc.name})
        )
    return {
        "name": doc.name,
        "trading_name": doc.trading_name,
        "company": doc.company,
        "code": doc.code or "",
        "letterhead_address": doc.letterhead_address or "",
        "is_active": cint(doc.is_active),
        "is_default": cint(doc.is_default),
        "logo": doc.logo or "",
        "letterhead_header": doc.letterhead_header or "",
        "letterhead_footer": doc.letterhead_footer or "",
        "customer_count": usage,
    }


def _public_file_url(path):
    if not path:
        return ""
    if path.startswith("http://") or path.startswith("https://") or path.startswith("/"):
        return path
    return "/" + path.lstrip("/")


def resolve_letterhead_for_customer(customer, company=None):
    """Return letterhead overrides from the customer's Trading Entity, or empty dict."""
    if not customer or not is_trading_entity_enabled(company):
        return {}
    if not frappe.db.has_column("Customer", "trader_trading_entity"):
        return {}

    entity_name = frappe.db.get_value("Customer", customer, "trader_trading_entity")
    if not entity_name or not frappe.db.exists("Trader Trading Entity", entity_name):
        return {}

    doc = frappe.get_cached_doc("Trader Trading Entity", entity_name)
    out = {
        "trading_entity": doc.name,
        "trading_name": doc.trading_name,
        "name": doc.trading_name,
        "address": doc.letterhead_address or "",
    }
    if doc.logo:
        out["logo"] = _public_file_url(doc.logo)
    if doc.letterhead_header:
        out["letterhead_header"] = _public_file_url(doc.letterhead_header)
    if doc.letterhead_footer:
        out["letterhead_footer"] = _public_file_url(doc.letterhead_footer)
    return out


def list_active_options(company=None):
    """Lightweight options for customer forms."""
    company = resolve_active_company(company)
    if not is_trading_entity_enabled(company):
        return []
    rows = frappe.get_all(
        "Trader Trading Entity",
        filters={"company": company, "is_active": 1},
        fields=["name", "trading_name", "is_default", "code"],
        order_by="trading_name asc",
    )
    return rows


def get_default_entity_name(company=None):
    company = resolve_active_company(company)
    name = frappe.db.get_value(
        "Trader Trading Entity",
        {"company": company, "is_active": 1, "is_default": 1},
        "name",
    )
    if name:
        return name
    return frappe.db.get_value(
        "Trader Trading Entity",
        {"company": company, "is_active": 1},
        "name",
        order_by="trading_name asc",
    )


def validate_customer_trading_entity(entity_name, company=None):
    """Validate / require Trading Entity on customer create/update."""
    company = resolve_active_company(company)
    if not is_trading_entity_enabled(company):
        return

    entity_name = (entity_name or "").strip()
    if not entity_name:
        if assignment_required(company):
            frappe.throw(
                _(
                    "Trading Entity is required. Create one under Settings → Trading Entities "
                    "or assign an existing entity."
                )
            )
        return

    if not frappe.db.exists("Trader Trading Entity", entity_name):
        frappe.throw(_("Trading Entity {0} not found.").format(entity_name))

    doc = frappe.get_cached_doc("Trader Trading Entity", entity_name)
    if doc.company != company:
        frappe.throw(_("Trading Entity does not belong to company {0}.").format(company))
    if not cint(doc.is_active):
        frappe.throw(_("Trading Entity {0} is inactive.").format(doc.trading_name))


@frappe.whitelist()
def get_trading_entities(company=None, include_inactive=0):
    """List Trading Entities for the active company."""
    _require_admin()
    company = resolve_active_company(company)
    filters = {"company": company}
    if not cint(include_inactive):
        filters["is_active"] = 1
    rows = frappe.get_all(
        "Trader Trading Entity",
        filters=filters,
        fields=[
            "name",
            "trading_name",
            "company",
            "code",
            "letterhead_address",
            "is_active",
            "is_default",
            "logo",
            "letterhead_header",
            "letterhead_footer",
        ],
        order_by="trading_name asc",
    )
    out = []
    for row in rows:
        usage = 0
        if frappe.db.has_column("Customer", "trader_trading_entity"):
            usage = cint(
                frappe.db.count("Customer", {"trader_trading_entity": row.name})
            )
        row["customer_count"] = usage
        out.append(row)
    return out


@frappe.whitelist()
def get_trading_entity(name):
    """Single entity detail."""
    _require_admin()
    doc = frappe.get_doc("Trader Trading Entity", name)
    resolve_active_company(doc.company)
    return _serialize(doc)


@frappe.whitelist()
def create_trading_entity(data=None):
    """Create a Trading Entity."""
    _require_admin()
    data = _parse(data)
    company = resolve_active_company(data.get("company"))

    doc = frappe.new_doc("Trader Trading Entity")
    doc.company = company
    doc.trading_name = (data.get("trading_name") or "").strip()
    doc.letterhead_address = (data.get("letterhead_address") or "").strip()
    doc.code = (data.get("code") or "").strip() or None
    doc.is_active = 1 if data.get("is_active", 1) else 0
    doc.is_default = 1 if data.get("is_default") else 0
    doc.logo = data.get("logo") or ""
    doc.letterhead_header = data.get("letterhead_header") or ""
    doc.letterhead_footer = data.get("letterhead_footer") or ""
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "name": doc.name, "entity": _serialize(doc)}


@frappe.whitelist()
def update_trading_entity(data=None):
    """Update Trading Entity fields."""
    _require_admin()
    data = _parse(data)
    name = data.get("name")
    if not name:
        frappe.throw(_("Trading Entity name is required."))

    doc = frappe.get_doc("Trader Trading Entity", name)
    resolve_active_company(doc.company)

    if "trading_name" in data:
        doc.trading_name = (data.get("trading_name") or "").strip()
    if "letterhead_address" in data:
        doc.letterhead_address = (data.get("letterhead_address") or "").strip()
    if "code" in data:
        doc.code = (data.get("code") or "").strip() or None
    if "is_active" in data:
        doc.is_active = cint(data.get("is_active"))
    if "is_default" in data:
        doc.is_default = cint(data.get("is_default"))
    if "logo" in data:
        doc.logo = data.get("logo") or ""
    if "letterhead_header" in data:
        doc.letterhead_header = data.get("letterhead_header") or ""
    if "letterhead_footer" in data:
        doc.letterhead_footer = data.get("letterhead_footer") or ""

    if cint(doc.is_active) == 0 and cint(doc.is_default):
        doc.is_default = 0

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "entity": _serialize(doc)}


@frappe.whitelist()
def seed_default_trading_entity(company=None):
    """Seed one default entity from Company + tenant branding if none exist."""
    _require_admin()
    company = resolve_active_company(company)
    existing = frappe.db.exists(
        "Trader Trading Entity", {"company": company}
    )
    if existing:
        return {"ok": True, "name": existing, "seeded": False}

    company_doc = frappe.get_doc("Company", company)
    address = ""
    # Prefer company address via Dynamic Link
    addr_name = frappe.db.get_value(
        "Dynamic Link",
        {
            "link_doctype": "Company",
            "link_name": company,
            "parenttype": "Address",
        },
        "parent",
    )
    if addr_name:
        addr = frappe.get_doc("Address", addr_name)
        parts = [
            addr.address_line1,
            addr.address_line2,
            addr.city,
            addr.state,
            addr.pincode,
            addr.country,
        ]
        address = ", ".join([p for p in parts if p])
    if not address:
        address = company_doc.name

    logo = ""
    header = ""
    footer = ""
    tenant = getattr(company_doc, "trader_tenant", None)
    if tenant and frappe.db.exists("Trader Tenant", tenant):
        logo = frappe.db.get_value("Trader Tenant", tenant, "logo") or ""
        branding_raw = frappe.db.get_value("Trader Tenant", tenant, "branding") or {}
        if isinstance(branding_raw, str):
            try:
                branding_raw = json.loads(branding_raw) if branding_raw else {}
            except Exception:
                branding_raw = {}
        if isinstance(branding_raw, dict):
            header = branding_raw.get("letterhead_header") or branding_raw.get("header_image") or ""
            footer = branding_raw.get("letterhead_footer") or branding_raw.get("footer_image") or ""

    doc = frappe.new_doc("Trader Trading Entity")
    doc.company = company
    doc.trading_name = company_doc.name
    doc.letterhead_address = address
    doc.is_active = 1
    doc.is_default = 1
    doc.logo = logo
    doc.letterhead_header = header
    doc.letterhead_footer = footer
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "name": doc.name, "seeded": True, "entity": _serialize(doc)}


from trader_app.api._tenant_guard import apply_module_guards

apply_module_guards(globals(), "trading_entity")

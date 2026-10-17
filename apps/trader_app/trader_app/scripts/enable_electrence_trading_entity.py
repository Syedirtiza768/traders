# -*- coding: utf-8 -*-
"""Enable Trading Entity module for Electrence and seed a default entity.

Usage:
  bench --site <site> execute trader_app.scripts.enable_electrence_trading_entity.run
"""

from __future__ import unicode_literals

import json

import frappe
from frappe.utils import cint

COMPANY_CANDIDATES = ("Electrence", "Electrance")


def _find_electrence_company():
    for name in COMPANY_CANDIDATES:
        if frappe.db.exists("Company", name):
            return name
    tenant = frappe.db.get_value(
        "Trader Tenant",
        {"tenant_name": ["like", "%Electrenc%"]},
        ["name", "company"],
        as_dict=True,
    )
    if tenant and tenant.company:
        return tenant.company
    return None


def _enable_tenant_module(company):
    tenant = frappe.db.get_value("Company", company, "trader_tenant")
    if not tenant or not frappe.db.exists("Trader Tenant", tenant):
        return None

    doc = frappe.get_doc("Trader Tenant", tenant)
    found = False
    for row in doc.enabled_modules or []:
        if row.module_key == "trading_entity":
            row.enabled = 1
            found = True
            break
    if not found:
        doc.append("enabled_modules", {"module_key": "trading_entity", "enabled": 1})
    doc.save(ignore_permissions=True)

    from trader_app.api.tenant import sync_tenant_modules_to_company

    sync_tenant_modules_to_company(tenant)
    return tenant


def _seed_default(company):
    existing = frappe.db.get_value("Trader Trading Entity", {"company": company}, "name")
    if existing:
        return {"ok": True, "name": existing, "seeded": False}

    company_doc = frappe.get_doc("Company", company)
    address = ""
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
    return {"ok": True, "name": doc.name, "seeded": True}


def run():
    company = _find_electrence_company()
    if not company:
        frappe.throw("Electrence company not found.")

    if frappe.db.has_column("Company", "trader_trading_entity_enabled"):
        frappe.db.set_value("Company", company, "trader_trading_entity_enabled", 1, update_modified=False)

    tenant = _enable_tenant_module(company)
    result = _seed_default(company)

    frappe.db.commit()
    return {
        "ok": True,
        "company": company,
        "tenant": tenant,
        "seed": result,
        "enabled": cint(frappe.db.get_value("Company", company, "trader_trading_entity_enabled") or 0),
        "note": (
            "Customers are not auto-backfilled (Customer master is shared). "
            "Assign Trading Entity on create/edit, or set the default entity as needed."
        ),
    }

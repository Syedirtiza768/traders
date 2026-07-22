# -*- coding: utf-8 -*-
"""Full Electrance → Electrence tenant rename + branding + admin user.

Safe for multi-tenant sites: only touches the Electrance/Electrence company
and its tenant. CDC and others are never modified.

Usage::

  bench --site <site> execute trader_app.scripts.rename_electrence_tenant.run \\
    --kwargs "{'dry_run': 0}"
"""

from __future__ import unicode_literals

import json
import os

import frappe
from frappe.utils import cint, random_string
from frappe.utils.file_manager import save_file

OLD_COMPANY = "Electrance"
NEW_COMPANY = "Electrence"
OLD_USER = "bilal@electrance.com"
NEW_USER = "bilal@electrence.com"

ADMIN_ROLES = [
    "Trader Admin",
    "Sales User",
    "Purchase User",
    "Accounts User",
    "Stock User",
]

# Contact details from Electrence letter pad
COMPANY_PHONE = "+92 321 430 2636"
COMPANY_EMAIL = "sales@electrence.com"
COMPANY_WEBSITE = "www.electrence.com"
ADDRESS_LINE1 = "RB-5, F-1 Usman Block Garden Town"
ADDRESS_CITY = "Lahore"
ADDRESS_COUNTRY = "Pakistan"


def _asset_paths():
    """Letter-pad extract paths (host-mounted or /tmp)."""
    candidates = [
        "/tmp/letterpad-extract",
        "/home/frappe/frappe-bench/sites/letterpad-extract",
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".qa-evidence", "letterpad-extract"),
    ]
    for base in candidates:
        logo = os.path.join(base, "image1.png")
        header = os.path.join(base, "image2.png")
        footer = os.path.join(base, "image3.png")
        if os.path.isfile(logo) and os.path.isfile(header) and os.path.isfile(footer):
            return {"logo": logo, "header": header, "footer": footer, "base": base}
    return None


def _upload_public(filename, filepath, attached_to_doctype, attached_to_name):
    with open(filepath, "rb") as fh:
        content = fh.read()
    # Remove prior file with same name on this doc if present
    existing = frappe.get_all(
        "File",
        filters={
            "file_name": filename,
            "attached_to_doctype": attached_to_doctype,
            "attached_to_name": attached_to_name,
        },
        pluck="name",
    )
    for name in existing:
        frappe.delete_doc("File", name, ignore_permissions=True, force=True)

    f = save_file(
        filename,
        content,
        attached_to_doctype,
        attached_to_name,
        is_private=0,
    )
    return f.file_url


def _ensure_address_template():
    """ERPNext Address insert requires a default Address Template."""
    if frappe.db.exists("Address Template", {"is_default": 1}):
        return frappe.db.get_value("Address Template", {"is_default": 1}, "name")
    # Prefer Pakistan if present without default flag
    existing = frappe.db.get_value("Address Template", {"country": "Pakistan"}, "name")
    if existing:
        frappe.db.set_value("Address Template", existing, "is_default", 1)
        return existing
    tmpl = frappe.get_doc({
        "doctype": "Address Template",
        "country": "Pakistan",
        "is_default": 1,
        "template": "{{ address_line1 }}<br>{% if address_line2 %}{{ address_line2 }}<br>{% endif %}{{ city }}{% if state %}, {{ state }}{% endif %}<br>{{ country }}{% if pincode %} - {{ pincode }}{% endif %}",
    })
    tmpl.insert(ignore_permissions=True)
    return tmpl.name


def _ensure_company_address(company):
    _ensure_address_template()
    addr_name = frappe.db.get_value(
        "Dynamic Link",
        {"link_doctype": "Company", "link_name": company, "parenttype": "Address"},
        "parent",
    )
    if addr_name:
        addr = frappe.get_doc("Address", addr_name)
        addr.address_line1 = ADDRESS_LINE1
        addr.city = ADDRESS_CITY
        addr.country = ADDRESS_COUNTRY
        addr.save(ignore_permissions=True)
        return addr.name

    addr = frappe.get_doc({
        "doctype": "Address",
        "address_title": company,
        "address_type": "Billing",
        "address_line1": ADDRESS_LINE1,
        "city": ADDRESS_CITY,
        "country": ADDRESS_COUNTRY,
        "links": [{"link_doctype": "Company", "link_name": company}],
    })
    addr.insert(ignore_permissions=True)
    return addr.name


def _clone_admin_user(tenant, company):
    if not frappe.db.exists("User", OLD_USER):
        frappe.throw("Source admin user {0} not found".format(OLD_USER))

    old = frappe.get_doc("User", OLD_USER)
    roles = sorted({r.role for r in old.roles if r.role != "Trader Super Admin"} | set(ADMIN_ROLES))

    if frappe.db.exists("User", NEW_USER):
        user = frappe.get_doc("User", NEW_USER)
        created = False
    else:
        user = frappe.get_doc({
            "doctype": "User",
            "email": NEW_USER,
            "first_name": old.first_name or "Bilal",
            "last_name": old.last_name or "",
            "send_welcome_email": 0,
            "user_type": "System User",
            "new_password": random_string(16),
        })
        user.insert(ignore_permissions=True)
        created = True

    user.enabled = 1
    user.user_type = "System User"
    if hasattr(user, "trader_tenant"):
        user.trader_tenant = tenant

    existing = {r.role for r in user.roles}
    for role in roles:
        if role not in existing and frappe.db.exists("Role", role):
            user.append("roles", {"role": role})
    user.roles = [r for r in user.roles if r.role != "Trader Super Admin"]
    user.save(ignore_permissions=True)

    # Keep the same login password as the legacy account
    old_hash = frappe.db.sql(
        "select password from `__Auth` where doctype=%s and name=%s and fieldname=%s",
        ("User", OLD_USER, "password"),
    )
    if old_hash:
        exists_auth = frappe.db.sql(
            "select name from `__Auth` where doctype=%s and name=%s and fieldname=%s",
            ("User", NEW_USER, "password"),
        )
        if exists_auth:
            frappe.db.sql(
                "update `__Auth` set password=%s where doctype=%s and name=%s and fieldname=%s",
                (old_hash[0][0], "User", NEW_USER, "password"),
            )
        else:
            frappe.db.sql(
                "insert into `__Auth` (doctype, name, fieldname, password, encrypted) values (%s,%s,%s,%s,0)",
                ("User", NEW_USER, "password", old_hash[0][0]),
            )

    frappe.defaults.set_user_default("company", company, NEW_USER)

    if not frappe.db.exists(
        "User Permission",
        {"user": NEW_USER, "allow": "Company", "for_value": company},
    ):
        frappe.get_doc({
            "doctype": "User Permission",
            "user": NEW_USER,
            "allow": "Company",
            "for_value": company,
            "is_default": 1,
        }).insert(ignore_permissions=True)

    # Disable legacy login
    old.enabled = 0
    old.save(ignore_permissions=True)

    return {
        "created": created,
        "user": NEW_USER,
        "roles": sorted(r.role for r in user.roles),
        "disabled": OLD_USER,
    }


def _update_profile_template_keys(company):
    updated = []
    for dt in ("Trader Opportunity Profile", "Trader AR Profile", "Trader Customer Profile"):
        if not frappe.db.exists("DocType", dt):
            continue
        names = frappe.get_all(dt, filters={"company": company}, pluck="name")
        for name in names:
            if frappe.db.has_column(dt, "template_key"):
                cur = frappe.db.get_value(dt, name, "template_key")
                if cur in ("electrance", "electrence", None, ""):
                    frappe.db.set_value(dt, name, "template_key", "electrence")
                    updated.append({"doctype": dt, "name": name, "template_key": "electrence"})
    return updated


def _snapshot_isolation():
    rows = frappe.db.sql(
        """
        SELECT name,
               IFNULL(trader_components_enabled,0) AS components,
               IFNULL(trader_opportunity_enabled,0) AS opportunity,
               IFNULL(trader_ar_enabled,0) AS ar,
               IFNULL(trader_customer_pack_enabled,0) AS customer_pack
        FROM `tabCompany`
        WHERE name IN (%s, %s, 'CDC')
        ORDER BY name
        """,
        (OLD_COMPANY, NEW_COMPANY),
        as_dict=True,
    )
    return rows


def run(dry_run=0):
    dry_run = cint(dry_run)
    result = {"dry_run": bool(dry_run), "steps": []}

    company_exists_old = frappe.db.exists("Company", OLD_COMPANY)
    company_exists_new = frappe.db.exists("Company", NEW_COMPANY)
    if not company_exists_old and not company_exists_new:
        frappe.throw("Neither {0} nor {1} company exists".format(OLD_COMPANY, NEW_COMPANY))

    company = NEW_COMPANY if company_exists_new else OLD_COMPANY
    tenant = frappe.db.get_value("Company", company, "trader_tenant")
    if not tenant:
        frappe.throw("Company {0} has no trader_tenant".format(company))

    before = _snapshot_isolation()
    result["before"] = before

    if dry_run:
        result["steps"].append({"rename_company": "would rename {0} -> {1}".format(OLD_COMPANY, NEW_COMPANY)})
        result["assets"] = _asset_paths()
        return result

    # 1) Rename company if needed
    if company_exists_old and not company_exists_new:
        frappe.rename_doc("Company", OLD_COMPANY, NEW_COMPANY, force=True, merge=False)
        company = NEW_COMPANY
        result["steps"].append({"rename_company": "{0} -> {1}".format(OLD_COMPANY, NEW_COMPANY)})
    else:
        result["steps"].append({"rename_company": "already {0}".format(company)})

    # 2) Tenant display name + branding shell
    tenant_doc = frappe.get_doc("Trader Tenant", tenant)
    if getattr(tenant_doc, "tenant_name", None) and "electrance" in (tenant_doc.tenant_name or "").lower():
        tenant_doc.tenant_name = NEW_COMPANY
    elif not getattr(tenant_doc, "tenant_name", None):
        tenant_doc.tenant_name = NEW_COMPANY
    else:
        # Prefer canonical brand spelling when this is the Electrence tenant
        if company == NEW_COMPANY:
            tenant_doc.tenant_name = NEW_COMPANY

    # 3) Company contact fields
    company_doc = frappe.get_doc("Company", company)
    company_doc.phone_no = COMPANY_PHONE
    company_doc.email = COMPANY_EMAIL
    company_doc.website = COMPANY_WEBSITE
    company_doc.country = ADDRESS_COUNTRY
    company_doc.save(ignore_permissions=True)
    addr = _ensure_company_address(company)
    result["steps"].append({"company_contact": True, "address": addr})

    # 4) Upload letterhead assets (logo = E-mark, header = wordmark, footer = contact bar)
    assets = _asset_paths()
    if not assets:
        frappe.throw("Letter pad assets not found (expected image1/2/3.png under /tmp/letterpad-extract)")

    logo_url = _upload_public(
        "electrence-logo.png", assets["logo"], "Trader Tenant", tenant
    )
    header_url = _upload_public(
        "electrence-letterhead-header.png", assets["header"], "Trader Tenant", tenant
    )
    footer_url = _upload_public(
        "electrence-letterhead-footer.png", assets["footer"], "Trader Tenant", tenant
    )

    branding = {}
    raw = tenant_doc.branding
    if isinstance(raw, str) and raw.strip():
        try:
            branding = json.loads(raw)
        except Exception:
            branding = {}
    elif isinstance(raw, dict):
        branding = dict(raw)

    branding.update({
        "appName": NEW_COMPANY,
        "letterhead_header": header_url,
        "letterhead_footer": footer_url,
        "primaryColor": "#0f766e",
        "accentColor": "#134e4a",
    })
    tenant_doc.logo = logo_url
    tenant_doc.branding = branding
    tenant_doc.save(ignore_permissions=True)
    result["steps"].append({
        "branding": {
            "logo": logo_url,
            "letterhead_header": header_url,
            "letterhead_footer": footer_url,
        }
    })

    # 5) Admin user clone + disable old
    user_info = _clone_admin_user(tenant, company)
    result["steps"].append({"user": user_info})

    # 6) Profile template keys
    result["steps"].append({"profiles": _update_profile_template_keys(company)})

    frappe.clear_cache()
    frappe.db.commit()

    after = _snapshot_isolation()
    result["after"] = after
    result["company"] = company
    result["tenant"] = tenant
    result["ok"] = True

    # Isolation guard: CDC flags unchanged from before if present
    cdc_before = next((r for r in before if r["name"] == "CDC"), None)
    cdc_after = next((r for r in after if r["name"] == "CDC"), None)
    if cdc_before and cdc_after:
        keys = ("components", "opportunity", "ar", "customer_pack")
        if any(cdc_before[k] != cdc_after[k] for k in keys):
            frappe.throw("CDC flags changed during Electrence rename — aborting integrity")
        result["cdc_unchanged"] = True

    return result

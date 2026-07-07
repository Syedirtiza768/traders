# -*- coding: utf-8 -*-
"""Trader App — Super Admin platform APIs for tenant lifecycle management."""

from __future__ import unicode_literals

import json
import re

import frappe
from frappe import _
from frappe.utils import cint, getdate, now_datetime

from trader_app.api.tenant import (
    DEFAULT_MODULE_ROWS,
    _require_super_admin,
    _tenant_payload,
    count_tenant_users,
    get_enabled_module_keys,
    is_multitenant_enabled,
    log_tenant_action,
    sync_tenant_modules_to_company,
)


def _parse(data):
    if isinstance(data, str):
        try:
            return json.loads(data)
        except Exception:
            return {}
    return data or {}


def _ensure_multitenant():
    if not is_multitenant_enabled():
        frappe.throw(
            _("Multi-tenant mode is not enabled. Set trader_multitenant_enabled=1 in site_config.json."),
            frappe.PermissionError,
        )


def _slug_abbr(name):
    cleaned = re.sub(r"[^A-Za-z0-9]", "", name or "TEN")[:5].upper()
    return cleaned or "TEN"


@frappe.whitelist()
def get_tenant_dashboard():
    """Platform KPIs for the Super Admin dashboard."""
    _require_super_admin()
    _ensure_multitenant()

    statuses = frappe.get_all("Trader Tenant", fields=["status"], pluck="status")
    total_users = frappe.db.count(
        "User",
        {"trader_tenant": ["is", "set"], "enabled": 1, "name": ["not in", ["Guest", "Administrator"]]},
    )

    return {
        "total_tenants": len(statuses),
        "active_tenants": sum(1 for status in statuses if status == "Active"),
        "suspended_tenants": sum(1 for status in statuses if status == "Suspended"),
        "trial_tenants": frappe.db.count("Trader Tenant", {"billing_status": "Trial"}),
        "total_business_users": total_users,
    }


@frappe.whitelist()
def list_tenants(search=None, status=None, page=1, page_size=20):
    _require_super_admin()
    _ensure_multitenant()

    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    filters = {}
    if status:
        filters["status"] = status

    or_filters = []
    if search:
        needle = "%{}%".format((search or "").strip())
        or_filters = [
            ["tenant_name", "like", needle],
            ["name", "like", needle],
            ["contact_email", "like", needle],
        ]

    tenants = frappe.get_all(
        "Trader Tenant",
        filters=filters,
        or_filters=or_filters or None,
        fields=[
            "name",
            "tenant_name",
            "status",
            "company",
            "subscription_plan",
            "billing_status",
            "max_users",
            "contact_email",
            "modified",
            "provisioned_on",
        ],
        order_by="modified desc",
        limit_page_length=page_size,
        limit_start=(page - 1) * page_size,
    )

    for row in tenants:
        row["user_count"] = count_tenant_users(row.name)

    total = frappe.db.count("Trader Tenant", filters=filters)

    return {
        "data": tenants,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@frappe.whitelist()
def get_tenant_detail(tenant):
    _require_super_admin()
    _ensure_multitenant()

    if not frappe.db.exists("Trader Tenant", tenant):
        frappe.throw(_("Tenant {0} does not exist.").format(tenant))

    payload = _tenant_payload(tenant)
    payload["user_count"] = count_tenant_users(tenant)
    payload["enabled_modules"] = get_enabled_module_keys(tenant)
    return payload


@frappe.whitelist()
def create_tenant(data=None):
    """Provision a new business tenant with company and optional admin user."""
    _require_super_admin()
    _ensure_multitenant()
    data = _parse(data)

    tenant_name = (data.get("tenant_name") or "").strip()
    if not tenant_name:
        frappe.throw(_("Business name is required."))

    if frappe.db.exists("Trader Tenant", {"tenant_name": tenant_name}):
        frappe.throw(_("A business named {0} already exists.").format(tenant_name))

    company_name = (data.get("company_name") or tenant_name).strip()
    abbr = (data.get("abbr") or _slug_abbr(company_name)).strip()
    country = (data.get("country") or "Pakistan").strip()
    currency = (data.get("currency") or "PKR").strip()

    if frappe.db.exists("Company", company_name):
        frappe.throw(_("Company {0} already exists.").format(company_name))

    company = None
    tenant_doc = None

    try:
        company = frappe.get_doc(
            {
                "doctype": "Company",
                "company_name": company_name,
                "abbr": abbr,
                "country": country,
                "default_currency": currency,
                "chart_of_accounts": data.get("chart_of_accounts") or "Standard",
                "enable_perpetual_inventory": 1,
            }
        )
        company.insert(ignore_permissions=True)

        module_rows = []
        requested_modules = data.get("enabled_modules")
        if isinstance(requested_modules, list) and requested_modules:
            enabled_set = set(requested_modules)
            for row in DEFAULT_MODULE_ROWS:
                module_rows.append(
                    {"module_key": row["module_key"], "enabled": 1 if row["module_key"] in enabled_set else 0}
                )
        else:
            module_rows = [dict(row) for row in DEFAULT_MODULE_ROWS]

        tenant_doc = frappe.get_doc(
            {
                "doctype": "Trader Tenant",
                "tenant_name": tenant_name,
                "status": data.get("status") or "Active",
                "company": company.name,
                "subscription_plan": data.get("subscription_plan") or "Starter",
                "billing_status": data.get("billing_status") or "Trial",
                "trial_ends_on": data.get("trial_ends_on"),
                "max_users": cint(data.get("max_users") or 10),
                "contact_email": data.get("contact_email"),
                "contact_phone": data.get("contact_phone"),
                "address": data.get("address"),
                "timezone": data.get("timezone") or "Asia/Karachi",
                "branding": data.get("branding") or {},
                "workflow_prefs": data.get("workflow_prefs") or {},
                "created_by_admin": frappe.session.user,
                "provisioned_on": now_datetime(),
                "enabled_modules": module_rows,
                "notes": data.get("notes"),
            }
        )
        tenant_doc.insert(ignore_permissions=True)

        frappe.db.set_value("Company", company.name, "trader_tenant", tenant_doc.name, update_modified=False)
        sync_tenant_modules_to_company(tenant_doc.name)

        _ensure_fiscal_year(company.name, data.get("fiscal_year_start"), data.get("fiscal_year_end"))
        _ensure_default_warehouse(company.name)

        admin_user = None
        admin_email = (data.get("admin_email") or "").strip()
        if admin_email:
            admin_first_name = (data.get("admin_first_name") or "").strip()
            if not admin_first_name:
                frappe.throw(_("Admin first name is required when admin email is provided."))
            admin_user = _create_tenant_admin(
                tenant_doc.name,
                admin_email,
                admin_first_name,
                data.get("admin_last_name") or "",
                data.get("admin_password"),
            )
            # Pin the admin's active company to their tenant's company so the app
            # is usable immediately (otherwise it falls back to the platform's
            # global default company, which the tenant user cannot access).
            frappe.defaults.set_user_default("Company", company.name, admin_user)

        # Audit log is handled by TraderTenant.after_insert() — no duplicate here.
        frappe.db.commit()

        result = {
            "ok": True,
            "tenant": _tenant_payload(tenant_doc.name),
            "admin_user": admin_user,
        }
        if admin_email:
            result["admin_email"] = admin_email
            result["admin_password"] = data.get("admin_password")
        return result

    except Exception:
        frappe.db.rollback()
        raise


@frappe.whitelist()
def update_tenant(tenant, data=None):
    _require_super_admin()
    _ensure_multitenant()
    data = _parse(data)

    doc = frappe.get_doc("Trader Tenant", tenant)
    mutable_fields = [
        "tenant_name",
        "subscription_plan",
        "billing_status",
        "trial_ends_on",
        "max_users",
        "contact_email",
        "contact_phone",
        "address",
        "timezone",
        "logo",
        "branding",
        "workflow_prefs",
        "notes",
    ]
    for fieldname in mutable_fields:
        if fieldname in data:
            doc.set(fieldname, data[fieldname])

    doc.save(ignore_permissions=True)
    if doc.company and doc.max_users:
        frappe.db.set_value("Company", doc.company, "trader_user_limit", doc.max_users, update_modified=False)

    log_tenant_action(tenant, "updated", {"fields": list(data.keys())})
    frappe.db.commit()
    return {"ok": True, "tenant": _tenant_payload(tenant)}


@frappe.whitelist()
def set_tenant_status(tenant, status):
    _require_super_admin()
    _ensure_multitenant()

    allowed = {"Active", "Suspended", "Deactivated", "Pending"}
    if status not in allowed:
        frappe.throw(_("Invalid status {0}.").format(status))

    frappe.db.set_value("Trader Tenant", tenant, "status", status, update_modified=True)

    if status in ("Suspended", "Deactivated"):
        users = frappe.get_all("User", filters={"trader_tenant": tenant, "enabled": 1}, pluck="name")
        for user in users:
            if user in ("Administrator", "Guest"):
                continue
            frappe.db.set_value("User", user, "enabled", 0, update_modified=False)

    action = "activated" if status == "Active" else status.lower()
    log_tenant_action(tenant, action, {"status": status})
    frappe.db.commit()
    return {"ok": True, "tenant": _tenant_payload(tenant)}


@frappe.whitelist()
def set_tenant_modules(tenant, modules=None):
    _require_super_admin()
    _ensure_multitenant()
    modules = _parse(modules) if isinstance(modules, str) else (modules or [])

    required = {"dashboard", "settings"}
    enabled_set = set(modules) | required

    doc = frappe.get_doc("Trader Tenant", tenant)
    doc.enabled_modules = []
    for row in DEFAULT_MODULE_ROWS:
        doc.append(
            "enabled_modules",
            {"module_key": row["module_key"], "enabled": 1 if row["module_key"] in enabled_set else 0},
        )
    doc.save(ignore_permissions=True)
    sync_tenant_modules_to_company(tenant)
    log_tenant_action(tenant, "module_changed", {"modules": sorted(enabled_set)})
    frappe.db.commit()
    return {"ok": True, "enabled_modules": get_enabled_module_keys(tenant)}


@frappe.whitelist()
def set_tenant_branding(tenant, branding=None, logo=None):
    """Update tenant branding JSON and optional logo on Trader Tenant."""
    _require_super_admin()
    _ensure_multitenant()
    branding = _parse(branding) if isinstance(branding, str) else (branding or {})

    if not frappe.db.exists("Trader Tenant", tenant):
        frappe.throw(_("Tenant {0} does not exist.").format(tenant))

    doc = frappe.get_doc("Trader Tenant", tenant)
    doc.branding = branding
    if logo is not None:
        doc.logo = logo or None
    doc.save(ignore_permissions=True)
    log_tenant_action(tenant, "config_changed", {"branding": branding, "logo": logo})
    frappe.db.commit()
    return {"ok": True, "tenant": _tenant_payload(tenant)}


def _ensure_fiscal_year(company, year_start=None, year_end=None):
    year = getdate().year
    fy_name = str(year)
    start = year_start or "{0}-07-01".format(year)
    end = year_end or "{0}-06-30".format(year + 1)

    if frappe.db.exists("Fiscal Year", fy_name):
        fy = frappe.get_doc("Fiscal Year", fy_name)
        linked = [c.company for c in fy.companies]
        if company not in linked:
            fy.append("companies", {"company": company})
            fy.save(ignore_permissions=True)
    else:
        fy = frappe.get_doc(
            {
                "doctype": "Fiscal Year",
                "year": fy_name,
                "year_start_date": start,
                "year_end_date": end,
                "companies": [{"company": company}],
            }
        )
        fy.insert(ignore_permissions=True)

    current_fy = frappe.db.get_value("Global Defaults", "Global Defaults", "current_fiscal_year")
    if not current_fy:
        frappe.db.set_value("Global Defaults", "Global Defaults", "current_fiscal_year", fy_name, update_modified=False)


def _ensure_default_warehouse(company):
    """Create a default warehouse for the company if none exists."""
    existing = frappe.db.exists("Warehouse", {"company": company, "is_group": 0})
    if existing:
        return

    company_abbr = frappe.db.get_value("Company", company, "abbr") or ""
    wh_name = "Stores - {0}".format(company_abbr)
    if frappe.db.exists("Warehouse", wh_name):
        return

    wh = frappe.get_doc(
        {
            "doctype": "Warehouse",
            "warehouse_name": "Stores",
            "company": company,
        }
    )
    wh.insert(ignore_permissions=True)


def _create_tenant_admin(tenant, email, first_name, last_name, password=None):
    if frappe.db.exists("User", email):
        frappe.throw(_("Admin user {0} already exists.").format(email))

    if not password:
        frappe.throw(_("Admin password is required."))

    user = frappe.new_doc("User")
    user.email = email
    user.first_name = first_name
    user.last_name = last_name
    user.user_type = "System User"
    user.trader_tenant = tenant
    user.send_welcome_email = 0
    user.new_password = password
    user.append("roles", {"role": "Trader Admin"})
    user.insert(ignore_permissions=True)
    log_tenant_action(tenant, "user_added", {"email": email, "role": "Trader Admin"})
    return user.name


@frappe.whitelist()
def get_tenant_audit_log(tenant, page=1, page_size=20):
    """Platform audit log for a specific tenant."""
    _require_super_admin()
    _ensure_multitenant()

    if not frappe.db.exists("Trader Tenant", tenant):
        frappe.throw(_("Tenant {0} does not exist.").format(tenant))

    from trader_app.api.tenant import _audit_log_rows

    return _audit_log_rows(tenant, page=page, page_size=page_size)

# -*- coding: utf-8 -*-
"""Trader App — Tenant context resolution and multi-tenant guards."""

from __future__ import unicode_literals

import json

import frappe
from frappe import _
from frappe.utils import cint, now_datetime

SUPER_ADMIN_ROLES = frozenset({"Trader Super Admin", "System Manager"})
ACTIVE_TENANT_STATUSES = frozenset({"Active"})
BLOCKED_TENANT_STATUSES = frozenset({"Suspended", "Deactivated", "Pending"})

STANDARD_MODULE_KEYS = (
    "dashboard",
    "sales",
    "purchases",
    "inventory",
    "finance",
    "reports",
    "customers",
    "suppliers",
    "operations",
    "components",
    "pos",
    "settings",
)

DEFAULT_MODULE_ROWS = [
    {"module_key": key, "enabled": 1 if key != "components" else 0}
    for key in STANDARD_MODULE_KEYS
]

MODULE_COMPANY_FIELD_MAP = {
    "components": "trader_components_enabled",
}


def is_multitenant_enabled():
    """Feature flag — set trader_multitenant_enabled=1 in site_config.json."""
    return cint(frappe.conf.get("trader_multitenant_enabled", 0)) == 1


def is_super_admin(user=None):
    user = user or frappe.session.user
    if user == "Administrator":
        return True
    return bool(SUPER_ADMIN_ROLES.intersection(frappe.get_roles(user)))


def _require_super_admin():
    if not is_super_admin():
        frappe.throw(
            _("Only Trader Super Admin or System Manager can access platform administration."),
            frappe.PermissionError,
        )


def get_user_tenant_name(user=None):
    """Tenant assigned to a business user; None for platform admins without assignment."""
    user = user or frappe.session.user
    if user in ("Administrator", "Guest"):
        return None
    if is_super_admin(user) and not frappe.db.get_value("User", user, "trader_tenant"):
        return None
    return frappe.db.get_value("User", user, "trader_tenant")


def user_can_access_tenant(tenant, user=None):
    if not tenant:
        return False
    user = user or frappe.session.user
    if user == "Administrator" or is_super_admin(user):
        return True
    return get_user_tenant_name(user) == tenant


def get_tenant_companies(tenant):
    """Companies linked to a tenant (primary company today; extensible later)."""
    if not tenant:
        return []
    company = frappe.db.get_value("Trader Tenant", tenant, "company")
    if not company:
        return []
    return [company]


def assert_tenant_active(tenant):
    if not tenant:
        frappe.throw(_("No tenant assigned to your account."))
    status = frappe.db.get_value("Trader Tenant", tenant, "status")
    if status in BLOCKED_TENANT_STATUSES:
        frappe.throw(
            _("This business account is {0}. Contact your administrator.").format(status.lower()),
            frappe.PermissionError,
        )


def resolve_active_tenant(tenant=None, user=None):
    """Resolve tenant for the current request.

    Business users always use User.trader_tenant (request param ignored).
    Super Admins may pass tenant explicitly for platform operations.
    """
    if not is_multitenant_enabled():
        return None

    user = user or frappe.session.user

    if is_super_admin(user):
        if tenant:
            if not frappe.db.exists("Trader Tenant", tenant):
                frappe.throw(_("Tenant {0} does not exist.").format(tenant))
            return tenant
        return get_user_tenant_name(user)

    assigned = get_user_tenant_name(user)
    if not assigned:
        frappe.throw(
            _("Your account is not assigned to a business. Contact the platform administrator."),
            frappe.PermissionError,
        )

    if tenant and tenant != assigned:
        frappe.throw(_("You cannot access another business account."), frappe.PermissionError)

    assert_tenant_active(assigned)
    return assigned


def assert_company_belongs_to_tenant(company, tenant, user=None):
    if not is_multitenant_enabled() or not tenant:
        return
    user = user or frappe.session.user
    if is_super_admin(user) and not get_user_tenant_name(user):
        return

    company_tenant = frappe.db.get_value("Company", company, "trader_tenant")
    if company_tenant and company_tenant != tenant:
        frappe.throw(
            _("Company {0} does not belong to your business account.").format(company),
            frappe.PermissionError,
        )


def get_enabled_module_keys(tenant):
    if not tenant:
        return list(STANDARD_MODULE_KEYS)

    rows = frappe.get_all(
        "Trader Tenant Module",
        filters={"parent": tenant, "parenttype": "Trader Tenant", "enabled": 1},
        pluck="module_key",
    )
    if not rows:
        return [row["module_key"] for row in DEFAULT_MODULE_ROWS if row.get("enabled")]
    return rows


def assert_tenant_module_enabled(module_key, tenant=None, user=None):
    if not is_multitenant_enabled():
        return

    tenant = tenant or resolve_active_tenant(user=user)
    if not tenant:
        return

    enabled = get_enabled_module_keys(tenant)
    if module_key not in enabled:
        frappe.throw(
            _("The {0} module is not enabled for your business.").format(module_key),
            frappe.PermissionError,
        )


def sync_tenant_modules_to_company(tenant):
    """Push module flags from tenant config onto the linked Company."""
    company = frappe.db.get_value("Trader Tenant", tenant, "company")
    if not company:
        return

    enabled = set(get_enabled_module_keys(tenant))
    updates = {}
    for module_key, fieldname in MODULE_COMPANY_FIELD_MAP.items():
        updates[fieldname] = 1 if module_key in enabled else 0

    if updates:
        for fieldname, value in updates.items():
            frappe.db.set_value("Company", company, fieldname, value, update_modified=False)


def _tenant_payload(tenant_name):
    if not tenant_name or not frappe.db.exists("Trader Tenant", tenant_name):
        return None

    doc = frappe.get_cached_doc("Trader Tenant", tenant_name)
    branding = doc.branding
    if isinstance(branding, str):
        try:
            branding = json.loads(branding)
        except Exception:
            branding = {}

    return {
        "tenant_id": doc.name,
        "tenant_name": doc.tenant_name,
        "status": doc.status,
        "company": doc.company,
        "subscription_plan": doc.subscription_plan,
        "billing_status": doc.billing_status,
        "max_users": cint(doc.max_users),
        "timezone": doc.timezone,
        "logo": doc.logo,
        "branding": branding or {},
        "enabled_modules": get_enabled_module_keys(doc.name),
    }


def log_tenant_action(tenant, action, details=None):
    if not tenant:
        return

    actor = frappe.session.user if frappe.session else "Administrator"
    roles = frappe.get_roles(actor) if actor and actor != "Guest" else []
    actor_role = roles[0] if roles else ""

    doc = frappe.get_doc(
        {
            "doctype": "Trader Tenant Audit Log",
            "tenant": tenant,
            "action": action,
            "actor": actor,
            "actor_role": actor_role,
            "ip_address": getattr(frappe.local, "request_ip", None),
            "details": details or {},
            "timestamp": now_datetime(),
        }
    )
    doc.insert(ignore_permissions=True)


def count_tenant_users(tenant):
    if not tenant:
        return 0
    return frappe.db.count(
        "User",
        {
            "trader_tenant": tenant,
            "enabled": 1,
            "name": ["not in", ["Guest", "Administrator"]],
        },
    )


def assert_user_limit(tenant):
    if not tenant:
        return
    max_users = cint(frappe.db.get_value("Trader Tenant", tenant, "max_users") or 0)
    if not max_users:
        return
    current = count_tenant_users(tenant)
    if current >= max_users:
        frappe.throw(
            _("User limit reached ({0}/{1}). Upgrade your plan or contact support.").format(
                current, max_users
            )
        )


# ─── Whitelisted API ─────────────────────────────────────────────────────────


@frappe.whitelist()
def get_multitenant_status():
    """Return whether multi-tenant mode is active and the caller's tenant context."""
    enabled = is_multitenant_enabled()
    payload = {
        "enabled": enabled,
        "is_super_admin": is_super_admin(),
    }
    if not enabled:
        return payload

    tenant = get_user_tenant_name()
    if tenant:
        payload["tenant"] = _tenant_payload(tenant)
    return payload


@frappe.whitelist()
def get_tenant_config():
    """Full tenant configuration for SPA boot (business users)."""
    if not is_multitenant_enabled():
        return {"enabled": False}

    tenant = resolve_active_tenant()
    config = _tenant_payload(tenant)
    config["enabled"] = True
    config["user_count"] = count_tenant_users(tenant)
    return config


def _audit_log_rows(tenant, page=1, page_size=20):
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    total = frappe.db.count("Trader Tenant Audit Log", {"tenant": tenant})
    rows = frappe.get_all(
        "Trader Tenant Audit Log",
        filters={"tenant": tenant},
        fields=["name", "action", "actor", "actor_role", "timestamp", "details", "ip_address"],
        order_by="timestamp desc",
        limit_page_length=page_size,
        limit_start=offset,
    )
    return {
        "data": rows,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@frappe.whitelist()
def get_business_tenant_audit_log(page=1, page_size=20):
    """Audit log for the current business (Business Admin)."""
    from trader_app.api.admin import _require_admin

    _require_admin()
    if not is_multitenant_enabled():
        return {"data": [], "total": 0, "page": 1, "page_size": page_size}

    tenant = resolve_active_tenant()
    return _audit_log_rows(tenant, page=page, page_size=page_size)


def boot_session(bootinfo):
    """Inject multi-tenant flags into Frappe desk/SPA boot payload."""
    bootinfo.trader_multitenant_enabled = is_multitenant_enabled()
    bootinfo.trader_is_super_admin = is_super_admin()

    if not is_multitenant_enabled():
        return

    tenant = get_user_tenant_name()
    if not tenant:
        return

    status = frappe.db.get_value("Trader Tenant", tenant, "status")
    bootinfo.trader_tenant = tenant
    bootinfo.trader_tenant_status = status
    if status in BLOCKED_TENANT_STATUSES:
        bootinfo.trader_tenant_blocked = True

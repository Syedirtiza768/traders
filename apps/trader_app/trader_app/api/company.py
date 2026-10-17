# -*- coding: utf-8 -*-
"""Trader App — Company context API for multi-company SPA support."""

from __future__ import unicode_literals

import frappe
from frappe import _
from trader_app.api.tenant import (
    assert_company_belongs_to_tenant,
    assert_tenant_active,
    get_tenant_companies,
    get_user_tenant_name,
    is_multitenant_enabled,
    is_super_admin,
    resolve_active_tenant,
)


def get_active_company_name(user=None):
    """User's active company. Prefers the Frappe user default / global default, but
    never returns a company the user cannot access — a tenant-scoped user whose only
    default is the platform's global company would otherwise be locked out of every
    page that calls resolve_active_company."""
    user = user or frappe.session.user
    resolved = frappe.defaults.get_user_default("Company", user) or frappe.db.get_single_value(
        "Global Defaults", "default_company"
    )

    if user == "Administrator":
        if resolved:
            return resolved
        companies = frappe.get_all("Company", limit=1, pluck="name")
        return companies[0] if companies else None

    permitted = get_permitted_company_names(user)
    if resolved and resolved in permitted:
        return resolved
    return permitted[0] if permitted else resolved


def get_permitted_company_names(user=None):
    """Company names the user may access (tenant-scoped when multi-tenant is enabled).

    Any user with ``trader_tenant`` set is confined to that tenant's companies —
    including System Manager / Trader Admin. Only Administrator and tenant-less
    platform super-admins may see every company. ERPNext User Permissions are
    applied as an additional restriction so custom APIs cannot bypass a user's
    Company assignment by switching the active-company parameter.
    """
    user = user or frappe.session.user
    if user == "Administrator":
        return frappe.get_all("Company", pluck="name", order_by="name asc")

    companies = frappe.get_all("Company", pluck="name", order_by="name asc")

    # ``frappe.get_all`` intentionally bypasses DocType permissions. Apply the
    # authoritative User Permission scope explicitly before returning companies
    # to the SPA or validating a client-supplied company. A missing Company
    # permission means ERPNext leaves the user unrestricted; an explicitly
    # empty/malformed Company permission grants no companies (fail closed).
    permission_companies = _user_permission_companies(user)
    if permission_companies is not None:
        companies = [name for name in companies if name in permission_companies]

    if is_multitenant_enabled():
        tenant = get_user_tenant_name(user)
        if tenant:
            allowed = set(get_tenant_companies(tenant))
            return [name for name in companies if name in allowed]

    return companies


def _user_permission_companies(user):
    """Return explicitly permitted Company names, or ``None`` if unrestricted."""
    from frappe.core.doctype.user_permission.user_permission import get_user_permissions

    return _company_names_from_user_permissions(get_user_permissions(user))


def _company_names_from_user_permissions(permissions):
    permissions = permissions or {}
    if "Company" not in permissions:
        return None

    return {str(permission.get("doc")) for permission in (permissions.get("Company") or []) if permission.get("doc")}


def user_can_access_company(company, user=None):
    if not company:
        return False
    user = user or frappe.session.user
    if user == "Administrator":
        return True
    return company in get_permitted_company_names(user)


def resolve_active_company(company=None, user=None):
    """Resolve and validate company for API calls (prevents cross-company access)."""
    user = user or frappe.session.user
    company = company or get_active_company_name(user)
    if not company:
        frappe.throw(_("No active company. Select a company from the header menu."))
    if not frappe.db.exists("Company", company):
        frappe.throw(_("Company {0} does not exist.").format(company))
    if not user_can_access_company(company, user):
        frappe.throw(_("You do not have permission to access company {0}.").format(company))

    if is_multitenant_enabled() and user != "Administrator":
        # Tenant-assigned users (even System Manager) must stay inside their tenant.
        tenant = get_user_tenant_name(user)
        if tenant:
            assert_tenant_active(tenant)
            assert_company_belongs_to_tenant(company, tenant, user=user)
        elif not is_super_admin(user):
            resolve_active_tenant(user=user)  # raises if tenant required

    return company


def assert_document_company_access(doc_company, user=None):
    """Ensure a loaded document belongs to the user's active company scope."""
    user = user or frappe.session.user
    roles = frappe.get_roles(user)

    if user == "Administrator":
        return

    if not user_can_access_company(doc_company, user):
        frappe.throw(_("You do not have permission to access company {0}.").format(doc_company))

    # System Manager may read any permitted company; Trader roles are pinned to active company.
    if "System Manager" in roles:
        return

    active = get_active_company_name(user)
    if active and doc_company != active:
        frappe.throw(_("This record belongs to {0}. Switch your active company to access it.").format(doc_company))


def _company_payload(company_name):
    if not company_name:
        return None
    doc = frappe.get_cached_doc("Company", company_name)
    multi = getattr(doc, "trader_multi_currency_enabled", None)
    components = getattr(doc, "trader_components_enabled", None)
    opportunity = getattr(doc, "trader_opportunity_enabled", None)
    ar = getattr(doc, "trader_ar_enabled", None)
    customer_pack = getattr(doc, "trader_customer_pack_enabled", None)
    trading_entity = getattr(doc, "trader_trading_entity_enabled", None)
    return {
        "company": doc.name,
        "abbr": doc.abbr,
        "default_currency": doc.default_currency,
        "country": doc.country,
        "multi_currency_enabled": bool(multi),
        "components_enabled": bool(components),
        "opportunity_enabled": bool(opportunity),
        "ar_enabled": bool(ar),
        "customer_pack_enabled": bool(customer_pack),
        "trading_entity_enabled": bool(trading_entity),
    }


@frappe.whitelist()
def get_companies():
    """Companies the current user may access (tenant-scoped when multi-tenant is enabled)."""
    permitted = get_permitted_company_names()
    if not permitted:
        return []

    return frappe.get_all(
        "Company",
        filters={"name": ["in", permitted]},
        fields=["name", "abbr", "default_currency", "country"],
        order_by="name asc",
    )


@frappe.whitelist()
def get_active_company():
    """Active company for this user session (Frappe user default)."""
    active = _company_payload(get_active_company_name())
    return active or {
        "company": None,
        "abbr": None,
        "default_currency": None,
        "country": None,
        "multi_currency_enabled": False,
        "components_enabled": False,
        "opportunity_enabled": False,
        "ar_enabled": False,
        "customer_pack_enabled": False,
        "trading_entity_enabled": False,
    }


@frappe.whitelist()
def set_active_company(company):
    """Set the user's default company for Trader UI and desk."""
    company = resolve_active_company(company)
    frappe.defaults.set_user_default("Company", company, frappe.session.user)
    frappe.db.commit()

    return {
        "ok": True,
        "active": _company_payload(company),
    }

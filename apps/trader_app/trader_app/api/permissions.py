# -*- coding: utf-8 -*-
"""Trader App — Permission Queries.

Company-scoped access for Trader roles, with owner restrictions for standard users.
"""

from __future__ import unicode_literals

import frappe

from trader_app.api.company import get_active_company_name, get_permitted_company_names
from trader_app.api.tenant import (
    get_user_tenant_name,
    is_multitenant_enabled,
    is_super_admin,
)


def _roles(user):
    return frappe.get_roles(user)


def _is_admin(user):
    return user == "Administrator" or "System Manager" in _roles(user)


def _merge_conditions(*parts):
    clauses = [p for p in parts if p]
    if not clauses:
        return ""
    if len(clauses) == 1:
        return clauses[0]
    return " AND ".join("({0})".format(p) for p in clauses)


def _company_clause(doctype, user):
    """Restrict list views to the user's active company (Trader SPA isolation)."""
    if _is_admin(user):
        return ""

    company = get_active_company_name(user)
    if not company:
        return "1=0"

    return "`tab{0}`.company = {1}".format(doctype, frappe.db.escape(company))


def _owner_clause(doctype, user):
    return "`tab{0}`.owner = {1}".format(doctype, frappe.db.escape(user))


def _role_owner_clause(doctype, user, manager_roles):
    roles = _roles(user)
    if _is_admin(user):
        return ""
    if any(role in roles for role in manager_roles):
        return ""
    return _owner_clause(doctype, user)


def sales_invoice_query(user):
    return _merge_conditions(
        _company_clause("Sales Invoice", user),
        _role_owner_clause("Sales Invoice", user, ("Trader Admin", "Trader Sales Manager")),
    )


def purchase_invoice_query(user):
    return _merge_conditions(
        _company_clause("Purchase Invoice", user),
        _role_owner_clause("Purchase Invoice", user, ("Trader Admin", "Trader Purchase Manager")),
    )


def sales_order_query(user):
    return _merge_conditions(
        _company_clause("Sales Order", user),
        _role_owner_clause("Sales Order", user, ("Trader Admin", "Trader Sales Manager")),
    )


def purchase_order_query(user):
    return _merge_conditions(
        _company_clause("Purchase Order", user),
        _role_owner_clause("Purchase Order", user, ("Trader Admin", "Trader Purchase Manager")),
    )


def payment_entry_query(user):
    return _merge_conditions(
        _company_clause("Payment Entry", user),
        _role_owner_clause("Payment Entry", user, ("Trader Admin", "Trader Finance Manager")),
    )


def delivery_note_query(user):
    return _merge_conditions(
        _company_clause("Delivery Note", user),
        _role_owner_clause("Delivery Note", user, ("Trader Admin", "Trader Sales Manager", "Trader Inventory Manager")),
    )


def quotation_query(user):
    return _merge_conditions(
        _company_clause("Quotation", user),
        _role_owner_clause("Quotation", user, ("Trader Admin", "Trader Sales Manager")),
    )


def _has_doc_permission(doc, user, manager_roles):
    roles = _roles(user)

    if user == "Administrator":
        return True

    if doc.company and doc.company not in get_permitted_company_names(user):
        return False

    if "System Manager" in roles:
        return True

    active = get_active_company_name(user)
    if active and getattr(doc, "company", None) and doc.company != active:
        return False

    if any(role in roles for role in manager_roles):
        return True

    if doc.owner == user:
        return True

    return False


def has_sales_invoice_permission(doc, ptype, user):
    return _has_doc_permission(doc, user, ("Trader Admin", "Trader Sales Manager"))


def has_purchase_invoice_permission(doc, ptype, user):
    return _has_doc_permission(doc, user, ("Trader Admin", "Trader Purchase Manager"))


def has_sales_order_permission(doc, ptype, user):
    return _has_doc_permission(doc, user, ("Trader Admin", "Trader Sales Manager"))


def has_purchase_order_permission(doc, ptype, user):
    return _has_doc_permission(doc, user, ("Trader Admin", "Trader Purchase Manager"))


def has_payment_entry_permission(doc, ptype, user):
    return _has_doc_permission(doc, user, ("Trader Admin", "Trader Finance Manager"))


def has_delivery_note_permission(doc, ptype, user):
    return _has_doc_permission(doc, user, ("Trader Admin", "Trader Sales Manager", "Trader Inventory Manager"))


def has_quotation_permission(doc, ptype, user):
    return _has_doc_permission(doc, user, ("Trader Admin", "Trader Sales Manager"))


# ────────────────────────────────────────────────────────────────
# Tenant scoping for SHARED master data (Customer / Supplier / Item)
#
# These doctypes have no `company` field and are global across a Frappe site,
# so without an explicit `trader_tenant` filter a tenant would see every other
# tenant's masters. Platform admins (Administrator / System Manager / Trader
# Super Admin) are intentionally unrestricted.
# ────────────────────────────────────────────────────────────────

_SCOPE_NONE = "__none__"  # user may see no shared masters at all


def _master_scope(user):
    """Resolve how master data should be scoped for a user:
      * None            → unrestricted (Administrator / tenant-less platform admin)
      * "__none__"      → see nothing (a business user with no tenant)
      * "TNT-xxxx"      → confined to that tenant (any tenant-assigned user, even
                          a System Manager — isolation must hold in both directions)
    """
    if user == "Administrator" or not is_multitenant_enabled():
        return None
    tenant = get_user_tenant_name(user)
    if tenant:
        return tenant
    if is_super_admin(user):
        return None
    return _SCOPE_NONE


def master_tenant_clause(doctype, user):
    """permission_query_conditions body for a tenant-scoped master doctype."""
    scope = _master_scope(user)
    if scope is None:
        return ""
    if scope == _SCOPE_NONE:
        return "1=0"
    return "`tab{0}`.trader_tenant = {1}".format(doctype, frappe.db.escape(scope))


def customer_query(user):
    return master_tenant_clause("Customer", user)


def supplier_query(user):
    return master_tenant_clause("Supplier", user)


def item_query(user):
    return master_tenant_clause("Item", user)


def tenant_sql_filter(alias, user=None):
    """(condition, params) injecting a tenant filter into a raw-SQL master query.

    Returns ("", {}) for platform admins so they are unrestricted. Non-admin
    users without a tenant get "1=0" (no cross-tenant leakage)."""
    user = user or frappe.session.user
    scope = _master_scope(user)
    if scope is None:
        return "", {}
    if scope == _SCOPE_NONE:
        return "1=0", {}
    return "{0}.trader_tenant = %(trader_scope_tenant)s".format(alias), {"trader_scope_tenant": scope}


def stamp_master_tenant(doc, method=None):
    """before_insert hook — stamp the creating user's tenant on a new master."""
    if getattr(doc, "trader_tenant", None):
        return
    if frappe.flags.in_install or frappe.flags.in_migrate or getattr(doc.flags, "in_import", False):
        return
    tenant = get_user_tenant_name(frappe.session.user)
    if tenant:
        doc.trader_tenant = tenant

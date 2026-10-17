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
    """Restrict transaction lists to the user's permitted company scope."""
    if user == "Administrator":
        return ""

    roles = _roles(user)
    if "System Manager" in roles:
        # System Manager bypasses owner restrictions, not explicit Company
        # permissions or an assigned tenant's company boundary.
        companies = get_permitted_company_names(user)
        if not companies:
            return "1=0"
        permitted = ", ".join(frappe.db.escape(company) for company in companies)
        return "`tab{0}`.company in ({1})".format(doctype, permitted)

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
        _role_owner_clause(
            "Sales Invoice", user, ("Trader Admin", "Trader Sales Manager", "Trader Finance Manager", "Trader Accountant")
        ),
    )


def purchase_invoice_query(user):
    return _merge_conditions(
        _company_clause("Purchase Invoice", user),
        _role_owner_clause(
            "Purchase Invoice", user, ("Trader Admin", "Trader Purchase Manager", "Trader Finance Manager", "Trader Accountant")
        ),
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
        _role_owner_clause(
            "Delivery Note",
            user,
            ("Trader Admin", "Trader Sales Manager", "Trader Inventory Manager", "Trader Finance Manager", "Trader Accountant"),
        ),
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
    return _has_doc_permission(
        doc, user, ("Trader Admin", "Trader Sales Manager", "Trader Finance Manager", "Trader Accountant")
    )


def has_purchase_invoice_permission(doc, ptype, user):
    return _has_doc_permission(
        doc, user, ("Trader Admin", "Trader Purchase Manager", "Trader Finance Manager", "Trader Accountant")
    )


def has_sales_order_permission(doc, ptype, user):
    return _has_doc_permission(doc, user, ("Trader Admin", "Trader Sales Manager"))


def has_purchase_order_permission(doc, ptype, user):
    return _has_doc_permission(doc, user, ("Trader Admin", "Trader Purchase Manager"))


def has_payment_entry_permission(doc, ptype, user):
    return _has_doc_permission(doc, user, ("Trader Admin", "Trader Finance Manager"))


def has_delivery_note_permission(doc, ptype, user):
    return _has_doc_permission(
        doc,
        user,
        ("Trader Admin", "Trader Sales Manager", "Trader Inventory Manager", "Trader Finance Manager", "Trader Accountant"),
    )


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


def master_document_permission(doc, ptype=None, user=None):
    """Deny direct document access when a shared master belongs to another tenant.

    Returning ``None`` for an in-scope record leaves the ordinary DocType role
    checks authoritative; this hook only adds a tenant-level denial.
    """
    if ptype == "create":
        # Tenant ownership is assigned by the before_insert hook.
        return None

    user = user or frappe.session.user
    scope = _master_scope(user)
    if scope is None:
        return None
    if scope == _SCOPE_NONE:
        return False
    if getattr(doc, "trader_tenant", None) != scope:
        return False
    return None


def company_document_permission(doc, ptype=None, user=None):
    """Require explicit company access even for direct Company document reads."""
    if not doc or not getattr(doc, "name", None):
        return None

    user = user or frappe.session.user
    if user == "Administrator":
        return None

    try:
        from trader_app.api.company import resolve_active_company

        resolve_active_company(doc.name, user=user)
    except Exception:
        # Direct document loads do not consistently apply Company User
        # Permissions, so deny access when the same server-side resolver used
        # by the SPA cannot authorize this company.
        return False

    # Let normal DocType role permissions decide after company scope passes.
    return None


def customer_company_clause(user=None, alias="c"):
    """SQL that hides customers the user cannot open.

    A customer carries a ``Customer Credit Limit`` row per company it transacts with. Frappe's
    User Permission check on a Company permission denies a document when any of its linked
    company rows is outside the user's companies, so a customer listed here but not openable
    (the Al-Baig Traders case) would dead-end at quotation save. Listing and opening now apply
    the same rule. Customers with no company rows stay visible to every company.
    """
    user = user or frappe.session.user
    if user == "Administrator" or "System Manager" in _roles(user):
        return ""
    companies = get_permitted_company_names(user)
    if not companies:
        return "1=0"
    permitted = ", ".join(frappe.db.escape(company) for company in companies)
    return (
        "{alias}.name NOT IN ("
        "SELECT ccl.parent FROM `tabCustomer Credit Limit` ccl "
        "WHERE ccl.parenttype = 'Customer' AND ccl.company NOT IN ({permitted}))"
    ).format(alias=alias, permitted=permitted)


def customer_query(user):
    return _merge_conditions(
        master_tenant_clause("Customer", user),
        customer_company_clause(user, alias="`tabCustomer`"),
    )


def supplier_query(user):
    return master_tenant_clause("Supplier", user)


def item_query(user):
    return master_tenant_clause("Item", user)


def item_bundle_query(user):
    return master_tenant_clause("Item Bundle", user)


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


def company_master_sql_filter(alias, company, user=None):
    """Scope shared master data to the tenant that owns a company.

    This remains correctly scoped for scheduled jobs running as Administrator,
    where a user-based tenant filter would otherwise be unrestricted.
    """
    user = user or frappe.session.user
    if company and frappe.db.has_column("Company", "trader_tenant"):
        tenant = frappe.db.get_value("Company", company, "trader_tenant")
        if tenant:
            return "{0}.trader_tenant = %(company_scope_tenant)s".format(alias), {
                "company_scope_tenant": tenant,
            }

    if is_multitenant_enabled():
        # A company without an assigned tenant must not expose global masters.
        return "1=0", {}
    return tenant_sql_filter(alias, user)


def check_master_document_company(doctype, name, company, ptype="read", user=None):
    """Authorize a shared master both for the user and the requested company.

    DocType permissions and the tenant hook protect direct reads for tenant users.
    The company check is also required for platform users who are allowed to work
    across tenants but are currently operating inside one company's context.
    """
    if doctype not in ("Customer", "Supplier", "Item", "Item Bundle"):
        frappe.throw("Unsupported shared master type.", frappe.PermissionError)
    if not company:
        frappe.throw("An authorized company context is required.", frappe.PermissionError)

    doc = frappe.get_doc(doctype, name)
    doc.check_permission(ptype)

    condition, params = company_master_sql_filter("m", company, user)
    if condition:
        rows = frappe.db.sql(
            "SELECT m.name FROM `tab{0}` m WHERE m.name = %(master_name)s AND ({1})".format(doctype, condition),
            {"master_name": name, **params},
            as_dict=True,
        )
        if not rows:
            frappe.throw(
                "This record is outside the selected company's business account.",
                frappe.PermissionError,
            )

    return doc


def stamp_master_tenant(doc, method=None):
    """before_insert hook — stamp the creating user's tenant on a new master."""
    if frappe.flags.in_install or frappe.flags.in_migrate or getattr(doc.flags, "in_import", False):
        return

    user = frappe.session.user
    tenant = get_user_tenant_name(user)
    if tenant:
        # Never trust a tenant id supplied in a request body.
        doc.trader_tenant = tenant
        return

    if getattr(doc, "trader_tenant", None) and not is_super_admin(user):
        frappe.throw(
            "Only a platform administrator can assign a master record to a tenant.",
            frappe.PermissionError,
        )

    if is_multitenant_enabled() and not is_super_admin(user):
        frappe.throw(
            "Assign this user to a tenant before creating shared master data.",
            frappe.PermissionError,
        )


def validate_master_tenant(doc, method=None):
    """Prevent an update request from transferring a master to another tenant."""
    if getattr(doc, "is_new", lambda: False)():
        return

    stored_tenant = frappe.db.get_value(doc.doctype, doc.name, "trader_tenant")
    if getattr(doc, "trader_tenant", None) != stored_tenant:
        frappe.throw(
            "The tenant owning a master record cannot be changed after creation.",
            frappe.PermissionError,
        )


def validate_item_bundle_tenant(doc, method=None):
    """Keep bundle contents inside the owning tenant's item catalog."""
    validate_master_tenant(doc, method)
    tenant = getattr(doc, "trader_tenant", None)
    if not tenant:
        return

    for row in doc.get("items") or []:
        item_tenant = frappe.db.get_value("Item", row.item_code, "trader_tenant")
        if item_tenant != tenant:
            frappe.throw(
                "Item {0} is not assigned to this business account.".format(row.item_code),
                frappe.PermissionError,
            )


def validate_transaction_master_tenants(doc, method=None):
    """Ensure a company transaction only references masters owned by its tenant."""
    company = getattr(doc, "company", None)
    if not company:
        return

    user = frappe.session.user
    user_tenant = get_user_tenant_name(user)
    multi_tenant = is_multitenant_enabled()
    if not frappe.db.has_column("Company", "trader_tenant"):
        if multi_tenant and user_tenant:
            frappe.throw(
                "Company tenant setup is required before saving this transaction.",
                frappe.PermissionError,
            )
        return

    tenant = frappe.db.get_value("Company", company, "trader_tenant")
    if user_tenant and tenant != user_tenant:
        frappe.throw(
            "This company is outside your business account.",
            frappe.PermissionError,
        )
    if multi_tenant and not tenant and not is_super_admin(user):
        frappe.throw(
            "This company is not assigned to a business account.",
            frappe.PermissionError,
        )
    if not tenant:
        return

    names_by_doctype = {"Customer": set(), "Supplier": set(), "Item": set()}
    for row in [doc] + list(doc.get_all_children() or []):
        customer = getattr(row, "customer", None)
        if customer:
            names_by_doctype["Customer"].add(customer)

        supplier = getattr(row, "supplier", None)
        if supplier:
            names_by_doctype["Supplier"].add(supplier)

        party_type = getattr(row, "party_type", None)
        party = getattr(row, "party", None)
        if party_type in ("Customer", "Supplier") and party:
            names_by_doctype[party_type].add(party)

        item_code = getattr(row, "item_code", None)
        if item_code:
            names_by_doctype["Item"].add(item_code)

    for doctype, names in names_by_doctype.items():
        if not names:
            continue
        records = frappe.get_all(
            doctype,
            filters={"name": ["in", sorted(names)]},
            fields=["name", "trader_tenant"],
        )
        for record in records:
            if record.trader_tenant != tenant:
                frappe.throw(
                    "This transaction references master data outside the company's business account.",
                    frappe.PermissionError,
                )

    warehouse_names = set()
    for row in [doc] + list(doc.get_all_children() or []):
        for fieldname in (
            "warehouse",
            "set_warehouse",
            "source_warehouse",
            "target_warehouse",
            "s_warehouse",
            "t_warehouse",
        ):
            warehouse = getattr(row, fieldname, None)
            if warehouse:
                warehouse_names.add(warehouse)

    if warehouse_names:
        warehouses = frappe.get_all(
            "Warehouse",
            filters={"name": ["in", sorted(warehouse_names)]},
            fields=["name", "company"],
        )
        for warehouse in warehouses:
            if warehouse.company and warehouse.company != company:
                frappe.throw(
                    "This transaction references a warehouse belonging to another company.",
                    frappe.PermissionError,
                )

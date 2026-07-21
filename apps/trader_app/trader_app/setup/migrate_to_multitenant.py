# -*- coding: utf-8 -*-
"""Migrate an existing single/multi-company site to the Trader Tenant model.

Usage:
  bench --site <site> execute trader_app.setup.migrate_to_multitenant.run
  bench --site <site> execute trader_app.setup.migrate_to_multitenant.run --kwargs "{'super_admin_email': 'admin@example.com'}"
"""

from __future__ import unicode_literals

import frappe
from frappe.utils import now_datetime

from trader_app.api.tenant import DEFAULT_MODULE_ROWS, log_tenant_action, sync_tenant_modules_to_company
from trader_app.setup import create_roles


TRADER_ROLE_PREFIXES = ("Trader ",)


def run(super_admin_email=None, dry_run=False):
    """Create tenants for existing companies and assign users."""
    create_roles()

    companies = frappe.get_all("Company", fields=["name", "company_name"], order_by="name asc")
    if not companies:
        print("No companies found — nothing to migrate.")
        return {"tenants": 0, "users_assigned": 0}

    tenant_map = {}
    for company in companies:
        tenant_name = _ensure_tenant_for_company(company, dry_run=dry_run)
        if tenant_name:
            tenant_map[company.name] = tenant_name

    users_assigned = _assign_users_to_tenants(tenant_map, dry_run=dry_run)

    if super_admin_email:
        _ensure_super_admin(super_admin_email, dry_run=dry_run)

    if not dry_run:
        frappe.db.commit()
        print("Migration complete: {0} tenant(s), {1} user assignment(s).".format(len(tenant_map), users_assigned))
    else:
        print("Dry run: would create/update {0} tenant(s), assign {1} user(s).".format(len(tenant_map), users_assigned))

    return {"tenants": len(tenant_map), "users_assigned": users_assigned, "dry_run": dry_run}


def _ensure_tenant_for_company(company_row, dry_run=False):
    company_name = company_row.name
    existing_tenant = frappe.db.get_value("Company", company_name, "trader_tenant")
    if existing_tenant:
        print("  Company '{0}' already linked to tenant '{1}'.".format(company_name, existing_tenant))
        return existing_tenant

    tenant_by_company = frappe.db.get_value("Trader Tenant", {"company": company_name}, "name")
    if tenant_by_company:
        if not dry_run:
            frappe.db.set_value("Company", company_name, "trader_tenant", tenant_by_company, update_modified=False)
        print("  Linked existing tenant '{0}' to company '{1}'.".format(tenant_by_company, company_name))
        return tenant_by_company

    tenant_title = company_row.company_name or company_name
    print("  Creating tenant for company '{0}' ({1})...".format(company_name, tenant_title))

    if dry_run:
        return "DRY-RUN-{0}".format(company_name)

    doc = frappe.get_doc(
        {
            "doctype": "Trader Tenant",
            "tenant_name": tenant_title,
            "status": "Active",
            "company": company_name,
            "subscription_plan": "Starter",
            "billing_status": "Active",
            "max_users": 50,
            "provisioned_on": now_datetime(),
            "enabled_modules": [dict(row) for row in DEFAULT_MODULE_ROWS],
        }
    )

    components_enabled = cint_safe(
        frappe.db.get_value("Company", company_name, "trader_components_enabled")
    )
    opportunity_enabled = cint_safe(
        frappe.db.get_value("Company", company_name, "trader_opportunity_enabled")
    )
    ar_enabled = cint_safe(
        frappe.db.get_value("Company", company_name, "trader_ar_enabled")
    )
    for row in doc.enabled_modules:
        if row.module_key == "components":
            row.enabled = components_enabled
        elif row.module_key == "opportunity":
            row.enabled = opportunity_enabled
        elif row.module_key == "ar":
            row.enabled = ar_enabled

    doc.insert(ignore_permissions=True)
    frappe.db.set_value("Company", company_name, "trader_tenant", doc.name, update_modified=False)
    sync_tenant_modules_to_company(doc.name)
    log_tenant_action(doc.name, "created", {"source": "migrate_to_multitenant", "company": company_name})
    return doc.name


def _assign_users_to_tenants(tenant_map, dry_run=False):
    if not tenant_map:
        return 0

    assigned = 0
    users = frappe.get_all(
        "User",
        filters={"enabled": 1, "name": ["not in", ["Guest", "Administrator"]]},
        fields=["name"],
    )

    single_tenant = len(set(tenant_map.values())) == 1

    for user_row in users:
        user = user_row.name
        if frappe.db.get_value("User", user, "trader_tenant"):
            continue

        if is_platform_only_user(user):
            continue

        tenant = _resolve_user_tenant(user, tenant_map, single_tenant)
        if not tenant or tenant.startswith("DRY-RUN"):
            if tenant:
                assigned += 1
            continue

        if dry_run:
            print("  Would assign user '{0}' → tenant '{1}'.".format(user, tenant))
            assigned += 1
            continue

        frappe.db.set_value("User", user, "trader_tenant", tenant, update_modified=False)
        print("  Assigned user '{0}' → tenant '{1}'.".format(user, tenant))
        assigned += 1

    return assigned


def _resolve_user_tenant(user, tenant_map, single_tenant):
    if single_tenant:
        return next(iter(set(tenant_map.values())))

    default_company = frappe.defaults.get_user_default("Company", user)
    if default_company and default_company in tenant_map:
        return tenant_map[default_company]

    user_companies = frappe.get_all(
        "User Permission",
        filters={"user": user, "allow": "Company"},
        pluck="for_value",
    )
    for company in user_companies:
        if company in tenant_map:
            return tenant_map[company]

    if has_trader_role(user):
        return next(iter(tenant_map.values()), None)

    return None


def _ensure_super_admin(email, dry_run=False):
    if not frappe.db.exists("User", email):
        print("  Super admin user '{0}' not found — skipping.".format(email))
        return

    roles = {row.role for row in frappe.get_all("Has Role", filters={"parent": email}, fields=["role"])}
    if "Trader Super Admin" in roles:
        print("  User '{0}' already has Trader Super Admin.".format(email))
        return

    print("  Granting Trader Super Admin to '{0}'.".format(email))
    if dry_run:
        return

    frappe.get_doc({"doctype": "Has Role", "parent": email, "parenttype": "User", "role": "Trader Super Admin"}).insert(
        ignore_permissions=True
    )


def is_platform_only_user(user):
    roles = frappe.get_roles(user)
    trader_roles = [role for role in roles if role.startswith("Trader ")]
    if "Trader Super Admin" in roles and not frappe.db.get_value("User", user, "trader_tenant"):
        return True
    return not trader_roles and "System Manager" not in roles and user != "Administrator"


def has_trader_role(user):
    return any(role.startswith("Trader ") for role in frappe.get_roles(user))


def cint_safe(value):
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0

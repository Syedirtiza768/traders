# -*- coding: utf-8 -*-
"""Seed a platform Super Admin user and enable multi-tenant mode.

Idempotent — safe to run multiple times.

Usage:
  bench --site <site> execute trader_app.setup.seed_super_admin.run

  bench --site <site> execute trader_app.setup.seed_super_admin.run --kwargs \\
    "{'email': 'admin@example.com', 'password': 'Secret123!', 'migrate_existing': True}"

Environment variables (override kwargs when set):
  TRADER_SUPER_ADMIN_EMAIL
  TRADER_SUPER_ADMIN_PASSWORD
"""

from __future__ import unicode_literals

import json
import os

import frappe
from frappe.utils import cint

from trader_app.setup import create_roles
from trader_app.setup.custom_fields import ensure_custom_fields

# Development defaults only — override via env vars in any shared environment.
DEFAULT_EMAIL = "superadmin@traders.local"
DEFAULT_PASSWORD = "SuperAdmin@2026"
SUPER_ADMIN_ROLE = "Trader Super Admin"


def run(
    email=None,
    password=None,
    enable_multitenant=True,
    migrate_existing=False,
    dry_run=False,
    force_password=False,
):
    """Create Super Admin user, enable multi-tenant flag, optionally migrate companies."""
    create_roles()
    ensure_custom_fields()

    email = (email or os.environ.get("TRADER_SUPER_ADMIN_EMAIL") or DEFAULT_EMAIL).strip().lower()
    password = password or os.environ.get("TRADER_SUPER_ADMIN_PASSWORD") or DEFAULT_PASSWORD

    if not email:
        frappe.throw("Super Admin email is required.")

    multitenant_changed = False
    if enable_multitenant:
        multitenant_changed = _enable_multitenant_flag(dry_run=dry_run)

    user_result = _ensure_super_admin_user(email, password, dry_run=dry_run, force_password=force_password)

    migration_result = None
    if migrate_existing:
        from trader_app.setup.migrate_to_multitenant import run as migrate_run

        migration_result = migrate_run(super_admin_email=email, dry_run=dry_run)

    if not dry_run:
        frappe.db.commit()

    result = {
        "email": email,
        "multitenant_enabled": enable_multitenant,
        "multitenant_flag_changed": multitenant_changed,
        "user": user_result,
        "migration": migration_result,
        "dry_run": dry_run,
    }

    if dry_run:
        print("Dry run complete:", result)
    else:
        print("✅ Super Admin platform seed complete.")
        print("   Email:", email)
        if user_result.get("created"):
            print("   Password: (as provided — store securely; dev default is SuperAdmin@2026)")
        print("   Multi-tenant mode:", "enabled" if enable_multitenant else "unchanged")
        if migrate_existing and migration_result:
            print(
                "   Migrated tenants: {0}, users assigned: {1}".format(
                    migration_result.get("tenants", 0),
                    migration_result.get("users_assigned", 0),
                )
            )

    return result


def _enable_multitenant_flag(dry_run=False):
    """Persist trader_multitenant_enabled=1 in site_config.json."""
    path = frappe.get_site_path("site_config.json")
    with open(path, "r", encoding="utf-8") as handle:
        config = json.load(handle)

    if cint(config.get("trader_multitenant_enabled", 0)) == 1:
        print("  Multi-tenant mode already enabled.")
        return False

    print("  Enabling multi-tenant mode (trader_multitenant_enabled=1)...")
    if dry_run:
        return True

    config["trader_multitenant_enabled"] = 1
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(config, handle, indent=1, sort_keys=True)
        handle.write("\n")

    frappe.conf.trader_multitenant_enabled = 1
    return True


def _ensure_super_admin_user(email, password, dry_run=False, force_password=False):
    """Create or update the platform Super Admin (no trader_tenant assignment)."""
    if frappe.db.exists("User", email):
        return _upgrade_existing_user(email, password, dry_run=dry_run, force_password=force_password)

    print("  Creating Super Admin user '{0}'...".format(email))
    if dry_run:
        return {"created": True, "email": email, "dry_run": True}

    user = frappe.get_doc(
        {
            "doctype": "User",
            "email": email,
            "first_name": "Platform",
            "last_name": "Super Admin",
            "enabled": 1,
            "user_type": "System User",
            "send_welcome_email": 0,
            "new_password": password,
        }
    )
    user.append("roles", {"role": SUPER_ADMIN_ROLE})
    user.insert(ignore_permissions=True)

    # Platform admins must not belong to a business tenant.
    if frappe.db.get_value("User", email, "trader_tenant"):
        frappe.db.set_value("User", email, "trader_tenant", None, update_modified=False)

    return {"created": True, "email": email, "role": SUPER_ADMIN_ROLE}


def _upgrade_existing_user(email, password, dry_run=False, force_password=False):
    roles = {row.role for row in frappe.get_all("Has Role", filters={"parent": email}, fields=["role"])}
    has_role = SUPER_ADMIN_ROLE in roles
    tenant = frappe.db.get_value("User", email, "trader_tenant")

    actions = []
    if not has_role:
        actions.append("grant_role")
    if tenant:
        actions.append("clear_tenant")
    if force_password and password:
        actions.append("update_password")

    if not actions:
        print("  Super Admin user '{0}' already configured.".format(email))
        return {"created": False, "email": email, "role": SUPER_ADMIN_ROLE, "updated": False}

    print("  Updating existing user '{0}' ({1})...".format(email, ", ".join(actions)))
    if dry_run:
        return {"created": False, "email": email, "updated": True, "actions": actions, "dry_run": True}

    if not has_role:
        frappe.get_doc(
            {
                "doctype": "Has Role",
                "parent": email,
                "parenttype": "User",
                "role": SUPER_ADMIN_ROLE,
            }
        ).insert(ignore_permissions=True)

    if tenant:
        frappe.db.set_value("User", email, "trader_tenant", None, update_modified=False)

    if force_password and password:
        user = frappe.get_doc("User", email)
        user.new_password = password
        user.save(ignore_permissions=True)

    frappe.db.set_value("User", email, "enabled", 1, update_modified=False)

    return {
        "created": False,
        "email": email,
        "role": SUPER_ADMIN_ROLE,
        "updated": True,
        "actions": actions,
    }

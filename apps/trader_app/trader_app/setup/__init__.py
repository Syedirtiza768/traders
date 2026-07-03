# -*- coding: utf-8 -*-
"""Trader App — Setup module for installation hooks."""

from __future__ import unicode_literals


def after_install():
    """Run after the app is installed on a site."""
    create_roles()
    from trader_app.setup.custom_fields import ensure_custom_fields

    ensure_custom_fields()
    print("✅ Trader App installed successfully.")


def create_roles():
    """Create custom trader roles.

    Canonical role names (matched to hooks.py fixtures and permissions.ts):
    - Trader Admin
    - Trader Sales Manager
    - Trader Purchase Manager
    - Trader Finance Manager  (formerly 'Trader Accountant' — alias kept in permissions.ts)
    - Trader Inventory Manager  (formerly 'Trader Warehouse Manager' — alias kept in permissions.ts)
    """
    import frappe

    roles = [
        {
            "role_name": "Trader Admin",
            "desk_access": 1,
            "is_custom": 1,
        },
        {
            "role_name": "Trader Sales Manager",
            "desk_access": 1,
            "is_custom": 1,
        },
        {
            "role_name": "Trader Purchase Manager",
            "desk_access": 1,
            "is_custom": 1,
        },
        {
            "role_name": "Trader Finance Manager",
            "desk_access": 1,
            "is_custom": 1,
        },
        {
            "role_name": "Trader Inventory Manager",
            "desk_access": 1,
            "is_custom": 1,
        },
        {
            "role_name": "Trader Super Admin",
            "desk_access": 1,
            "is_custom": 1,
        },
        {
            "role_name": "Trader Staff",
            "desk_access": 1,
            "is_custom": 1,
        },
        {
            "role_name": "Trader Viewer",
            "desk_access": 1,
            "is_custom": 1,
        },
    ]

    for role_data in roles:
        if not frappe.db.exists("Role", role_data["role_name"]):
            role = frappe.new_doc("Role")
            role.update(role_data)
            role.insert(ignore_permissions=True)
            print(f"  Created role: {role_data['role_name']}")

    frappe.db.commit()

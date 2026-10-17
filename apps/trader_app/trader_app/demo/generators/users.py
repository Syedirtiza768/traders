# -*- coding: utf-8 -*-
"""Generator — Users and Permissions.

Creates:
- Demo users with trader-specific roles
- Role permissions
"""

from __future__ import unicode_literals

import secrets

import frappe
from trader_app.demo.seed_engine.base import BaseGenerator


def _new_demo_password():
    """Generate an unshared password for each optional demo account."""
    return secrets.token_urlsafe(32)


class UserGenerator(BaseGenerator):
    name = "Users"
    depends_on = ["Company"]

    def generate(self):
        self._suppress_notifications()
        try:
            for user_cfg in self.config["users"]:
                self._create_user(user_cfg)
            frappe.db.commit()
        finally:
            self._restore_notifications()

    def _create_user(self, user_cfg):
        email = user_cfg["email"]

        if frappe.db.exists("User", email):
            print(f"  ⏭️  User '{email}' already exists, skipping.")
            return

        user = frappe.get_doc(
            {
                "doctype": "User",
                "email": email,
                "first_name": user_cfg["first_name"],
                "last_name": user_cfg["last_name"],
                "enabled": 1,
                "new_password": _new_demo_password(),
                "send_welcome_email": 0,
                "user_type": "System User",
            }
        )

        # Add roles
        for role_name in user_cfg.get("roles", []):
            if frappe.db.exists("Role", role_name):
                user.append("roles", {"role": role_name})

        user.insert(ignore_permissions=True)
        self.created_records.append(("User", email))
        print(f"  ✅ Created user: {user_cfg['first_name']} {user_cfg['last_name']} ({email})")

    def validate(self):
        for user_cfg in self.config["users"]:
            assert frappe.db.exists("User", user_cfg["email"]), f"User {user_cfg['email']} not found"
        return True

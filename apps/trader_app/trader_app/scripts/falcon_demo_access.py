# -*- coding: utf-8 -*-
"""Falcon demo - access fixtures for the server-level permission tests. DEMO ONLY. Fictional data.

ensure_access_users(): adds a second sales executive (assigned-record test) and a leaver account that is
disabled (revocation test). Both are created the way the other staff are created: Traders roles and a company
User Permission. Idempotent.

    bench --site traders-demo.localhost execute trader_app.scripts.falcon_demo_access.ensure_access_users
"""

from __future__ import unicode_literals

import frappe

from trader_app.scripts import falcon_demo_spec as S

ACCESS_USERS = {
    "sales2": {"email": "sales2@falcon-demo.test", "name": "Usman Tariq", "enabled": 1,
               "roles": ["Trader Staff", "Sales User"]},
    "leaver": {"email": "leaver@falcon-demo.test", "name": "Kamran Mirza", "enabled": 0,
               "roles": ["Trader Staff", "Sales User"]},
}


def ensure_access_users():
    out = {}
    for key, u in ACCESS_USERS.items():
        if frappe.db.exists("User", u["email"]):
            doc = frappe.get_doc("User", u["email"])
            doc.enabled = u["enabled"]
            doc.save(ignore_permissions=True)
            out[key] = "exists; enabled={0}".format(u["enabled"])
            continue
        first, _, last = u["name"].partition(" ")
        doc = frappe.get_doc({"doctype": "User", "email": u["email"], "first_name": first, "last_name": last,
                              "enabled": u["enabled"], "send_welcome_email": 0, "user_type": "System User",
                              "new_password": S.DEMO_PASSWORD})
        for role in u["roles"]:
            if frappe.db.exists("Role", role):
                doc.append("roles", {"role": role})
        doc.insert(ignore_permissions=True)
        if not frappe.db.exists("User Permission", {"user": u["email"], "allow": "Company", "for_value": S.COMPANY}):
            frappe.get_doc({"doctype": "User Permission", "user": u["email"], "allow": "Company",
                            "for_value": S.COMPANY}).insert(ignore_permissions=True)
        out[key] = "created; enabled={0}".format(u["enabled"])
    frappe.db.commit()
    return out

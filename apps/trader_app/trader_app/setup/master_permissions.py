# -*- coding: utf-8 -*-
"""Ensure Trader roles can manage ERPNext master doctypes used by the SPA.

ERPNext ships Customer/Supplier/Item permissions for Sales User / Purchase User /
Stock User only. Trader tenants often assign solely Trader* roles (e.g. Electrence
Trader Admin), so create/update fails with PermissionError even though the SPA
exposes those screens.

Permissions are stored as Custom DocPerm so ERPNext DocType JSON resets do not
wipe them permanently — re-run ``ensure_master_doc_permissions`` after migrate.
"""

from __future__ import unicode_literals

import frappe


# role -> (create, write, read, delete)
_MASTER_PERMS = {
    "Customer": {
        "Trader Admin": (1, 1, 1, 1),
        "Trader Sales Manager": (1, 1, 1, 0),
        "Trader Staff": (1, 1, 1, 0),
        "Trader Finance Manager": (0, 0, 1, 0),
        "Trader Viewer": (0, 0, 1, 0),
    },
    "Supplier": {
        "Trader Admin": (1, 1, 1, 1),
        "Trader Purchase Manager": (1, 1, 1, 0),
        "Trader Staff": (1, 1, 1, 0),
        "Trader Finance Manager": (0, 0, 1, 0),
        "Trader Viewer": (0, 0, 1, 0),
    },
    "Item": {
        "Trader Admin": (1, 1, 1, 1),
        "Trader Inventory Manager": (1, 1, 1, 0),
        "Trader Sales Manager": (0, 0, 1, 0),
        "Trader Purchase Manager": (0, 0, 1, 0),
        "Trader Staff": (0, 0, 1, 0),
        "Trader Viewer": (0, 0, 1, 0),
    },
}


def ensure_master_doc_permissions():
    """Idempotently add Custom DocPerm rows for Trader roles on masters."""
    created = 0
    updated = 0

    for doctype, role_map in _MASTER_PERMS.items():
        for role, (create, write, read, delete) in role_map.items():
            if not frappe.db.exists("Role", role):
                continue
            existing = frappe.db.get_value(
                "Custom DocPerm",
                {"parent": doctype, "role": role, "permlevel": 0},
                "name",
            )
            if existing:
                frappe.db.set_value(
                    "Custom DocPerm",
                    existing,
                    {
                        "create": create,
                        "write": write,
                        "read": read,
                        "delete": delete,
                        "select": 1 if read else 0,
                        "export": 1 if read else 0,
                    },
                    update_modified=False,
                )
                updated += 1
                continue

            doc = frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": doctype,
                "parenttype": "DocType",
                "parentfield": "permissions",
                "role": role,
                "permlevel": 0,
                "create": create,
                "write": write,
                "read": read,
                "delete": delete,
                "select": 1 if read else 0,
                "export": 1 if read else 0,
                "print": 1 if read else 0,
                "email": 1 if read else 0,
                "report": 1 if read else 0,
                "share": 0,
            })
            doc.insert(ignore_permissions=True)
            created += 1

    frappe.clear_cache()
    frappe.db.commit()
    return {"created": created, "updated": updated}

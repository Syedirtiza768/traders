# -*- coding: utf-8 -*-
"""Trader App settings endpoints for the React UI."""

from __future__ import unicode_literals

import json

import frappe
from frappe.utils import cint


def _default_company():
    return (
        frappe.defaults.get_user_default("Company")
        or frappe.db.get_single_value("Global Defaults", "default_company")
        or frappe.get_all("Company", limit=1, pluck="name")[0]
    )


def _cache_key():
    return "trader_ui_settings::{0}".format(frappe.session.user)


def _read_user_ui_settings():
    cached = frappe.cache().get_value(_cache_key())
    if not cached:
        return {}

    if isinstance(cached, bytes):
        cached = cached.decode("utf-8")

    return json.loads(cached)


def _payload():
    company_name = _default_company()
    company_doc = frappe.get_doc("Company", company_name)
    ui_settings = _read_user_ui_settings()

    return {
        "company": {
            "name": company_doc.name,
            "abbr": company_doc.abbr,
            "country": company_doc.country,
            "default_currency": company_doc.default_currency,
            "domain": company_doc.domain,
            "chart_of_accounts": company_doc.chart_of_accounts,
        },
        "ui": {
            "language": ui_settings.get("language") or "en",
            "time_zone": ui_settings.get("time_zone") or frappe.db.get_single_value("System Settings", "time_zone") or "Asia/Karachi",
            "date_format": ui_settings.get("date_format") or frappe.db.get_single_value("System Settings", "date_format") or "dd-mm-yyyy",
            "number_format": ui_settings.get("number_format") or frappe.db.get_single_value("System Settings", "number_format") or "#,###.##",
            "float_precision": cint(ui_settings.get("float_precision") or frappe.db.get_single_value("System Settings", "float_precision") or 3),
            "session_expiry": cint(ui_settings.get("session_expiry") or frappe.db.get_single_value("System Settings", "session_expiry") or 240),
            "enable_two_factor": cint(ui_settings.get("enable_two_factor") or 0),
            "dark_mode": cint(ui_settings.get("dark_mode") or 0),
            "compact_tables": cint(ui_settings.get("compact_tables") or 0),
            "email_notifications": cint(ui_settings.get("email_notifications") or 1),
        },
    }


@frappe.whitelist()
def get_settings():
    return _payload()


@frappe.whitelist()
def save_settings(data=None):
    if isinstance(data, str):
        data = json.loads(data)

    data = data or {}
    ui = data.get("ui") or {}

    cleaned = {
        "language": ui.get("language") or "en",
        "time_zone": ui.get("time_zone") or "Asia/Karachi",
        "date_format": ui.get("date_format") or "dd-mm-yyyy",
        "number_format": ui.get("number_format") or "#,###.##",
        "float_precision": cint(ui.get("float_precision") or 3),
        "session_expiry": cint(ui.get("session_expiry") or 240),
        "enable_two_factor": cint(ui.get("enable_two_factor") or 0),
        "dark_mode": cint(ui.get("dark_mode") or 0),
        "compact_tables": cint(ui.get("compact_tables") or 0),
        "email_notifications": cint(ui.get("email_notifications") or 1),
    }

    frappe.cache().set_value(_cache_key(), json.dumps(cleaned))
    frappe.db.set_single_value("System Settings", "time_zone", cleaned["time_zone"])
    frappe.db.set_single_value("System Settings", "date_format", cleaned["date_format"])
    frappe.db.set_single_value("System Settings", "number_format", cleaned["number_format"])
    frappe.db.set_single_value("System Settings", "float_precision", cleaned["float_precision"])
    frappe.db.set_single_value("System Settings", "session_expiry", cleaned["session_expiry"])
    frappe.db.commit()

    return {
        "ok": True,
        "message": "Settings saved successfully.",
        "settings": _payload(),
    }


@frappe.whitelist(allow_guest=False)
def get_current_user_roles():
    """Return the Trader-App roles assigned to the currently logged-in user.

    This replaces direct calls to frappe.client.get_list("Has Role", ...)
    which is blocked with a 403 PermissionError for non-Administrator users
    in Frappe v15.  Using a whitelisted method with frappe.db.sql and
    frappe.session.user bypasses that restriction safely because the user
    can only ever query their own session.

    Special cases:
    - Administrator / System Manager users → return ['Trader Admin'] so they
      receive full capabilities in the frontend permission system.
    - Role aliases (e.g. 'Trader Warehouse Manager' → 'Trader Inventory Manager',
      'Trader Accountant' → 'Trader Finance Manager') are normalised here so
      the frontend permissions map stays consistent.
    """
    user = frappe.session.user
    if not user or user == "Guest":
        return []

    rows = frappe.db.sql(
        """
        SELECT role
        FROM `tabHas Role`
        WHERE parent = %s
          AND parenttype = 'User'
        ORDER BY role
        """,
        (user,),
        as_dict=True,
    )

    all_roles = {r.role for r in rows}

    # System-level admins → full access
    if "Administrator" in all_roles or "System Manager" in all_roles or user == "Administrator":
        return ["Trader Admin"]

    # Normalise role aliases to the canonical names expected by the frontend
    _ALIAS_MAP = {
        "Trader Accountant": "Trader Finance Manager",
        "Trader Warehouse Manager": "Trader Inventory Manager",
    }

    trader_roles = []
    for role in sorted(all_roles):
        if role.startswith("Trader "):
            canonical = _ALIAS_MAP.get(role, role)
            if canonical not in trader_roles:
                trader_roles.append(canonical)

    return trader_roles

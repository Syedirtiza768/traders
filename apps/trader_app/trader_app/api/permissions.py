# -*- coding: utf-8 -*-
"""Trader App — Permission Queries.

Custom permission query conditions and has_permission hooks
for Trader-specific role-based access control.
"""

from __future__ import unicode_literals

import frappe


def sales_invoice_query(user):
    """Permission query for Sales Invoice — restrict by role."""
    if "Trader Admin" in frappe.get_roles(user) or "System Manager" in frappe.get_roles(user):
        return ""  # full access

    if "Trader Sales Manager" in frappe.get_roles(user):
        return ""  # sales managers see all

    # Regular users see only their own
    return f"`tabSales Invoice`.owner = '{frappe.db.escape(user)}'"


def purchase_invoice_query(user):
    """Permission query for Purchase Invoice — restrict by role."""
    if "Trader Admin" in frappe.get_roles(user) or "System Manager" in frappe.get_roles(user):
        return ""

    if "Trader Purchase Manager" in frappe.get_roles(user):
        return ""

    return f"`tabPurchase Invoice`.owner = '{frappe.db.escape(user)}'"


def has_sales_invoice_permission(doc, ptype, user):
    """Has-permission hook for Sales Invoice."""
    roles = frappe.get_roles(user)
    if "Trader Admin" in roles or "System Manager" in roles or "Trader Sales Manager" in roles:
        return True
    if doc.owner == user:
        return True
    return False


def has_purchase_invoice_permission(doc, ptype, user):
    """Has-permission hook for Purchase Invoice."""
    roles = frappe.get_roles(user)
    if "Trader Admin" in roles or "System Manager" in roles or "Trader Purchase Manager" in roles:
        return True
    if doc.owner == user:
        return True
    return False

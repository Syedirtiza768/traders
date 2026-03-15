# -*- coding: utf-8 -*-
"""Trader App — Inventory API endpoints."""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import flt


@frappe.whitelist()
def get_stock_summary(warehouse=None):
    """Return stock summary grouped by item group."""
    company = _get_default_company()

    filters = "WHERE w.company = %s"
    params = [company]

    if warehouse:
        filters += " AND b.warehouse = %s"
        params.append(warehouse)

    data = frappe.db.sql("""
        SELECT
            i.item_group,
            COUNT(DISTINCT b.item_code) as item_count,
            SUM(b.actual_qty) as total_qty,
            SUM(b.stock_value) as total_value
        FROM `tabBin` b
        INNER JOIN `tabItem` i ON i.name = b.item_code
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        {filters}
        GROUP BY i.item_group
        ORDER BY total_value DESC
    """.format(filters=filters), params, as_dict=True)

    return data


@frappe.whitelist()
def get_low_stock_items(limit=50):
    """Return items with low stock (below reorder level or below 10 qty)."""
    company = _get_default_company()

    data = frappe.db.sql("""
        SELECT
            b.item_code,
            i.item_name,
            i.item_group,
            b.warehouse,
            b.actual_qty,
            b.stock_value,
            COALESCE(ir.warehouse_reorder_level, 10) as reorder_level
        FROM `tabBin` b
        INNER JOIN `tabItem` i ON i.name = b.item_code
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        LEFT JOIN `tabItem Reorder` ir ON ir.parent = i.name AND ir.warehouse = b.warehouse
        WHERE w.company = %s
            AND b.actual_qty > 0
            AND b.actual_qty < COALESCE(ir.warehouse_reorder_level, 10)
        ORDER BY b.actual_qty ASC
        LIMIT %s
    """, (company, int(limit)), as_dict=True)

    return data


@frappe.whitelist()
def get_warehouse_stock(warehouse):
    """Return all stock for a specific warehouse."""
    data = frappe.db.sql("""
        SELECT
            b.item_code,
            i.item_name,
            i.item_group,
            b.actual_qty,
            b.stock_value,
            b.valuation_rate
        FROM `tabBin` b
        INNER JOIN `tabItem` i ON i.name = b.item_code
        WHERE b.warehouse = %s
            AND b.actual_qty > 0
        ORDER BY i.item_group, i.item_name
    """, (warehouse,), as_dict=True)

    return data


@frappe.whitelist()
def get_stock_movement(item_code=None, warehouse=None, from_date=None, to_date=None):
    """Return stock movement history."""
    company = _get_default_company()

    filters = "WHERE sle.company = %s AND sle.is_cancelled = 0"
    params = [company]

    if item_code:
        filters += " AND sle.item_code = %s"
        params.append(item_code)

    if warehouse:
        filters += " AND sle.warehouse = %s"
        params.append(warehouse)

    if from_date:
        filters += " AND sle.posting_date >= %s"
        params.append(from_date)

    if to_date:
        filters += " AND sle.posting_date <= %s"
        params.append(to_date)

    data = frappe.db.sql("""
        SELECT
            sle.posting_date,
            sle.item_code,
            i.item_name,
            sle.warehouse,
            sle.actual_qty,
            sle.qty_after_transaction,
            sle.valuation_rate,
            sle.stock_value,
            sle.voucher_type,
            sle.voucher_no
        FROM `tabStock Ledger Entry` sle
        INNER JOIN `tabItem` i ON i.name = sle.item_code
        {filters}
        ORDER BY sle.posting_date DESC, sle.posting_time DESC
        LIMIT 200
    """.format(filters=filters), params, as_dict=True)

    return data


def _get_default_company():
    company = frappe.defaults.get_defaults().get("company")
    if not company:
        company = frappe.db.get_value("Company", filters={}, fieldname="name", order_by="creation ASC")
    return company

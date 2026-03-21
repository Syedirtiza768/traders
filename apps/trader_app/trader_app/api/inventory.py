# -*- coding: utf-8 -*-
"""Trader App — Inventory API.

Whitelisted endpoints for:
- Stock balance / stock ledger
- Stock Entry operations
- Item management
- Warehouse operations
- Reorder level logic
"""

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, flt, cint


# ────────────────────────────────────────────────────────────────
# 1.  STOCK BALANCE
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_stock_balance(company=None, warehouse=None, item_group=None,
                      page=1, page_size=20, search=None):
    """Paginated stock balance — item-level view."""
    company = company or _default_company()
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    conditions = ["w.company = %(company)s"]
    params = {"company": company}

    if warehouse:
        conditions.append("b.warehouse = %(warehouse)s")
        params["warehouse"] = warehouse
    if item_group:
        conditions.append("i.item_group = %(item_group)s")
        params["item_group"] = item_group
    if search:
        conditions.append("(b.item_code LIKE %(search)s OR i.item_name LIKE %(search)s)")
        params["search"] = f"%{search}%"

    where = " AND ".join(conditions)

    total = frappe.db.sql(f"""
        SELECT COUNT(DISTINCT b.item_code)
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        INNER JOIN `tabItem` i ON i.name = b.item_code
        WHERE {where}
    """, params)[0][0]

    rows = frappe.db.sql(f"""
        SELECT b.item_code, i.item_name, i.item_group, i.stock_uom,
               SUM(b.actual_qty) AS actual_qty,
               SUM(b.stock_value) AS stock_value,
               GROUP_CONCAT(DISTINCT b.warehouse) AS warehouses
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        INNER JOIN `tabItem` i ON i.name = b.item_code
        WHERE {where}
        GROUP BY b.item_code
        ORDER BY i.item_name
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 2.  STOCK LEDGER (transaction-level)
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_stock_ledger(company=None, item_code=None, warehouse=None,
                     from_date=None, to_date=None,
                     page=1, page_size=20):
    """Paginated Stock Ledger Entries."""
    company = company or _default_company()
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    conditions = ["sle.company = %(company)s"]
    params = {"company": company}

    if item_code:
        conditions.append("sle.item_code = %(item_code)s")
        params["item_code"] = item_code
    if warehouse:
        conditions.append("sle.warehouse = %(warehouse)s")
        params["warehouse"] = warehouse
    if from_date:
        conditions.append("sle.posting_date >= %(from_date)s")
        params["from_date"] = from_date
    if to_date:
        conditions.append("sle.posting_date <= %(to_date)s")
        params["to_date"] = to_date

    where = " AND ".join(conditions)

    total = frappe.db.sql(
        f"SELECT COUNT(*) FROM `tabStock Ledger Entry` sle WHERE {where}", params
    )[0][0]

    rows = frappe.db.sql(f"""
        SELECT sle.name, sle.posting_date, sle.posting_time,
               sle.item_code, sle.warehouse,
               sle.actual_qty, sle.qty_after_transaction,
               sle.incoming_rate, sle.stock_value,
               sle.voucher_type, sle.voucher_no
        FROM `tabStock Ledger Entry` sle
        WHERE {where}
        ORDER BY sle.posting_date DESC, sle.posting_time DESC
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 3.  ITEMS
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_items(item_group=None, page=1, page_size=20, search=None):
    """Paginated item list."""
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    conditions = ["i.disabled = 0"]
    params = {}

    if item_group:
        conditions.append("i.item_group = %(item_group)s")
        params["item_group"] = item_group
    if search:
        conditions.append("(i.name LIKE %(search)s OR i.item_name LIKE %(search)s)")
        params["search"] = f"%{search}%"

    where = " AND ".join(conditions)

    total = frappe.db.sql(
        f"SELECT COUNT(*) FROM `tabItem` i WHERE {where}", params
    )[0][0]

    rows = frappe.db.sql(f"""
        SELECT i.name AS item_code, i.item_name, i.item_group, i.stock_uom,
               i.is_stock_item, i.has_variants,
               COALESCE(ip_sell.price_list_rate, 0) AS selling_price,
               COALESCE(ip_buy.price_list_rate, 0) AS buying_price
        FROM `tabItem` i
        LEFT JOIN `tabItem Price` ip_sell
            ON ip_sell.item_code = i.name AND ip_sell.price_list = 'Standard Selling'
        LEFT JOIN `tabItem Price` ip_buy
            ON ip_buy.item_code = i.name AND ip_buy.price_list = 'Standard Buying'
        WHERE {where}
        ORDER BY i.item_name
        LIMIT %(page_size)s OFFSET %(offset)s
    """, {**params, "page_size": page_size, "offset": offset}, as_dict=True)

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 4.  WAREHOUSES
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_warehouses(company=None):
    """List warehouses for the company with stock summary."""
    company = company or _default_company()

    rows = frappe.db.sql("""
        SELECT w.name AS warehouse, w.warehouse_name, w.warehouse_type,
               COUNT(DISTINCT b.item_code) AS item_count,
               COALESCE(SUM(b.actual_qty), 0) AS total_qty,
               COALESCE(SUM(b.stock_value), 0) AS stock_value
        FROM `tabWarehouse` w
        LEFT JOIN `tabBin` b ON b.warehouse = w.name
        WHERE w.company = %s AND w.is_group = 0
        GROUP BY w.name
        ORDER BY w.name
    """, (company,), as_dict=True)

    return rows


# ────────────────────────────────────────────────────────────────
# 5.  INVENTORY SUMMARY (for dashboard)
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_inventory_summary(company=None):
    """Stock summary by item group."""
    company = company or _default_company()

    rows = frappe.db.sql("""
        SELECT i.item_group,
               COUNT(DISTINCT b.item_code) AS item_count,
               COALESCE(SUM(b.actual_qty), 0) AS total_qty,
               COALESCE(SUM(b.stock_value), 0) AS stock_value
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        INNER JOIN `tabItem` i ON i.name = b.item_code
        WHERE w.company = %s
        GROUP BY i.item_group
        ORDER BY stock_value DESC
    """, (company,), as_dict=True)

    total_value = flt(frappe.db.sql("""
        SELECT COALESCE(SUM(b.stock_value), 0)
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        WHERE w.company = %s
    """, (company,))[0][0])

    total_items = cint(frappe.db.sql("""
        SELECT COUNT(DISTINCT b.item_code)
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        WHERE w.company = %s
    """, (company,))[0][0])

    low_stock = cint(frappe.db.sql("""
        SELECT COUNT(DISTINCT b.item_code)
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        WHERE w.company = %s AND b.actual_qty > 0 AND b.actual_qty < 10
    """, (company,))[0][0])

    return {
        "by_group": rows,
        "total_value": total_value,
        "total_items": total_items,
        "low_stock_count": low_stock,
    }


# ────────────────────────────────────────────────────────────────
# 6.  LOW STOCK ITEMS
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_low_stock_items(company=None, threshold=10, page=1, page_size=20):
    """Items with stock below threshold."""
    company = company or _default_company()
    threshold = cint(threshold) or 10
    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    total = frappe.db.sql("""
        SELECT COUNT(DISTINCT b.item_code)
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        WHERE w.company = %s AND b.actual_qty > 0 AND b.actual_qty < %s
    """, (company, threshold))[0][0]

    rows = frappe.db.sql("""
        SELECT b.item_code, i.item_name, i.item_group,
               SUM(b.actual_qty) AS actual_qty,
               b.warehouse
        FROM `tabBin` b
        INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
        INNER JOIN `tabItem` i ON i.name = b.item_code
        WHERE w.company = %s AND b.actual_qty > 0 AND b.actual_qty < %s
        GROUP BY b.item_code
        ORDER BY actual_qty ASC
        LIMIT %s OFFSET %s
    """, (company, threshold, page_size, offset), as_dict=True)

    return {"data": rows, "total": cint(total), "page": page, "page_size": page_size}


# ────────────────────────────────────────────────────────────────
# 7.  ITEM GROUPS
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_item_groups():
    """List all item groups."""
    return frappe.get_all("Item Group", filters={"is_group": 0}, pluck="name", order_by="name")


# ────────────────────────────────────────────────────────────────
# 8.  ITEM DETAIL & CREATE
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_item_detail(item_code):
    """Full Item record with current stock totals."""
    doc = frappe.get_doc("Item", item_code)
    doc.check_permission("read")
    company = _default_company()

    stock_qty = flt(frappe.db.sql(
        "SELECT COALESCE(SUM(actual_qty), 0) FROM `tabBin` WHERE item_code = %s",
        (item_code,)
    )[0][0])

    stock_value = flt(frappe.db.sql(
        "SELECT COALESCE(SUM(stock_value), 0) FROM `tabBin` WHERE item_code = %s",
        (item_code,)
    )[0][0])

    selling_price = flt(frappe.db.get_value(
        "Item Price",
        {"item_code": item_code, "price_list": "Standard Selling"},
        "price_list_rate"
    ) or 0)

    buying_price = flt(frappe.db.get_value(
        "Item Price",
        {"item_code": item_code, "price_list": "Standard Buying"},
        "price_list_rate"
    ) or 0)

    result = doc.as_dict()
    result["stock_qty"] = stock_qty
    result["stock_value"] = stock_value
    result["selling_price"] = selling_price
    result["buying_price"] = buying_price
    result["company"] = company
    return result


@frappe.whitelist()
def create_item(item_code, item_name=None, item_group=None, stock_uom=None, is_stock_item=1):
    """Create a new Item record."""
    doc = frappe.new_doc("Item")
    doc.item_code = item_code
    doc.item_name = item_name or item_code
    doc.item_group = item_group or frappe.db.get_single_value("Stock Settings", "item_group") or "All Item Groups"
    doc.stock_uom = stock_uom or "Nos"
    doc.is_stock_item = cint(is_stock_item)
    doc.insert(ignore_permissions=False)
    frappe.db.commit()
    return {"item_code": doc.item_code, "item_name": doc.item_name, "status": "Created"}


@frappe.whitelist()
def create_purchase_receipt(items, posting_date=None, company=None):
    """Create a Stock Entry with purpose Material Receipt (goods into warehouse)."""
    import json
    if isinstance(items, str):
        items = json.loads(items)

    company = company or _default_company()
    abbr = frappe.get_cached_value("Company", company, "abbr")

    se = frappe.new_doc("Stock Entry")
    se.company = company
    se.purpose = "Material Receipt"
    se.stock_entry_type = "Material Receipt"
    se.posting_date = posting_date or nowdate()

    for item in items:
        se.append("items", {
            "item_code": item.get("item_code"),
            "qty": flt(item.get("qty", 1)),
            "basic_rate": flt(item.get("rate", 0)),
            "t_warehouse": item.get("warehouse") or f"Main Warehouse - {abbr}",
        })

    se.insert(ignore_permissions=False)
    return {"name": se.name, "status": "Draft"}


@frappe.whitelist()
def create_sales_dispatch(items, posting_date=None, company=None):
    """Create a Stock Entry with purpose Material Issue (goods out of warehouse)."""
    import json
    if isinstance(items, str):
        items = json.loads(items)

    company = company or _default_company()
    abbr = frappe.get_cached_value("Company", company, "abbr")

    se = frappe.new_doc("Stock Entry")
    se.company = company
    se.purpose = "Material Issue"
    se.stock_entry_type = "Material Issue"
    se.posting_date = posting_date or nowdate()

    for item in items:
        se.append("items", {
            "item_code": item.get("item_code"),
            "qty": flt(item.get("qty", 1)),
            "s_warehouse": item.get("warehouse") or f"Main Warehouse - {abbr}",
        })

    se.insert(ignore_permissions=False)
    return {"name": se.name, "status": "Draft"}


# ────────────────────────────────────────────────────────────────
# 9.  STOCK ENTRY (create)
# ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def create_stock_entry(purpose, items, company=None, posting_date=None):
    """Create a Stock Entry (Material Receipt, Material Issue, Transfer)."""
    import json
    if isinstance(items, str):
        items = json.loads(items)

    company = company or _default_company()
    abbr = frappe.get_cached_value("Company", company, "abbr")

    se = frappe.new_doc("Stock Entry")
    se.company = company
    se.purpose = purpose
    se.stock_entry_type = purpose
    se.posting_date = posting_date or nowdate()

    for item in items:
        row = {
            "item_code": item.get("item_code"),
            "qty": flt(item.get("qty", 1)),
        }
        if purpose == "Material Receipt":
            row["t_warehouse"] = item.get("warehouse") or f"Main Warehouse - {abbr}"
            row["basic_rate"] = flt(item.get("rate", 0))
        elif purpose == "Material Issue":
            row["s_warehouse"] = item.get("warehouse") or f"Main Warehouse - {abbr}"
        elif purpose == "Material Transfer":
            row["s_warehouse"] = item.get("source_warehouse") or f"Main Warehouse - {abbr}"
            row["t_warehouse"] = item.get("target_warehouse") or f"Secondary Warehouse - {abbr}"

        se.append("items", row)

    se.insert(ignore_permissions=False)
    return {"name": se.name, "status": "Draft"}


# ────────────────────────────────────────────────────────────────
# 9.  DOCTYPE EVENT HOOKS
# ────────────────────────────────────────────────────────────────

def validate_stock_entry(doc, method):
    """Runs on Stock Entry validate — custom trader checks."""
    for item in doc.items:
        if flt(item.qty) <= 0:
            frappe.throw(_("Row {0}: Quantity must be greater than zero.").format(item.idx))


# ────────────────────────────────────────────────────────────────
# 10. REORDER LEVELS (scheduler)
# ────────────────────────────────────────────────────────────────

def update_reorder_levels():
    """Daily job: flag items that dropped below reorder level."""
    for company in frappe.get_all("Company", pluck="name"):
        low_items = frappe.db.sql("""
            SELECT b.item_code, SUM(b.actual_qty) AS qty
            FROM `tabBin` b
            INNER JOIN `tabWarehouse` w ON w.name = b.warehouse
            WHERE w.company = %s
            GROUP BY b.item_code
            HAVING qty > 0 AND qty < 10
        """, (company,), as_dict=True)

        if low_items:
            frappe.log_error(
                message=f"Low stock for {len(low_items)} items in {company}",
                title="Low Stock Alert",
            )


# ────────────────────────────────────────────────────────────────
#    HELPERS
# ────────────────────────────────────────────────────────────────

def _default_company():
    return (
        frappe.defaults.get_user_default("Company")
        or frappe.db.get_single_value("Global Defaults", "default_company")
        or frappe.get_all("Company", limit=1, pluck="name")[0]
    )
